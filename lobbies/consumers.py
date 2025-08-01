import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .models import LobbyPlayer

class LobbyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.lobby_id = int(self.scope['url_route']['kwargs']['lobby_id'])
        self.group_name = f"lobby_{self.lobby_id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

        user = self.scope.get("user")
        if user and user.is_authenticated:
            await self.set_player_unready(user.id)

    @database_sync_to_async
    def set_player_unready(self, user_id: int):
        LobbyPlayer.objects.filter(
            lobby_id=self.lobby_id,
            player_id=user_id
        ).update(is_ready=False)


    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("type") == "ping":
            await self.send(json.dumps({"type": "pong"}))
            return
        event = data.get("event")
        if event == "startGame":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "game_started",
                    "message": "Oyun başladı"
                }
            )
        elif event == "redirect":
            target = data.get("target")
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "redirect",
                    "target": target
                }
            )
        elif event == "battleStart":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "battle_started",
                    "lobbyId": data.get("lobbyId"),
                    "placements": data.get("placements"),
                    "availableCharacters": data.get("availableCharacters"),
                    "message": "Battle started"
                }
            )
        elif event == "battleUpdate":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "battle_update",
                    "lobbyId": data.get("lobbyId"),
                    "placements": data.get("placements"),
                    "availableCharacters": data.get("availableCharacters")
                }
            )
        elif event == "diceRoll":
            import random
            result = random.randint(1, 20)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "dice_roll",
                    "playerId": data.get("playerId"),
                    "result": result,
                }
            )
        elif event == "diceRollRequest":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "dice_roll_request", "playerId": data.get("playerId")}
            )    
            

    async def game_started(self, event):
        await self.send(text_data=json.dumps({
            "event": "gameStarted",
            "message": event["message"]
        }))

    async def redirect(self, event):
        await self.send(text_data=json.dumps({
            "event": "redirect",
            "target": event["target"]
        }))

    async def battle_started(self, event):
        await self.send(text_data=json.dumps({
            "event": "battleStart",
            "lobbyId": event.get("lobbyId"),
            "placements": event.get("placements"),
            "availableCharacters": event.get("availableCharacters"),
            "message": event.get("message")
        }))

    async def battle_update(self, event):
        await self.send(text_data=json.dumps({
            "event": "battleUpdate",
            "lobbyId": event.get("lobbyId"),
            "placements": event.get("placements"),
            "availableCharacters": event.get("availableCharacters")
        }))

    async def dice_roll_request(self, event):
        await self.send(text_data=json.dumps({
            "event": "diceRollRequest",
            "playerId": event.get("playerId")
        }))

    async def dice_roll(self, event):
        await self.send(text_data=json.dumps({
            "event": "diceRoll",
            "playerId": event.get("playerId"),
            "result": event.get("result")
         }))

    async def character_update(self, event):
        await self.send(text_data=json.dumps({
            "event": "characterUpdate",
            "character": event.get("character")
        }))