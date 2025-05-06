# creature/views.py

from rest_framework import viewsets, parsers, filters
from rest_framework.permissions import AllowAny
from .models import Creature
from .serializers import CreatureSerializer

class CreatureViewSet(viewsets.ModelViewSet):
    """
    Artık hiçbir authentication sınıfı yok,
    ve tüm permission’lar AllowAny.
    """
    authentication_classes = []            # ← Oturumu tamamen iptal ettik
    permission_classes     = [AllowAny]    # ← Herkese açık

    queryset         = Creature.objects.all()
    serializer_class = CreatureSerializer

    parser_classes   = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['name', 'tags']
    ordering_fields  = ['challenge_rating', 'name']
