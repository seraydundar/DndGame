from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CharacterViewSet,
    RaceListView,
    ClassListView,
    CharacterTemplateListView,
    InitiateCombatView,
    MeleeAttackView,
    EndTurnView,
    RangedAttackView,
    BattleStateView,
    MoveCharacterView
)

router = DefaultRouter()
router.register(r'characters', CharacterViewSet, basename='characters')

urlpatterns = [
    path('', include(router.urls)),
    path('races/', RaceListView.as_view(), name='races-list'),
    path('classes/', ClassListView.as_view(), name='classes-list'),
    path('character-templates/', CharacterTemplateListView.as_view(), name='character_templates'),
    # Combat endpoint'leri:
    path('combat/initiate/', InitiateCombatView.as_view(), name='initiate-combat'),
    path('combat/melee-attack/', MeleeAttackView.as_view(), name='melee-attack'),
    path('combat/ranged-attack/', RangedAttackView.as_view(), name='ranged-attack'),
    path('combat/end-turn/', EndTurnView.as_view(), name='end-turn'),
    path('combat/move/', MoveCharacterView.as_view(), name='combat-move'),
    
    # Battle state endpoint
    path('battle-state/<int:lobby_id>/', BattleStateView.as_view(), name='battle-state'),
]
