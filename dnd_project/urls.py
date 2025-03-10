from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.contrib import admin
from game.views import CharacterViewSet, LobbyViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,)

router = DefaultRouter()
router.register(r'characters', CharacterViewSet)
router.register(r'lobbies', LobbyViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),                      # Admin paneli için
    path('api/accounts/', include('accounts.urls')),       # Accounts uygulaması için
    path('api/', include('game.urls')),                    # Game uygulaması için
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),                        # Router tarafından tanımlanan rotalar
]
