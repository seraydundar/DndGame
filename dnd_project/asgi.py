import os
import django  # Django'nun setup() metodu için

# Django ayarlarının yüklenmesi
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dnd_project.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path, re_path

from accounts.consumers import FriendRequestConsumer, NotificationConsumer
from lobbies.consumers import LobbyConsumer
from game.consumers import BattleConsumer

# ASGI HTTP uygulaması
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    # HTTP için Django
    "http": django_asgi_app,
    # WS için Channels
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/friend/<int:user_id>/", FriendRequestConsumer.as_asgi()),
            path("ws/notification/<int:user_id>/", NotificationConsumer.as_asgi()),
            path("ws/lobby/<int:lobby_id>/", LobbyConsumer.as_asgi()),
            re_path(r"ws/battle/(?P<battle_id>\d+)/$", BattleConsumer.as_asgi()),
        ])
    ),
})