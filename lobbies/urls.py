from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LobbyViewSet, CreateLobbyView

router = DefaultRouter()
router.register(r'', LobbyViewSet, basename='lobby')

urlpatterns = [
    path('create/', CreateLobbyView.as_view(), name='lobby-create'),
    path('', include(router.urls)),
]
