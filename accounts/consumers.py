# accounts/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class FriendRequestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.group_name = f"friend_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({
            "type": "friend_request",
            "message": "Friend WebSocket connected",
            "friend_request_id": None
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get("type") == "ping":
            await self.send(json.dumps({"type": "pong"}))
            return
        if data.get("type") == "friend_response":
            await self.send(text_data=json.dumps({
                "type": "friend_response",
                "friend_request_id": data.get("friend_request_id"),
                "status": data.get("status"),
                "message": f"İstek {data.get('status')} olarak yanıtlandı."
            }))
        else:
            # Diğer mesajları işleyin
            await self.send(text_data=json.dumps({"echo": data}))

    async def friend_request_message(self, event):
        await self.send(text_data=json.dumps(event))


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.group_name = f"notification_{self.user_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send(json.dumps({
            "type": "notification",
            "message": "Notification WebSocket connected"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get("type") == "ping":
            await self.send(json.dumps({"type": "pong"}))
            return
    

    async def notification_message(self, event):
        await self.send(json.dumps(event))
