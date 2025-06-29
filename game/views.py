from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from django.db.models import Q
from rest_framework.generics import ListAPIView
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import random
import base64
from django.core.files.uploadedfile import File 
from django.utils import timezone
from django.db.models import F 

from .models import Character, Race, Class, CharacterTemplate
from lobbies.models import Lobby, LobbyPlayer
from .serializers import CharacterTemplateSerializer, RaceSerializer, ClassSerializer, CharacterSerializer
from creature.models import Creature
from items.models     import Item
from django.db import transaction

# Global battle state (demo amaçlı; production için merkezi store (ör. Redis) kullanın)
BATTLE_STATE = {}

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return
    



# CharacterViewSet: Level up işlemleri vb.
class CharacterViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [IsAuthenticated]
    serializer_class       = CharacterSerializer

    def get_queryset(self):
        lobby_pk = self.kwargs.get('lobby_pk')

        if lobby_pk is not None:
            # Nested route: /api/lobbies/<lobby_pk>/characters/
            return Character.objects.filter(lobby_id=lobby_pk)

        # Aksi halde /api/characters/
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Character.objects.all()
        return Character.objects.filter(player_id=self.request.user.id)

    def perform_create(self, serializer):
        # Yeni karakter oluşturulurken player_id ve lobby_id set et
        lobby_pk = self.kwargs.get('lobby_pk') or self.request.data.get('lobby_id')
        lobby    = get_object_or_404(Lobby, lobby_id=lobby_pk)
        serializer.save(
            player_id=self.request.user.id,
            lobby_id = lobby.lobby_id
        )

    @action(detail=True, methods=['get'], url_path='level-up-info')
    def level_up_info(self, request, pk=None):
        character = self.get_object()
        if not character.can_level_up:
            return Response(
                {"error": "Level up için yeterli XP yok."},
                status=status.HTTP_400_BAD_REQUEST
            )
        info = character.level_up_info()
        return Response({
            "message": "Level up bilgileri hazır.",
            "current_level": character.level,
            "xp": character.xp,
            "xp_threshold": character.xp_for_next_level(),
            "level_up_info": info
        })

    @action(detail=True, methods=['post'], url_path='confirm-level-up')
    def confirm_level_up(self, request, pk=None):
        with transaction.atomic():
            character = self.get_object().select_for_update()
        
        if not character.can_level_up:
            return Response(
                {"error": "Level up için yeterli XP yok."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            info = character.confirm_level_up()
            return Response({
                "message": "Level up tamamlandı.",
                "new_level": character.level,
                "level_up_info": info,
                "xp_threshold": character.xp_for_next_level()
            })
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='spawn-monster')
    def spawn_monster(self, request):
        """
        Grid’e sürüklenen bir Creature (monster) için geçici Character yaratır.
        İstek gövdesi: { monster_id: int, lobby_id: int, position?: { x: int, y: int } }
        """
        monster = get_object_or_404(Creature, pk=request.data.get('monster_id'))
        lobby_id = request.data.get('lobby_id')

        # 1) Geçici Character oluştur
        char = Character.objects.create(
            player_id     = request.user.id,
            lobby_id      = lobby_id,
            name          = monster.name,
            race          = None,
            character_class = None,
            level         = monster.challenge_rating or 1,
            hp            = monster.hit_points,
            max_hp        = monster.hit_points,
            ac            = monster.armor_class,
            strength      = getattr(monster, 'strength', 10),
            dexterity     = getattr(monster, 'dexterity', 10),
            constitution  = getattr(monster, 'constitution', 10),
            intelligence  = getattr(monster, 'intelligence', 10),
            wisdom        = getattr(monster, 'wisdom', 10),
            charisma      = getattr(monster, 'charisma', 10),
            gold          = 0,
            inventory     = [],
            main_hand     = None,
            off_hand      = None,
            is_temporary  = True,
            melee_dice    = monster.melee_attack_dice,
            ranged_dice   = monster.ranged_attack_dice,
            icon          = monster.icon 
        )

        # 2) Opsiyonel: pozisyonu da kaydet
        pos = request.data.get('position')
        if pos and hasattr(char, 'x') and hasattr(char, 'y'):
            char.x = pos['x']
            char.y = pos['y']
            char.save(update_fields=['x', 'y'])

        # 3) Serializer ile yanıt dön
        serializer = self.get_serializer(char)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='cleanup-temp')
    def cleanup_temp(self, request):
        """
        Savaş bittikten sonra çağrılır: verilen lobby_id için
        is_temporary=True ve hp<=0 olan tüm Character kayıtlarını siler.
        İstek gövdesi: { lobby_id: int }
        """
        lobby_id = request.data.get('lobby_id')
        if lobby_id is None:
            return Response(
                {"error": "lobby_id gereklidir."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Sadece is_temporary ve HP'si 0 veya daha az olanları sil
        deleted_count, _ = Character.objects.filter(
            lobby_id=lobby_id,
            is_temporary=True,
            hp__lte=0
        ).delete()

        return Response(
            {"deleted_temp": deleted_count},
            status=status.HTTP_200_OK
        )

class InitiateCombatView(APIView):
    """
    GM savaşı başlattığında, grid’deki karakterlerin inisiyatif sırasını,
    engelleri ve arkaplanı da alır ve tüm clientlara WS ile broadcast eder.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, format=None):
        data                 = request.data
        lobby_id             = data.get("lobby_id")
        placements           = data.get("placements", {})
        available_characters = data.get("available_characters", [])
        obstacles            = data.get("obstacles", [])
        background           = data.get("background", "forest")

        # Grid’deki tüm yerleşim birimlerinin ID’lerini al
        character_ids = [
            unit.get("id")
            for unit in placements.values()
            if isinstance(unit, dict) and unit.get("id") is not None
        ]

        if not lobby_id or not character_ids:
            return Response(
                {"error": "lobby_id ve yerleştirilmiş karakterler gereklidir."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        Character.objects.filter(lobby_id=lobby_id).update(
            damage_dealt   = 0,
            damage_taken   = 0,
            healing_done   = 0,
            kills          = 0,
        )

        # Seçilen karakterler için inisiyatif rolleri
        combatants = Character.objects.filter(id__in=character_ids)
        initiative_list = []
        for character in combatants:
            roll = character.roll_initiative()
            initiative_list.append({
                "character_id": character.id,
                "name":         character.name,
                "initiative":   roll
            })
        initiative_list.sort(key=lambda x: x["initiative"], reverse=True)

        # Battle-state’i güncelle
        BATTLE_STATE[str(lobby_id)] = {
            "initiative_order":     initiative_list,
            "placements":           placements,
            "available_characters": available_characters,
            "obstacles":            obstacles,
            "background":           background,
            "current_turn_index":   0,
            "chat_log":             []
        }

        # Karakterlerin action points’ını resetle
        for character in combatants:
            character.action_points = 1
            character.save(update_fields=["action_points"])

        # WS ile tüm grup üyelerine battleStart event’i broadcast et
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {
                "type":      "battle_start",
                "event":     "battleStart",
                "lobbyId":   lobby_id,
                "placements": placements,
                "available_characters": available_characters,
                "obstacles": obstacles,
                "background": background,
                "turnQueue": initiative_list,
            }
        )

        return Response({
            "message":            "Initiative order ve harita hazır.",
            "initiative_order":   initiative_list
        })


def get_melee_dice(attacker: Character) -> str:
    """
    - Eğer is_temporary ise monster’ın melee_dice alanını kullanır (fallback "1d4").
    - Aksi halde, mutlaka main_hand silahının damage_dice değerini döner.
    """
    if attacker.is_temporary:
        return attacker.melee_dice or "1d4"
    if not attacker.main_hand:
        raise ValueError("Melee attack için main_hand slotunda silah olmalı.")
    return attacker.main_hand.damage_dice





class MeleeAttackView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, format=None):
        # 1) Parametre kontrolü
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response(
                {"error": "attacker_id, target_id ve lobby_id gereklidir."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)

        # 2) Aksiyon puanı kontrolü
        if attacker.action_points < 1:
            return Response(
                {"error": "Bu turda aksiyon hakkın kalmadı."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3) Placement kontrolü (bitişik kare mi?)
        grid_size    = 20
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        placements   = battle_state.get("placements", {})

        def find_cell(char_id):
            for k, v in placements.items():
                if v and v.get("id") == char_id:
                    return int(k)
            return None

        a_cell = find_cell(attacker.id)
        t_cell = find_cell(target.id)
        if a_cell is None or t_cell is None:
            return Response({"error": "Konum bulunamadı."},
                            status=status.HTTP_400_BAD_REQUEST)

        a_row, a_col = divmod(a_cell, grid_size)
        t_row, t_col = divmod(t_cell, grid_size)
        if not ((a_row == t_row and abs(a_col - t_col) == 1) or
                (a_col == t_col and abs(a_row - t_row) == 1)):
            return Response({"error": "Hedef bitişik karede değil."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 4) Attack roll
        roll    = random.randint(1, 20)
        str_mod = (attacker.strength - 10) // 2
        lvl     = attacker.level

        if roll == 1:
            chat_msg = f"{attacker.name} zar attı: 1 → Otomatik kaçırma!"
            damage   = 0
            is_crit  = False
        else:
            attack_score = roll + str_mod + lvl
            is_crit      = roll == 20
            hit          = is_crit or attack_score >= target.ac

            if hit:
                try:
                    dice_str = get_melee_dice(attacker)
                    num, die = map(int, dice_str.split('d'))
                except Exception:
                    num, die = 1, 6

                dice_total  = sum(random.randint(1, die) for _ in range(num))
                base_damage = dice_total + str_mod
                damage      = base_damage * 2 if is_crit else base_damage

                if is_crit:
                    chat_msg = (f"{attacker.name} zar attı: 20 → Kritik! "
                                f"Dice {dice_str} toplamı {dice_total}, "
                                f"STR mod {str_mod} → Hasar = {damage}")
                else:
                    chat_msg = (f"Roll: {roll} + STR {str_mod} + LVL {lvl} = "
                                f"{attack_score} vs AC {target.ac} → İsabet! "
                                f"Hasar = {damage}")
            else:
                damage   = 0
                chat_msg = (f"Roll: {roll} + STR {str_mod} + LVL {lvl} = "
                            f"{attack_score} vs AC {target.ac} → Kaçırma!")

        # -------- İSTATİSTİK GÜNCELLEME --------
        if damage > 0:
            attacker.damage_dealt = (attacker.damage_dealt or 0) + damage
            target.damage_taken   = (target.damage_taken   or 0) + damage
            if target.hp - damage <= 0:
                attacker.kills = (attacker.kills or 0) + 1
            attacker.save(update_fields=["damage_dealt", "kills"])
            target.save(update_fields=["damage_taken"])
        # ---------------------------------------

        # -------- EVENT-LOG (bellek) -----------
        log_event = {
            "type":       "damage",
            "source_id":  attacker.id,
            "target_id":  target.id,
            "amount":     damage,
            "hp_after":   max(0, target.hp - damage),
            "critical":   is_crit,
            "timestamp":  timezone.now().isoformat(),
        }
        battle_state.setdefault("events", []).append(log_event)
        # ---------------------------------------

        # 6) HP güncelle
        target.hp = max(0, target.hp - damage)
        target.save(update_fields=["hp"])

        # 7) Ölen hedefi grid ve inisiyatiften çıkar
        if target.hp <= 0:
            for cell, unit in list(placements.items()):
                if unit and unit.get("id") == target.id:
                    placements[cell] = None

            old_order = battle_state.get("initiative_order", [])
            new_order = [e for e in old_order if e["character_id"] != target.id]

            cur_idx = battle_state.get("current_turn_index", 0)
            dead_idx = next((i for i, e in enumerate(old_order)
                             if e["character_id"] == target.id), None)
            if dead_idx is not None and dead_idx < cur_idx:
                cur_idx -= 1

            battle_state["initiative_order"]   = new_order
            battle_state["current_turn_index"] = max(cur_idx, 0)

        # 8) Chat log
        chat_log = battle_state.get("chat_log", [])
        chat_log.append(f"{chat_msg} (Kalan HP: {target.hp})")
        battle_state["chat_log"] = chat_log

        # 9) Action point
        attacker.action_points -= 1
        attacker.save(update_fields=["action_points"])

        # 10) State kaydet & WS yayını
        battle_state["placements"] = placements
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {
                "type": "battle.update",          # consumer’da battle_update
                "data": {
                    "lobbyId":   lobby_id,
                    "placements": placements,
                    "chatLog":    chat_log,
                    "logEvent":   log_event,      # ⬅️ event’i ilet
                }
            }
        )

        # 11) REST cevabı
        return Response({
            "message":             chat_msg,
            "damage":              damage,
            "target_remaining_hp": target.hp,
            "chat_log":            chat_log,
            "placements":          placements,
            "initiative_order":    battle_state.get("initiative_order", [])
        }, status=status.HTTP_200_OK)


def get_ranged_dice(attacker: Character) -> str:
    """
    - Eğer attacker.is_temporary ise monster’ın ranged_dice alanını kullanır (fallback "1d4").
    - Aksi halde, main_hand veya off_hand’da subtype 'bow' olan silahın damage_dice’ını döner.
    """
    if attacker.is_temporary:
        return attacker.ranged_dice or "1d4"
    # Player için bow kontrolü
    weapon = attacker.main_hand or attacker.off_hand
    if not weapon or getattr(weapon, 'subtype', None) != 'bow':
        raise ValueError("Menzilli saldırı için bow kuşanmanız gerekiyor.")
    return weapon.damage_dice


class RangedAttackView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, format=None):
        # 1) Parametre kontrolü
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response(
                {"error": "attacker_id, target_id ve lobby_id gereklidir."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)

        # 2) Aksiyon puanı
        if attacker.action_points < 1:
            return Response({"error": "Bu turda aksiyon hakkın kalmadı."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 3) Menzil & zar bilgisi
        try:
            dice_str = get_ranged_dice(attacker)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        grid_size    = 20
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        placements   = battle_state.get("placements", {})

        def find_cell(cid):
            for k, v in placements.items():
                if v and v.get("id") == cid:
                    return int(k)
            return None

        a_cell, t_cell = find_cell(attacker.id), find_cell(target.id)
        if a_cell is None or t_cell is None:
            return Response({"error": "Konum bulunamadı."},
                            status=status.HTTP_400_BAD_REQUEST)

        a_r, a_c = divmod(a_cell, grid_size)
        t_r, t_c = divmod(t_cell, grid_size)
        dist     = abs(a_r - t_r) + abs(a_c - t_c)

        base_rng  = 2
        dex_mod   = (attacker.dexterity - 10) // 2
        max_rng   = base_rng + dex_mod
        if dist > max_rng:
            return Response({"error": f"Menzil ({max_rng}) dışında."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 4) Attack roll
        roll      = random.randint(1, 20)
        lvl       = attacker.level
        is_crit   = roll == 20
        atk_score = roll + dex_mod + lvl
        hit       = is_crit or atk_score >= target.ac

        if roll == 1:
            damage   = 0
            chat_msg = f"{attacker.name} zar attı: 1 → Otomatik kaçırma!"
        elif hit:
            try:
                num, die = map(int, dice_str.split('d'))
            except ValueError:
                num, die = 1, 6
            dice_tot   = sum(random.randint(1, die) for _ in range(num))
            base_dmg   = dice_tot + dex_mod
            damage     = base_dmg * 2 if is_crit else base_dmg

            if is_crit:
                chat_msg = (f"{attacker.name} zar attı: 20 → Kritik! "
                            f"Dice {dice_str} toplamı {dice_tot}, "
                            f"DEX mod {dex_mod} → Hasar = {damage}")
            else:
                chat_msg = (f"Roll: {roll}+DEX {dex_mod}+LVL {lvl}={atk_score} "
                            f"vs AC {target.ac} → İsabet! Hasar = {damage}")
        else:
            damage   = 0
            chat_msg = (f"Roll: {roll}+DEX {dex_mod}+LVL {lvl}={atk_score} "
                        f"vs AC {target.ac} → Kaçırma!")

        # ---------- İSTATİSTİK GÜNCELLEME ----------
        if damage > 0:
            attacker.damage_dealt = (attacker.damage_dealt or 0) + damage
            target.damage_taken   = (target.damage_taken   or 0) + damage
            if target.hp - damage <= 0:
                attacker.kills = (attacker.kills or 0) + 1
            attacker.save(update_fields=["damage_dealt", "kills"])
            target.save(update_fields=["damage_taken"])
        # -------------------------------------------

        # ---------- EVENT-LOG ----------------------
        log_event = {
            "type":       "damage",
            "source_id":  attacker.id,
            "target_id":  target.id,
            "amount":     damage,
            "hp_after":   max(0, target.hp - damage),
            "critical":   is_crit,
            "timestamp":  timezone.now().isoformat(),
        }
        battle_state.setdefault("events", []).append(log_event)
        # -------------------------------------------

        # 5) HP güncelle
        target.hp = max(0, target.hp - damage)
        target.save(update_fields=["hp"])

        # 6) Ölen hedefi grid / inisiyatiften çıkar
        if target.hp == 0:
            for cell, unit in list(placements.items()):
                if unit and unit.get("id") == target.id:
                    placements[cell] = None

            old_ord = battle_state.get("initiative_order", [])
            battle_state["initiative_order"] = [
                e for e in old_ord if e["character_id"] != target.id
            ]

        # 7) Chat log
        chat_log = battle_state.get("chat_log", [])
        chat_log.append(f"{chat_msg} (Kalan HP: {target.hp})")
        battle_state["chat_log"] = chat_log

        # 8) AP düş
        attacker.action_points -= 1
        attacker.save(update_fields=["action_points"])

        # 9) State kaydet + WS
        battle_state["placements"] = placements
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {
                "type": "battle.update",
                "data": {
                    "lobbyId":    lobby_id,
                    "placements": placements,
                    "chatLog":    chat_log,
                    "logEvent":   log_event,   # ⬅️ event’i ilet
                }
            }
        )

        # 10) REST cevabı
        return Response({
            "message":             chat_msg,
            "damage":              damage,
            "target_remaining_hp": target.hp,
            "chat_log":            chat_log,
            "placements":          placements,
            "initiative_order":    battle_state.get("initiative_order", [])
        }, status=status.HTTP_200_OK)
    
class MoveCharacterView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lobby_id   = request.data.get("lobby_id")
        placements = request.data.get("placements", {})
        if not lobby_id or not isinstance(placements, dict):
            return Response({"detail": "Eksik veri"}, status=status.HTTP_400_BAD_REQUEST)

        # In-memory state’inizi güncelleyin:
        state = BATTLE_STATE.get(str(lobby_id), {})
        state["placements"] = placements
        BATTLE_STATE[str(lobby_id)] = state

        # Tüm gruba yayınla (Channels)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {
                "type": "battle.update",
                "event": "battleUpdate",
                "lobbyId": lobby_id,
                "placements": placements,
                "initiative_order": state.get("initiative_order"),
                "available_characters": state.get("available_characters"),
                "current_turn_index": state.get("current_turn_index"),
                "chat_log": state.get("chat_log"),
            }
        )

        return Response({"status": "ok"}, status=status.HTTP_200_OK)


# EndTurn endpoint: Sadece GM güncellemesi yapar.
class EndTurnView(APIView):
    """
    Oyuncu "Turn End" butonuna bastığında çağrılır.
    Eğer GM tarafından gönderildiyse, mevcut turdaki karakter global battle state'den çıkarılır
    (HP 0 değilse kuyruğun sonuna eklenir, HP 0 ise çıkarılır) ve ölen karakterlerin grid'den 
    kaldırılması, ayrıca temporary karakterlerin DB'den silinmesi sağlanır.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, format=None):
        lobby_id = request.data.get("lobby_id")
        if not lobby_id:
            return Response({"error": "lobby_id gereklidir."}, status=status.HTTP_400_BAD_REQUEST)

        lobby             = get_object_or_404(Lobby, lobby_id=lobby_id)
        battle_state      = BATTLE_STATE.get(str(lobby_id), {})
        initiative_order  = battle_state.get("initiative_order", [])
        current_turn_index= battle_state.get("current_turn_index", 0)

        if not initiative_order:
            return Response({"error": "Initiative order boş."}, status=status.HTTP_400_BAD_REQUEST)

        # Şu anki karakter
        current_entry = initiative_order[current_turn_index]
        try:
            current_char = Character.objects.get(id=current_entry["character_id"])
        except Character.DoesNotExist:
            current_char = None

        # Grid'deki ölüleri temizle
        placements = battle_state.get("placements", {})
        for cell, unit in list(placements.items()):
            if unit:
                try:
                    c = Character.objects.get(id=unit["id"])
                    if c.hp <= 0:
                        placements[cell] = None
                except Character.DoesNotExist:
                    placements[cell] = None

        # Yeni inisiyatif sırasını oluştururken yalnızca hp>0 olanları ekle
        new_initiative = []
        for idx, entry in enumerate(initiative_order):
            if idx == current_turn_index:
                # bu turu atlıyoruz, yeniden eklenecekse aşağıda eklenir
                continue
            try:
                c = Character.objects.get(id=entry["character_id"])
            except Character.DoesNotExist:
                continue
            if c.hp > 0:
                new_initiative.append(entry)

        # Şu anki karakter hayattaysa en sona ekle
        if current_char and current_char.hp > 0:
            new_initiative.append(current_entry)

        # Battle-state güncelle
        battle_state["initiative_order"]   = new_initiative
        battle_state["current_turn_index"] = 0
        battle_state["placements"]         = placements
        BATTLE_STATE[str(lobby_id)]        = battle_state

        # Sıradaki karakterin action_points'unu resetle
        if new_initiative:
            next_id   = new_initiative[0]["character_id"]
            next_char = get_object_or_404(Character, id=next_id)
            next_char.action_points = 1
            next_char.save(update_fields=["action_points"])

        # Ölü temporary karakterleri DB'den sil
        Character.objects.filter(
            lobby_id=lobby_id,
            is_temporary=True,
            hp__lte=0
        ).delete()

        # Güncellenmiş battle state'i broadcast et
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {
                'type':    'game_message',
                'message': battle_state
            }
        )

        return Response({
            "message":           "Turn ended.",
            "initiative_order":  new_initiative,
            "placements":        placements
        })

# BattleState endpoint: Global battle state'i döner.
def to_jsonable(obj):
    """Recursively convert bytes/File to JSON-friendly values."""
    if isinstance(obj, bytes):
        # İstersen base64 → burada URL gerekmezse base64 ver
        return base64.b64encode(obj).decode()
    if isinstance(obj, File):
        return obj.url or str(obj)          # /media/… URL
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_jsonable(i) for i in obj]
    return obj

