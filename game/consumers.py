# game/consumers.py

import os
import django  # settings’i yüklemek için

django.setup()

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
import random

from game.models     import Character
from creature.models import Creature

class BattleConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # URL’den lobby/battle ID'sini al
        self.lobby_id   = self.scope["url_route"]["kwargs"]["battle_id"]
        self.group_name = f"battle_{self.lobby_id}"

        # Gruba katıl ve WebSocket'i kabul et
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Bağlantı kopunca gruptan çıkar
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event = content.get("event")
        data  = content.get("data", {})
        if not event:
            return

        # GM tarafından startBattle tetiklendiğinde
        if event == "startBattle":
            # Frontend'den gelen sadece grid’e yerleştirilmiş karakter ID’leri
            placed_ids = data.get("character_ids", [])

            # Veritabanından bu ID’lere sahip karakterleri ve tüm yaratıkları çek
            players = await database_sync_to_async(list)(
                Character.objects.filter(id__in=placed_ids)
            )
            creatures = await database_sync_to_async(list)(
                Creature.objects.filter(lobby_id=self.lobby_id)
            )

            # İnisiyatif sıralaması oluştur
            turn_queue = []
            for p in players:
                roll = random.randint(1,20) + getattr(p, "initiative_bonus", 0)
                turn_queue.append({"id": p.id, "type": "player",   "initiative": roll})
            for c in creatures:
                roll = random.randint(1,20) + c.initiative_bonus
                turn_queue.append({"id": c.id, "type": "creature", "initiative": roll})

            # Yüksek inisiyatife göre sırala
            turn_queue.sort(key=lambda x: x["initiative"], reverse=True)

            # Tüm katılımcılara battleStart event'i yayınla
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "battle.start",    # handler metodu battle_start
                    "event": "battleStart",
                    "players":    [p.to_dict() for p in players],
                    "creatures":  [c.to_dict() for c in creatures],
                    "turnQueue":  turn_queue,
                }
            )
            return

        # Diğer tüm event'leri gruba broadcast et
        await self.channel_layer.group_send(
            self.group_name,
            {"type": event, **data}
        )

    # Handler, group_send 'type' alanına göre çağrılır
    async def battle_start(self, event):
        # Frontend'e event adıyla birlikte JSON gönder
        await self.send_json({
            "event":     event["event"],
            "players":   event["players"],
            "creatures": event["creatures"],
            "turnQueue": event["turnQueue"],
        })

    async def battleUpdate(self, event):
        await self.send_json({"event": "battleUpdate", **event})

    async def battleEnd(self, event):
        await self.send_json({"event": "battleEnd", **event})

    async def joinLobby(self, event):
        await self.send_json({"event": "joinLobby", **event})
