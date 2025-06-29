from rest_framework import serializers
from .models import Lobby, LobbyPlayer
from game.models import Character
from game.serializers import CharacterSerializer

class LobbyPlayerSerializer(serializers.ModelSerializer):
    player_username = serializers.CharField(source='player.username', read_only=True)
    # SerializerMethodField ile ilgili oyuncunun lobby'deki karakterini dinamik olarak sorguluyoruz.
    character = serializers.SerializerMethodField()

    def get_character(self, obj):
        try:
            # Bu sorgu, ilgili oyuncuya ait (ve belirtilen lobiye ait) ilk karakteri dönecektir.
            character = Character.objects.filter(
                player_id=obj.player.id,
                lobby_id=obj.lobby.lobby_id
            ).first()
            if character:
                return CharacterSerializer(character).data
            return None
        except Exception:
            return None

    class Meta:
        model = LobbyPlayer
        fields = ['id', 'player', 'player_username', 'is_ready', 'joined_at', 'character']
        read_only_fields = ['player', 'joined_at']

class LobbySerializer(serializers.ModelSerializer):
    # Related_name üzerinden lobby_players bilgisini getiriyoruz.
    lobby_players = LobbyPlayerSerializer(source='players', many=True, read_only=True)
    gm_player_username = serializers.CharField(source='gm_player.username', read_only=True)

    class Meta:
        model = Lobby
        fields = [
            'lobby_id',
            'gm_player',
            'gm_player_username',
            'lobby_name',
            'is_active',
            'is_trade_area_ready',
            'is_battle_arena_ready',
            'created_at',
            'updated_at',
            'lobby_players'
        ]
        read_only_fields = ['lobby_id', 'gm_player', 'created_at', 'updated_at']
