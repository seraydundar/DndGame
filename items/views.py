from rest_framework import viewsets, permissions, filters
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.authentication import SessionAuthentication

from .models import Item
from .serializers import ItemSerializer

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # CSRF’yi atla

class ItemViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes     = [permissions.AllowAny]

    queryset         = Item.objects.order_by('item_type', 'rarity', 'name')
    serializer_class = ItemSerializer

    parser_classes   = [MultiPartParser, FormParser]
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['item_type', 'subtype', 'rarity', 'equip_slot']
    search_fields    = ['name']
