# spells/views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Spell
from .serializers import SpellSerializer

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
    permission_classes     = [AllowAny]

    def post(self, request, spell_id):
        """
        POST /api/spells/{spell_id}/cast/
        Body:
        {
          "attacker_id": <int>,
          "targets": [<int>, ...],             # tek/çok hedef
          "center_cell": {"x": int,"y": int},  # alan büyüsü için opsiyonel
          "lobby_id":   <int>
        }
        """
        attacker  = get_object_or_404(Character, id=request.data.get('attacker_id'))
        spell     = get_object_or_404(Spell,     id=spell_id)
        lobby_id  = request.data.get('lobby_id')

        # -------- Hedef listesi -------- #
        targets_qs = Character.objects.none()
        if spell.scope == 'area' and request.data.get('center_cell'):
            cx = request.data['center_cell']['x']
            cy = request.data['center_cell']['y']
            targets_qs = Character.objects.filter(
                grid_x__range=(cx-1, cx+1),
                grid_y__range=(cy-1, cy+1),
                lobby_id=lobby_id
            )
        else:
            target_ids = request.data.get('targets', [])
            targets_qs = Character.objects.filter(id__in=target_ids)

        # -------- Zar + saldırı atışı -------- #
        base_dmg = roll_damage(spell)

        def spell_attack_bonus(attacker):
            """
            • Wizard   → INT mod
            • (ileride) Sorcerer → CHA mod
            • Diğer    → +0
            """
            # --- Sınıf adını güvenli şekilde çek ---
            raw_cls = None

            # 1) Düz text alanlar
            if getattr(attacker, "char_class", None):
                raw_cls = attacker.char_class
            elif getattr(attacker, "character_class", None):
                raw_cls = attacker.character_class

            # 2) Tablo sütunu gerçekten “class” ise (FK veya CharField)
            elif "class" in attacker.__dict__ and attacker.__dict__["class"]:
                obj = attacker.__dict__["class"]
                raw_cls = getattr(obj, "name", str(obj))  # FK ise obj.name, değilse str(obj)

            cls = str(raw_cls).lower() if raw_cls else ""

            # --- Mod seç ---
            if cls == "wizard":
                return ability_mod(attacker.intelligence)
            elif cls == "sorcerer":
                return ability_mod(attacker.charisma)
            elif cls == "cleric":
                return ability_mod(attacker.wisdom)
            elif cls == "druid":
                return ability_mod(attacker.wisdom)
            elif cls == "paladin":
                return ability_mod(attacker.charisma)
            elif cls == "ranger":
                return ability_mod(attacker.wisdom)
            elif cls == "warlorck":
                return ability_mod(attacker.wisdom)
            
            return 0

        atk_mod = spell_attack_bonus(attacker)

        results  = {}
        chat_log = []

        for tgt in targets_qs:
            roll     = random.randint(1, 20)
            atk_total= roll + atk_mod
            hit      = atk_total >= tgt.ac
            damage   = base_dmg if hit else (base_dmg // 2 if spell.scope == 'area' else 0)

            # HP güncelle
            tgt.hp = max(0, tgt.hp - damage)
            tgt.save()
            results[tgt.id] = tgt.hp

            # Mesaj
            outcome = "isabet" if hit else ("yarım hasar" if damage else "ıskalama")
            msg = (f"{attacker.name} {spell.name} kullandı → "
                   f"{tgt.name} {roll}+{atk_mod}={atk_total} ({outcome}), "
                   f"{damage} {spell.damage_type} hasar (HP {tgt.hp}).")
            chat_log.append(msg)

        # -------- WS broadcast -------- #
        channel_layer = get_channel_layer()
        payload = {
            "event": "battleUpdate",
            "lobbyId": lobby_id,
            "placements": {},   # isteğe bağlı board sync
            "chatLog": chat_log,
            "results": results,
        }
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {"type": "battle.update", "data": payload}
        )

        # -------- REST response -------- #
        return Response({
            "message": chat_log,
            "results": results
        }, status=status.HTTP_200_OK)
