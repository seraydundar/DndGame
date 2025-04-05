import json
from channels.generic.websocket import JsonWebsocketConsumer

class GameConsumer(JsonWebsocketConsumer):
    def connect(self):
        # Örneğin, URL route'dan lobby_id'yi alabiliriz.
        # Eğer URL route'da lobby_id tanımlı değilse, query string'den de alabilirsiniz.
        self.lobby_id = self.scope['url_route']['kwargs'].get('lobby_id', 'default')
        self.group_name = f"lobby_{self.lobby_id}"
        # Belirlenen gruba katıl
        self.channel_layer.group_add(self.group_name, self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        # Grubu terk et
        self.channel_layer.group_discard(self.group_name, self.channel_name)

    def receive_json(self, content, **kwargs):
        # Gelen mesajı aynı gruptaki tüm bağlantılara gönder
        self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'game_message',
                'message': content,
            }
        )

    def game_message(self, event):
        message = event['message']
        self.send_json(message)
