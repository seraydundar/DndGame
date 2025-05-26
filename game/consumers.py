# game/consumers.py

import os
import django
django.setup()

import random
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from game.models import Character

class BattleConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # URL routing: ws/battle/<battle_id>/
        # ASGI router’da battle_id diye geçiyor:
        self.lobby_id   = self.scope["url_route"]["kwargs"]["battle_id"]
        # view’de de group_send ile "battle_<lobby_id>" yayını yapılıyor
        self.group_name = f"battle_{self.lobby_id}"

        # Gruba katıl ve WebSocket’i kabul et
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Grubu temizle
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event = content.get("event")
        data  = content.get("data", {}) or {}

        # Eğer client’tan startBattle gelirse (opsiyonel)
        if event == "startBattle":
            placed_ids = data.get("character_ids", [])
            combatants = await database_sync_to_async(list)(
                Character.objects.filter(id__in=placed_ids)
            )

            # İnisiyatif hesapla
            turn_queue = []
            for c in combatants:
                roll = random.randint(1, 20) + getattr(c, "initiative_bonus", 0)
                turn_queue.append({
                    "id":         c.id,
                    "type":       "creature" if c.is_temporary else "player",
                    "initiative": roll
                })
            turn_queue.sort(key=lambda x: x["initiative"], reverse=True)

            # **Yayın** (view zaten broadcast ettiyse bu blok opsiyonel)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type":      "battle_start",
                    "event":     "battleStart",
                    "lobbyId":   self.lobby_id,
                    "turnQueue": turn_queue,
                }
            )
            return

        # Diğer tüm event’leri aynı gruba broadcast et
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": event,
                **data
            }
        )

    # group_send içindeki type="battle_start" burayı tetikler
    async def battle_start(self, event):
        await self.send_json({
            "event":     event["event"],
            "lobbyId":   event["lobbyId"],
            "turnQueue": event["turnQueue"],
        })

    async def battleUpdate(self, event):
        await self.send_json({"event": "battleUpdate", **event})

    async def battleEnd(self, event):
        await self.send_json({"event": "battleEnd", **event})

    async def joinLobby(self, event):
        await self.send_json({"event": "joinLobby", **event})
