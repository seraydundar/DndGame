# game/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CharacterViewSet, LobbyViewSet,RaceListView,ClassListView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,)

router = DefaultRouter()
router.register(r'characters', CharacterViewSet)
router.register(r'lobbies', LobbyViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('races/', RaceListView.as_view(), name='races-list'),
    path('classes/', ClassListView.as_view(), name='classes-list'),
]
