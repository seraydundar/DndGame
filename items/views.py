from rest_framework import viewsets, permissions, filters
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.authentication import SessionAuthentication
from .authentication import CsrfExemptSessionAuthentication

from .models import Item
from .serializers import ItemSerializer
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail':'CSRF cookie set'})


class ItemViewSet(viewsets.ModelViewSet):
    
    permission_classes     = [permissions.AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]
    queryset         = Item.objects.order_by('item_type', 'rarity', 'name')
    serializer_class = ItemSerializer

    parser_classes   = [MultiPartParser, FormParser]
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['item_type', 'subtype', 'rarity', 'equip_slot']
    search_fields    = ['name']
