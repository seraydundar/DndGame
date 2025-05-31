from rest_framework import viewsets, permissions, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Spell
from .serializers import SpellSerializer
import random
from rest_framework.views import APIView
from rest_framework.response import Response
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

    authentication_classes = (CsrfExemptSessionAuthentication,)
    queryset = Spell.objects.order_by('spell_level', 'name')
    serializer_class = SpellSerializer
    permission_classes = [permissions.AllowAny]

    # Dosya yükleme için:
    parser_classes = [MultiPartParser, FormParser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['spell_level', 'school']
    search_fields = ['name', 'classes']

    def perform_create(self, serializer):
        # Serializer.create() created_by atamasını yapmış olur
        serializer.save()

class SpellCastView(APIView):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [AllowAny]

    def post(self, request, spell_id):
        """
        POST /api/spells/{spell_id}/cast/
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

        # 1) Zar atma
        num = spell.dice_num
        size = spell.dice_size
        modifier = spell.dice_modifier
        total_effect = sum(random.randint(1, size) for _ in range(num)) + modifier

        # 2) Etkiyi uygula
        results = {}
        chat_log = []
        for tgt in targets_qs:
            if spell.effect_type == 'damage':
                # Hasar uygulama
                tgt.hp = max(0, tgt.hp - total_effect)
                message = f"{attacker.name} kullandı {spell.name} ve {total_effect} {spell.damage_type} hasar verdi."
            elif spell.effect_type == 'heal':
                # İyileştirme uygulama
                max_hp = getattr(tgt, 'max_hp', None)
                if max_hp is not None:
                    tgt.hp = min(max_hp, tgt.hp + total_effect)
                else:
                    tgt.hp += total_effect
                message = f"{attacker.name} kullandı {spell.name} ve {total_effect} can dolumu sağladı."
            else:
                # Buff/Debuff henüz uygulanmadı
                message = f"{attacker.name} kullandı {spell.name}."
            tgt.save()
            results[tgt.id] = tgt.hp
            chat_log.append(message)

        # 3) WebSocket bildirimi
        channel_layer = get_channel_layer()
        payload = {
            "event": "battleUpdate",
            "lobbyId": lobby_id,
            "placements": {},
            "chatLog": chat_log,
            "results": results,
        }
        async_to_sync(channel_layer.group_send)(
            f"battle_{lobby_id}",
            {
                "type": "battle.update",
                "data": payload
            }
        )

        # 4) Yanıt
        return Response({
            "message": chat_log,
            "effect": total_effect,
            "results": results
        }, status=status.HTTP_200_OK)
