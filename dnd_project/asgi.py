import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path, re_path
from accounts.consumers import FriendRequestConsumer, NotificationConsumer
from lobbies.consumers import LobbyConsumer
from game.consumers import BattleConsumer  # GameConsumer import edilmeli

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dnd_project.settings')
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/friend/<int:user_id>/", FriendRequestConsumer.as_asgi()),
            path("ws/notification/<int:user_id>/", NotificationConsumer.as_asgi()),
            path("ws/lobby/<int:lobby_id>/", LobbyConsumer.as_asgi()),
            re_path(r"ws/battle/(?P<battle_id>\d+)/$", BattleConsumer.as_asgi()),  # <- Bu satırı ekle
        ])
    ),
})
