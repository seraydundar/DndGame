# game/consumer.py
from channels.generic.websocket import JsonWebsocketConsumer

class GameConsumer(JsonWebsocketConsumer):
    def connect(self):
        self.accept()
        self.send_json({"message": "WebSocket connected."})

    def receive_json(self, content, **kwargs):
        # Gelen mesajları işle
        self.send_json({"echo": content})

    def disconnect(self, close_code):
        pass
