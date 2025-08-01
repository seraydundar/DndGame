# game/consumers.py
import os, django, random
django.setup()

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from game.models import Character


class BattleConsumer(AsyncJsonWebsocketConsumer):
    # ------------- connection lifecycle ---------------- #
    async def connect(self):
        # ws://…/ws/battle/<battle_id>/
        self.lobby_id   = self.scope["url_route"]["kwargs"]["battle_id"]
        self.group_name = f"battle_{self.lobby_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ------------- incoming from THIS client ------------ #
    async def receive_json(self, content, **kwargs):
        """
        İstemciden gelen tüm mesajları ‘event’ alanına göre
        aynı gruba tekrar yayınlıyoruz.
        """
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})
            return
        event = content.get("event")      # örn: "startBattle", "battleUpdate"
        data  = content.get("data", {}) or {}

        if event == "startBattle":
            # GM manuel başlattıysa inisiyatif hesapla (opsiyonel)
            await self._initiate_battle_queue(data)
            return
        
        if event == "diceRoll":
            result = random.randint(1, 20)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "dice_roll",
                    "playerId": data.get("playerId"),
                    "result": result,
                }
            )
            return

        if event == "diceRollRequest":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "dice_roll_request", "playerId": data.get("playerId")}
            )
            return


        # Diğer her şeyi odadaki herkese ilet
        # NOTE: type key’i Channels’ta handler adını belirler
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": self._to_snake(event),  # battleUpdate → battle_update
                **data
            }
        )

    # ------------- helper: initiative ------------------ #
    async def _initiate_battle_queue(self, data):
        placed_ids = data.get("character_ids", [])
        combatants = await database_sync_to_async(list)(
            Character.objects.filter(id__in=placed_ids)
        )

        queue = []
        for c in combatants:
            roll = random.randint(1, 20) + getattr(c, "initiative_bonus", 0)
            queue.append({
                "id":         c.id,
                "type":       "creature" if c.is_temporary else "player",
                "initiative": roll
            })
        queue.sort(key=lambda x: x["initiative"], reverse=True)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":    "battle_start",
                "event":   "battleStart",
                "lobbyId": self.lobby_id,
                "turnQueue": queue,
            }
        )

    # ------------- helpers ------------------------------ #
    @staticmethod
    def _to_snake(name: str) -> str:
        """battleUpdate → battle_update  |  battle_end (değişimsiz)."""
        return (
            "".join(f"_{c.lower()}" if c.isupper() else c for c in name)
            .lstrip("_")
        )

    # ------------- handlers fired by group_send ---------- #
    async def battle_start(self, event):
        await self.send_json({
            "event":     "battleStart",
            "lobbyId":   event.get("lobbyId"),
            "turnQueue": event.get("turnQueue"),
            "background": event.get("background"),
        })
     #    -> Frontend’de handleBattleUpdate zaten chatLog’u bu objeyle overwrite ediyor
        await self.send_json({
            "event":   "battleUpdate",
            "lobbyId": self.lobby_id,
            "chatLog": [],          # eski satırlar silinsin
            "logEvents": [],        # varsa event-timeline da sıfırlansın
        })    

    async def battle_update(self, event):
        # Hem server‐side “battle.update” hem client “battleUpdate” buraya düşer
        await self.send_json({
            "event":   "battleUpdate",
            **{k: v for k, v in event.items() if k != "type"},
        })

    async def battle_end(self, event):
        await self.send_json({
            "event":   "battleEnd",
            "lobbyId": self.lobby_id,
            "summary": event.get("summary"),
        })

    # camelCase versiyonları da (eski kod kırılmasın diye)
    async def battleUpdate(self, event):   # noqa: N802  (mixedCase handler)
        await self.battle_update(event)

    async def battleEnd(self, event):      # noqa: N802
        await self.battle_end(event)

    async def joinLobby(self, event):
        await self.send_json({"event": "joinLobby", **event})




    async def dice_roll_request(self, event):
        await self.send_json({
            "event": "diceRollRequest",
            "playerId": event.get("playerId"),
        })

    async def dice_roll(self, event):
        await self.send_json({
            "event": "diceRoll",
            "playerId": event.get("playerId"),
            "result": event.get("result"),
        })

    async def character_update(self, event):
        await self.send_json({
            "event": "characterUpdate",
            "character": event.get("character"),
        })
        