def default_state():
    return {
        "initiative_order":     [],
        "placements":           {},
        "available_characters": [],
        "current_turn_index":   0,
        "chat_log":             [],
        "obstacles":            [],
        "background":           "forest",
        "finished":             False,
    }

class BattleStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lobby_id):
        state = BATTLE_STATE.get(str(lobby_id), default_state())
        return Response(to_jsonable(state))

# Diğer view'ler...
class LobbyViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    from lobbies.serializers import LobbySerializer, LobbyPlayerSerializer
    serializer_class = LobbySerializer

    def get_queryset(self):
        user = self.request.user
        return Lobby.objects.filter(
            Q(gm_player=user) | Q(players__player=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(gm_player=self.request.user)

    @action(detail=True, methods=['patch'], url_path='players/(?P<player_id>[^/.]+)/ready')
    def set_player_ready(self, request, pk=None, player_id=None):
        lobby = self.get_object()
        lp = get_object_or_404(LobbyPlayer, lobby=lobby, player_id=player_id)
        new_ready = request.data.get('is_ready')
        if new_ready is None:
            return Response({"error": "is_ready is required."}, status=status.HTTP_400_BAD_REQUEST)
        lp.is_ready = bool(new_ready)
        lp.save()
        return Response({
            "message": f"Player with player_id={player_id} is_ready={lp.is_ready}"
        })

    @action(detail=True, methods=['post'], url_path='start_game')
    def start_game(self, request, pk=None):
        lobby = self.get_object()
        if lobby.gm_player != request.user:
            return Response({"error": "Only GM can start the game."}, status=status.HTTP_403_FORBIDDEN)
        players = LobbyPlayer.objects.filter(lobby=lobby)
        if not players.exists():
            return Response({"error": "There are no players in this lobby."}, status=status.HTTP_400_BAD_REQUEST)
        if not all(p.is_ready for p in players):
            return Response({"error": "Not all players are ready!"}, status=status.HTTP_400_BAD_REQUEST)
        lobby.is_battle_arena_ready = True
        lobby.is_active = False
        lobby.save()
        return Response({"message": "Game started!", "lobby_id": lobby.lobby_id})
    

class EndBattleView(APIView):
    """
    GM “Savaşı Bitir” butonuna bastığında çağrılır.
    – DB’de geçici karakterleri siler
    – Hafif bir “battle summary” JSON’u oluşturur (icon → URL)
    – Özeti bellekte tutar ve WS ile battleEnd yayını yapar
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        lobby_id = request.data.get("lobby_id")
        if not lobby_id:
            return Response(
                {"error": "lobby_id gereklidir"},
                status=status.HTTP_400_BAD_REQUEST
            )

        lobby = get_object_or_404(Lobby, lobby_id=lobby_id)
        if lobby.gm_player_id != request.user.id:
            return Response(
                {"error": "Sadece GM bitirebilir"},
                status=status.HTTP_403_FORBIDDEN
            )

        state     = BATTLE_STATE.get(str(lobby_id), {})
        chat_log  = state.get("chat_log", [])

        # ------ oyuncu başına sade istatistikler ------
        players = Character.objects.filter(
            lobby_id=lobby_id,
            is_temporary=False
        )

        summary_players = [
            {
                "id":            ch.id,
                "name":          ch.name,
                "icon":          ch.icon.url if ch.icon else None,
                "level":         ch.level,
                "xp_gained":     getattr(ch, "xp_gained_last_battle", 0),
                "damage_dealt":  getattr(ch, "damage_dealt", 0),
                "healing_done":  getattr(ch, "healing_done", 0),
                "damage_taken":  getattr(ch, "damage_taken", 0),
                "kills":         getattr(ch, "kills", 0),
            }
            for ch in players
        ]

        summary = {
            "lobby_id": lobby_id,
            "ended_at": timezone.now().isoformat(),
            "players":  summary_players,
            "chat_log": chat_log,
        }

        # Bellekte sakla – BattleSummaryView dönecek
        BATTLE_STATE[str(lobby_id)] = {
            **state, "finished": True, "summary": summary
        }

        # Geçici yaratıkları sil
        Character.objects.filter(
            lobby_id=lobby_id,
            is_temporary=True
        ).delete()

        # Tüm client’lara WS ile “battleEnd” yayını
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {
                "type":   "battle_end", # Bu type, battle_end consumer'ında işlenecek
                "event":  "battleEnd",
                "lobbyId": lobby_id,
                "summary": (summary),
                
            }
        )

        return Response(summary, status=status.HTTP_200_OK)


class BattleSummaryView(APIView):
    """Savaş bittikten sonra özet verilerini döner"""
    permission_classes = [IsAuthenticated]

    def get(self, request, lobby_id):
        state = BATTLE_STATE.get(str(lobby_id), {})
        summary = state.get("summary")
        if not summary:
            return Response({"error": "Savaş özeti bulunamadı."},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(summary, status=status.HTTP_200_OK)



class CreateLobbyView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        from lobbies.serializers import LobbySerializer
        serializer = LobbySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(gm_player=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RaceListView(ListAPIView):
    queryset = Race.objects.all()
    serializer_class = RaceSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

class ClassListView(ListAPIView):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

class CharacterTemplateListView(ListAPIView):
    queryset = CharacterTemplate.objects.all()
    serializer_class = CharacterTemplateSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]
