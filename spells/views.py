# spells/views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Spell
from .serializers import SpellSerializer
from django.utils import timezone
from game.views import BATTLE_STATE

import random
from math import floor

from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from game.models import Character
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication

# ---------------- CSRF bypass (mobil / WS istekleri) ---------------- #
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

# ---------------- Spell CRUD ---------------- #
class SpellViewSet(viewsets.ModelViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    queryset = Spell.objects.order_by('spell_level', 'name')
    serializer_class      = SpellSerializer
    permission_classes    = [permissions.AllowAny]

    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['spell_level', 'school']
    search_fields    = ['name', 'classes']

    def perform_create(self, serializer):
        serializer.save()

# ---------------- Yardımcılar ---------------- #
def ability_mod(score: int) -> int:
    return floor((score - 10) / 2)

def roll_damage(spell: Spell) -> int:
    """Örn. 2d6+3"""
    return sum(random.randint(1, spell.dice_size) for _ in range(spell.dice_num)) + spell.dice_modifier

# ---------------- Spell Cast ---------------- #
class SpellCastView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes     = [AllowAny]   # istersen Authenticated yap

    def post(self, request, spell_id):
        """
        POST /api/spells/{spell_id}/cast/
        Body:
        {
          "attacker_id": <int>,
          "targets": [<int>, ...],            # tek / çok hedef
          "center_cell": {"x": int,"y": int}, # area spell ops.
          "lobby_id": <int>
        }
        """
        attacker  = get_object_or_404(Character, id=request.data.get("attacker_id"))
        spell     = get_object_or_404(Spell,     id=spell_id)
        lobby_id  = request.data.get("lobby_id")

        # -------- hedef listesi --------
        if spell.scope == "area" and request.data.get("center_cell"):
            cx = request.data["center_cell"]["x"]
            cy = request.data["center_cell"]["y"]
            targets_qs = Character.objects.filter(
                grid_x__range=(cx-1, cx+1),
                grid_y__range=(cy-1, cy+1),
                lobby_id=lobby_id
            )
        else:
            tgt_ids    = request.data.get("targets", [])
            targets_qs = Character.objects.filter(id__in=tgt_ids)

        # -------- saldırı / bonus --------
        base_dmg = roll_damage(spell)           # pozitif → hasar, negatif → heal

        def spell_attack_bonus(caster: Character):
            cls_name = (getattr(caster, "character_class", None)
                        or getattr(caster, "char_class", None)
                        or getattr(caster.__dict__.get("class", None), "name", "")
                       )
            cls_name = str(cls_name).lower()
            if cls_name in ("wizard",):
                return ability_mod(caster.intelligence)
            if cls_name in ("sorcerer", "paladin"):
                return ability_mod(caster.charisma)
            if cls_name in ("cleric", "druid", "ranger", "warlock"):
                return ability_mod(caster.wisdom)
            return 0

        atk_mod = spell_attack_bonus(attacker)

        # -------- mevcut state --------
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        events       = battle_state.setdefault("events", [])
        placements   = battle_state.get("placements", {})

        results = {}

        for tgt in targets_qs:
            roll       = random.randint(1, 20)
            atk_total  = roll + atk_mod
            hit        = atk_total >= tgt.ac
            # area spell: kaçırsa yarı hasar / yarı heal
            amount     = base_dmg if hit else (base_dmg // 2 if spell.scope == "area" else 0)

            # ------------- İSTATİSTİK ----------------
            if amount > 0:  # hasar
                attacker.damage_dealt = (attacker.damage_dealt or 0) + amount
                tgt.damage_taken      = (tgt.damage_taken  or 0) + amount
                if tgt.hp - amount <= 0:
                    attacker.kills = (attacker.kills or 0) + 1
                attacker.save(update_fields=["damage_dealt", "kills"])
                tgt.save(update_fields=["damage_taken"])
            elif amount < 0:  # iyileştirme
                healed = abs(amount)
                attacker.healing_done = (attacker.healing_done or 0) + healed
                attacker.save(update_fields=["healing_done"])

            # ------------- HP ------------------------
            tgt.hp = max(0, tgt.hp - amount) if amount > 0 else min(tgt.max_hp, tgt.hp + healed)
            tgt.save(update_fields=["hp"])
            results[tgt.id] = tgt.hp

            # ------------- EVENT LOG ----------------
            events.append({
                "type":      "heal" if amount < 0 else "damage",
                "source_id": attacker.id,
                "target_id": tgt.id,
                "amount":    -healed if amount < 0 else amount,
                "hp_after":  tgt.hp,
                "critical":  False,
                "spell_id":  spell.id,
                "timestamp": timezone.now().isoformat(),
            })

            # ------------- Chat ----------------------
            outcome = "isabet" if hit else ("yarım" if amount else "ıskalama")
            dmg_txt = f"{amount} {spell.damage_type}"
            chat_log.append(
                f"{attacker.name} {spell.name} kullandı → "
                f"{tgt.name} {roll}+{atk_mod}={atk_total} ({outcome}), "
                f"{dmg_txt} (HP {tgt.hp})."
            )

        battle_state["chat_log"] = chat_log

        # -------- AP düşür (isteğe bağlı) ----------
        attacker.action_points = max(0, attacker.action_points - 1)
        attacker.save(update_fields=["action_points"])
        
        
        for cell, unit in placements.items():
            if unit and unit.get("id") == attacker.id:
                unit["action_points"] = attacker.action_points
                unit["max_action_points"] = attacker.max_action_points
                break


        # -------- state sakla & WS broadcast -------
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
                    "logEvents":  events[-len(targets_qs):]  # son eklenenler
                }
            }
        )

        # -------- REST response --------
        return Response({
            "message": chat_log,
            "results": results
        }, status=status.HTTP_200_OK)
