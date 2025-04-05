from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Örneğin, ws://localhost:5000/ws/lobby/123/ şeklinde lobi id'yi URL'den alabilirsiniz.
    re_path(r'ws/lobby/(?P<lobby_id>\w+)/$', consumers.LobbyConsumer.as_asgi()),
]
