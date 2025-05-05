# DndGame/spells/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpellViewSet, SpellCastView

router = DefaultRouter()
router.register(r'spells', SpellViewSet, basename='spell')

urlpatterns = [
    # Spell CRUD & listeleme
    path('', include(router.urls)),
    # Generic cast endpoint
    path('spells/<int:spell_id>/cast/', SpellCastView.as_view(), name='spell-cast'),
]
