# DndGame/spells/views.py

from rest_framework import viewsets, permissions, filters
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Spell
from .serializers import SpellSerializer

class SpellViewSet(viewsets.ModelViewSet):
    """
    /api/spells/ endpoint’i CRUD + listeleme + filtreleme sağlar.
    """
    queryset = Spell.objects.order_by('spell_level', 'name')
    serializer_class = SpellSerializer
    permission_classes = [permissions.AllowAny]

    # Dosya yükleme için:
    parser_classes = [MultiPartParser, FormParser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['spell_level', 'school']
    search_fields = ['name', 'classes']

    def perform_create(self, serializer):
        # Burada artık created_by atamasını bırakıyoruz,
        # Serializer.create() içinde kendisi halletsin:
        serializer.save()
