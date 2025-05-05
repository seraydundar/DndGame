from channels.generic.websocket import AsyncJsonWebsocketConsumer

class BattleConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.lobby_id = self.scope["url_route"]["kwargs"]["battle_id"]
        self.group_name = f"battle_{self.lobby_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("event")
        if not event_type:
            return

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": event_type,
                "data": content
            }
        )

    async def battleStart(self, event):
        await self.send_json(event["data"])

    async def battleUpdate(self, event):
        await self.send_json(event["data"])

    async def battleEnd(self, event):
        await self.send_json(event["data"])

    async def joinLobby(self, event):
        await self.send_json(event["data"])