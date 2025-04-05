from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.contrib import admin
from game.views import CharacterViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'characters', CharacterViewSet, basename='characters')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),   # Accounts API
    path('api/', include('game.urls')),            # Game API
    path('api/lobbies/', include('lobbies.urls')),        # Lobbies API – düzeltildi
    path('api/items/', include('items.urls')),            # Items API
    path('api/', include('spells.urls')),          # Spells API
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),                      # DRF Routerları
]
