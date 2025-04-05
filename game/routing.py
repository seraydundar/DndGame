# game/routing.py
from django.urls import re_path
from accounts.consumers import FriendRequestConsumer, NotificationConsumer
from game.consumers import GameConsumer

websocket_urlpatterns = [
    re_path(r'^ws/friend/(?P<user_id>\d+)/$', FriendRequestConsumer.as_asgi()),
    re_path(r'^ws/notification/(?P<user_id>\d+)/$', NotificationConsumer.as_asgi()),
    re_path(r'^ws/lobby/(?P<lobby_id>\d+)/$', GameConsumer.as_asgi()),
]
