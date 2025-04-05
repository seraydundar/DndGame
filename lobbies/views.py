from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from django.db.models import Q

from .models import Lobby, LobbyPlayer
from .serializers import LobbySerializer, LobbyPlayerSerializer
from game.models import Character
from game.serializers import CharacterSerializer

# CSRF kontrolünü devre dışı bırakmak için özel authentication sınıfı
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

class LobbyViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = LobbySerializer
    # lookup_field, Lobby modelinde primary key olarak kullanılan 'lobby_id' ile eşleşsin
    lookup_field = 'lobby_id'

    def get_queryset(self):
        user = self.request.user
        return Lobby.objects.filter(
            Q(gm_player=user) | Q(players__player=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(gm_player=self.request.user)

    @action(detail=True, methods=['patch'], url_path='players/(?P<player_id>[^/.]+)/ready')
    def set_player_ready(self, request, lobby_id=None, player_id=None):
        lobby = self.get_object()
        lp = get_object_or_404(LobbyPlayer, lobby=lobby, player_id=player_id)
        new_ready = request.data.get('is_ready')
        if new_ready is None:
            return Response({"error": "is_ready is required"}, status=status.HTTP_400_BAD_REQUEST)
        lp.is_ready = bool(new_ready)
        character_id = request.data.get('character_id')
        if character_id:
            # Karakter geçerliliği kontrol edilebilir
            lp.character_id = character_id
        lp.save()
        return Response({
            "message": f"Player with player_id={player_id} is_ready={lp.is_ready}"
        })

    @action(detail=True, methods=['get'], url_path='characters')
    def characters(self, request, lobby_id=None):
        lobby = self.get_object()
        # Lobby modelindeki lobby_id ile eşleşen tüm karakterleri çekiyoruz.
        characters = Character.objects.filter(lobby_id=lobby.lobby_id)
        serializer = CharacterSerializer(characters, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='start_game')
    def start_game(self, request, lobby_id=None):
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
    """
    Ek lobi oluşturma endpoint'i: POST /api/lobbies/create/
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        from .serializers import LobbySerializer  # lobbies uygulamasındaki serializer
        serializer = LobbySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(gm_player=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
