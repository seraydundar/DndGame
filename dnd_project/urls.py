# DndGame/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from game.views import CharacterViewSet
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def get_csrf(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

router = DefaultRouter()
router.register(r'characters', CharacterViewSet, basename='characters')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),     # Accounts API
    path('api/csrf/', get_csrf),
    path('api/', include('game.urls')),                  # Game API
    path('api/lobbies/', include('lobbies.urls')),       # Lobbies API
    path('api/items/', include('items.urls')),           # Items API
    path('api/', include('spells.urls')),                # Spells API
    path('api/creatures/', include('creature.urls')),    # Creatures API
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),                      # DRF Routers
]

# Media files (spell icon uploads) will be served during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
