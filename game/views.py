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

from .models import Character, Race, Class, CharacterTemplate
from lobbies.models import Lobby, LobbyPlayer
from .serializers import CharacterTemplateSerializer, RaceSerializer, ClassSerializer, CharacterSerializer

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
            # Bu lobiye ait TÜM karakterleri döndür
            return Character.objects.filter(lobby_id=lobby_pk)

        # Aksi halde /api/characters/ çağrısı: 
        # GM değilse kendi karakterlerini, GM ise tüm karakterleri döndür
        if self.request.user.is_staff or self.request.user.is_superuser:
            return Character.objects.all()
        return Character.objects.filter(player_id=self.request.user.id)

    def perform_create(self, serializer):
        # Nested route'dan veya payload'tan gelmiş lobby_pk
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
            return Response({"error": "Level up için yeterli XP yok."}, status=status.HTTP_400_BAD_REQUEST)
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
        character = self.get_object()
        if not character.can_level_up:
            return Response({"error": "Level up için yeterli XP yok."}, status=status.HTTP_400_BAD_REQUEST)
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

# Initiative order hesaplaması
class InitiateCombatView(APIView):
    """
    GM savaşı başlattığında, grid’deki karakterlerin initiative sırasını hesaplar.
    İstek payload'unda lobby_id, character_ids, placements ve available_characters gönderilmelidir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        lobby_id = request.data.get("lobby_id")
        character_ids = request.data.get("character_ids", [])
        placements = request.data.get("placements", {})
        available_characters = request.data.get("available_characters", [])
        if not lobby_id or not character_ids:
            return Response({"error": "lobby_id ve character_ids gereklidir."}, status=status.HTTP_400_BAD_REQUEST)
        combatants = Character.objects.filter(id__in=character_ids)
        initiative_list = []
        for character in combatants:
            roll = character.roll_initiative()
            initiative_list.append({
                "character_id": character.id,
                "name": character.name,
                "initiative": roll
            })
        initiative_list.sort(key=lambda x: x["initiative"], reverse=True)
        BATTLE_STATE[str(lobby_id)] = {
            "initiative_order": initiative_list,
            "placements": placements,
            "available_characters": available_characters,
            "current_turn_index": 0,
            "chat_log": []
        }
        return Response({
            "message": "Initiative order oluşturuldu.",
            "initiative_order": initiative_list
        })

class MeleeAttackView(APIView):
    """
    Yakın Dövüş Saldırısı endpoint'i:
    Saldırıyı yapabilmek için saldırgan ile hedefin bulunduğu kareler arasında
    sadece bitişik (aynı satırda ve sütun farkı 1 ya da aynı sütunda ve satır farkı 1) mesafe olmalıdır.
    Saldırı, 1d6 + strength bonusu üzerinden hesaplanır.
    İstek payload'unda attacker_id, target_id ve lobby_id gönderilmelidir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)
        
        # Grid boyutu: 20x20
        gridSize = 20
        
        # Global battle state'den placements bilgisini alalım
        battle_state = BATTLE_STATE.get(str(lobby_id))
        if not battle_state or "placements" not in battle_state:
            return Response({"error": "Battle state bulunamadı."},
                            status=status.HTTP_400_BAD_REQUEST)
        placements = battle_state["placements"]
        
        # Saldırgan ve hedefin hangi hücrelerde yer aldığını tespit edelim
        attacker_cell = None
        target_cell = None
        for key, value in placements.items():
            if value:
                if value.get("id") == attacker.id:
                    attacker_cell = int(key)
                if value.get("id") == target.id:
                    target_cell = int(key)
        if attacker_cell is None or target_cell is None:
            return Response({"error": "Saldırgan veya hedefin konumu bulunamadı."},
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Hücre konumlarını satır ve sütunlara ayıralım
        attacker_row, attacker_col = divmod(attacker_cell, gridSize)
        target_row, target_col = divmod(target_cell, gridSize)
        
        # Sadece bitişik hücreler (aynı satırda ve sütun farkı 1 ya da aynı sütunda ve satır farkı 1) saldırıya izin verilir.
        if not ((attacker_row == target_row and abs(attacker_col - target_col) == 1) or 
                (attacker_col == target_col and abs(attacker_row - target_row) == 1)):
            return Response({"error": "Hedef, saldırıya uygun mesafede değil. Yakın dövüş saldırısı yalnızca bitişik karelere yapılabilir."},
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Mesafe uygunsa hasarı hesapla (örneğin normal_attack_damage() metodu üzerinden)
        damage = attacker.normal_attack_damage()
        target.hp = max(0, target.hp - damage)
        target.save()
        
        new_message = f"{attacker.name} {target.name}'e yakın dövüş saldırısı yaptı ve {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log = battle_state.get("chat_log", [])
        chat_log.append(new_message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        # Güncellemeyi tüm oyunculara yayınla
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {
                'type': 'game_message',
                'message': battle_state
            }
        )

        return Response({
            "message": f"{attacker.name} yakın dövüş saldırısı yaptı.",
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })


class RangedAttackView(APIView):
    """
    Ranged (Dexterity) Attack endpoint:
    Bu saldırı, saldırgan ile hedef arasındaki mesafenin 5x5 birim karelik alanda olmasına bağlıdır.
    Hasar, 1d6 + saldırganın dexterity değeri ile hesaplanır.
    İstek payload’unda attacker_id, target_id ve lobby_id gönderilmelidir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        gridSize = 20  # 20x20 grid

        # Global battle state'den placements bilgisini alıyoruz
        battle_state = BATTLE_STATE.get(str(lobby_id))
        if not battle_state or "placements" not in battle_state:
            return Response({"error": "Battle state bulunamadı."},
                            status=status.HTTP_400_BAD_REQUEST)
        placements = battle_state["placements"]

        # Saldırgan ve hedefin hangi hücrelerde yer aldığını tespit ediyoruz.
        attacker_cell = None
        target_cell = None
        for key, value in placements.items():
            if value:
                if value.get("id") == attacker.id:
                    attacker_cell = int(key)
                if value.get("id") == target.id:
                    target_cell = int(key)
        if attacker_cell is None or target_cell is None:
            return Response({"error": "Saldırgan veya hedefin konumu bulunamadı."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Hücre konumlarını satır ve sütunlara ayırıyoruz.
        attacker_row, attacker_col = divmod(attacker_cell, gridSize)
        target_row, target_col = divmod(target_cell, gridSize)

        # Saldırının 5x5 alan içinde olup olmadığını kontrol ediyoruz.
        # Yani saldırganın bulunduğu hücreye göre, satır ve sütun farkı en fazla 2 olmalıdır.
        if not (abs(attacker_row - target_row) <= 2 and abs(attacker_col - target_col) <= 2):
            return Response({"error": "Hedef, saldırıya uygun mesafede değil. Ranged saldırı 5x5 alanda yapılabilir."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Hasarı hesapla: 1d6 + attacker.dexterity
        roll = random.randint(1, 6)
        damage = roll + (attacker.dexterity if hasattr(attacker, 'dexterity') else 0)
        target.hp = max(0, target.hp - damage)
        target.save()

        new_message = f"{attacker.name} {target.name}'e ranged saldırısı yaptı ve {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log = battle_state.get("chat_log", [])
        chat_log.append(new_message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        # Güncellenen battle state'i tüm oyunculara yayınla.
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {
                'type': 'game_message',
                'message': battle_state
            }
        )

        return Response({
            "message": f"{attacker.name} ranged saldırısı yaptı.",
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })
    
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
    (HP 0 değilse kuyruğun sonuna eklenir, HP 0 ise çıkarılır) ve ölen karakterlerin grid'den kaldırılması sağlanır.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        lobby_id = request.data.get("lobby_id")
        if not lobby_id:
            return Response({"error": "lobby_id gereklidir."}, status=status.HTTP_400_BAD_REQUEST)
        lobby = get_object_or_404(Lobby, lobby_id=lobby_id)
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        initiative_order = battle_state.get("initiative_order", [])
        current_turn_index = battle_state.get("current_turn_index", 0)
        if not initiative_order:
            return Response({"error": "Initiative order boş."}, status=status.HTTP_400_BAD_REQUEST)
        current_entry = initiative_order[current_turn_index]
        from .models import Character
        try:
            character = Character.objects.get(id=current_entry["character_id"])
        except Character.DoesNotExist:
            character = None
        placements = battle_state.get("placements", {})
        for key, char_data in placements.items():
            if char_data:
                try:
                    char_obj = Character.objects.get(id=char_data["id"])
                    if char_obj.hp <= 0:
                        placements[key] = None
                except Character.DoesNotExist:
                    placements[key] = None
        new_initiative = [entry for i, entry in enumerate(initiative_order) if i != current_turn_index]
        if character and character.hp > 0:
            new_initiative.append(current_entry)
        battle_state["initiative_order"] = new_initiative
        battle_state["current_turn_index"] = 0
        battle_state["placements"] = placements
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {
                'type': 'game_message',
                'message': battle_state
            }
        )

        return Response({
            "message": "Turn ended.",
            "initiative_order": new_initiative,
            "placements": placements
        })

# BattleState endpoint: Global battle state'i döner.
class BattleStateView(APIView):
    """
    Global BATTLE_STATE içerisindeki battle state bilgisini döner.
    """
    def get(self, request, lobby_id, format=None):
        state = BATTLE_STATE.get(str(lobby_id), {
            "initiative_order": [],
            "placements": {},
            "available_characters": [],
            "current_turn_index": 0,
            "chat_log": []
        })
        return Response(state)

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
