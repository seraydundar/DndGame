from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from .models import Item
from .serializers import ItemSerializer

# CSRF kontrolünü devre dışı bırakmak için özel authentication sınıfı
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

class ItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ItemSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Item.objects.all()
        rarity = self.request.query_params.get('rarity', None)
        name_filter = self.request.query_params.get('name__icontains', None)
        if rarity:
            qs = qs.filter(rarity=rarity)
        if name_filter:
            qs = qs.filter(name__icontains=name_filter)
        return qs
