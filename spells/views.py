# DndGame/spells/views.py

from rest_framework import viewsets, permissions, filters
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Spell
from .serializers import SpellSerializer
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from game.models import Character
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        # CSRF kontrolünü pas geç
        return


class SpellViewSet(viewsets.ModelViewSet):
    """
    /api/spells/ endpoint’i CRUD + listeleme + filtreleme sağlar.
    """
    queryset = Spell.objects.order_by('spell_level', 'name')
    serializer_class = SpellSerializer
    permission_classes = [permissions.AllowAny]

    # Dosya yükleme için:
    parser_classes = [MultiPartParser, FormParser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['spell_level', 'school']
    search_fields = ['name', 'classes']

    def perform_create(self, serializer):
        # Burada artık created_by atamasını bırakıyoruz,
        # Serializer.create() içinde kendisi halletsin:
        serializer.save()

class SpellCastView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request, spell_id):
        """
        POST /api/spells/{spell_key}/cast/
        Body:
        {
          "attacker_id": <int>,
          "targets": [<int>, ...],
          "lobby_id": <int>
        }
        """
        attacker = get_object_or_404(Character, id=request.data.get('attacker_id'))
        targets_qs = Character.objects.filter(id__in=request.data.get('targets', []))
        spell = get_object_or_404(Spell, id=spell_id)
        lobby_id = request.data.get('lobby_id')

        # 1) Dice roll
        effect = spell.effect or {}
        dice_cfg = effect.get('dice', {})
        num = dice_cfg.get('num', 1)
        size = dice_cfg.get('size', 6)
        modifier = dice_cfg.get('modifier', 0)
        total_damage = sum(random.randint(1, size) for _ in range(num)) + modifier

        # 2) Apply damage to each target
        results = {}
        for tgt in targets_qs:
            tgt.hp = max(0, tgt.hp - total_damage)
            tgt.save()
            results[tgt.id] = tgt.hp

        # 3) Notify via WebSocket
        channel_layer = get_channel_layer()
        payload = {
            "event": "battleUpdate",
            "lobbyId": lobby_id,
            "placements": {},   # gerekirse güncel yerleşimleri ekleyin
            "chatLog": [
                f"{attacker.name} kullandı {spell.name} ve {total_damage} hasar verdi."
            ],
            "results": results,
        }
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {
                "type": "battle.update",  # BattleConsumer’da tanımlı handler
                "data": payload
            }
        )

        # 4) Dönüş
        return Response({
            "message": payload["chatLog"][0],
            "damage": total_damage,
            "results": results
        }, status=status.HTTP_200_OK)