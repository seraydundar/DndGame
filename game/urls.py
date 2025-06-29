from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CharacterViewSet, RaceListView, ClassListView,
    CharacterTemplateListView, InitiateCombatView,
    MeleeAttackView, RangedAttackView, EndTurnView,
    MoveCharacterView, BattleStateView, LobbyViewSet,EndBattleView, BattleSummaryView
)
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def get_csrf(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

router = DefaultRouter()
router.register(r'lobbies', LobbyViewSet, basename='lobby')
router.register(r'characters', CharacterViewSet, basename='character')

urlpatterns = [
    # DRF router’ları: /api/lobbies/, /api/characters/
    path('', include(router.urls)),

    # Manuel nested route: /api/lobbies/<lobby_pk>/characters/
    path(
        'lobbies/<int:lobby_pk>/characters/',
        CharacterViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='lobby-characters'
    ),

    # CSRF endpoint: /api/get_csrf/
    path('get_csrf/', get_csrf, name='get-csrf'),

    # Listeleme: /api/races/, /api/classes/, /api/character-templates/
    path('races/', RaceListView.as_view(), name='races-list'),
    path('classes/', ClassListView.as_view(), name='classes-list'),
    path('character-templates/', CharacterTemplateListView.as_view(), name='character-templates'),

    # Combat endpoint’leri: /api/combat/…
    path('combat/initiate/', InitiateCombatView.as_view(), name='initiate-combat'),
    path('combat/melee-attack/', MeleeAttackView.as_view(), name='melee-attack'),
    path('combat/ranged-attack/', RangedAttackView.as_view(), name='ranged-attack'),
    path('combat/end-turn/', EndTurnView.as_view(), name='end-turn'),
    path('combat/move/', MoveCharacterView.as_view(), name='combat-move'),

    # Battle state: /api/battle-state/<lobby_id>/
    path('battle-state/<int:lobby_id>/', BattleStateView.as_view(), name='battle-state'),
    path('combat/end-battle/', EndBattleView.as_view(), name='combat-end'),
    path('battle-state/<int:lobby_id>/end/', BattleSummaryView.as_view(),
         name='battle-summary'),
]
