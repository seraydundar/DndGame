# lobbies/models.py
from django.db import models
from django.conf import settings

class Lobby(models.Model):
    lobby_id = models.AutoField(primary_key=True)
    gm_player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='gm_player_id'
    )
    lobby_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_trade_area_ready = models.BooleanField(default=False)
    is_battle_arena_ready = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lobbies'

    def __str__(self):
        return f"{self.lobby_name} (GM: {self.gm_player})"


class LobbyPlayer(models.Model):
    """
    Belirli bir lobide hangi oyuncular var, 
    oyuncu 'is_ready' mi gibi bilgileri tutar.
    """
    lobby = models.ForeignKey(Lobby, on_delete=models.CASCADE, related_name="players")
    player = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_ready = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lobby_players'
        unique_together = ('lobby', 'player')

    def __str__(self):
        return f"Lobby: {self.lobby.lobby_name} - Player: {self.player} (Ready: {self.is_ready})"
