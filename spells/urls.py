# DndGame/spells/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpellViewSet

router = DefaultRouter()
router.register(r'spells', SpellViewSet, basename='spell')

urlpatterns = [
    path('', include(router.urls)),  # boş string olmalı, başında boşluk yok
]
