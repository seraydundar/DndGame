# game/views.py

from rest_framework import viewsets, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.cache import cache

from .models import Character, Lobby, Race, Class
from .serializers import (
    CharacterSerializer,
    LobbySerializer,
    RaceSerializer,
    ClassSerializer
)

# RACE LİST
class RaceListView(generics.ListAPIView):
    queryset = Race.objects.all()
    serializer_class = RaceSerializer


# CLASS LİST
class ClassListView(generics.ListAPIView):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer


# CHARACTER
class CharacterViewSet(viewsets.ModelViewSet):
    queryset = Character.objects.all()
    serializer_class = CharacterSerializer

    def perform_create(self, serializer):
        """
        Yeni karakter oluşturulurken, seçilen class'a ait features
        otomatik olarak 'class_features' kolonuna kopyalanabilir.
        Irk traits'e göre stat buff mekanikleri istersen,
        benzer mantıkla buraya ekleyebilirsin.
        """
        instance = serializer.save()
        if instance.character_class:
            instance.class_features = instance.character_class.features
            instance.save()

    def perform_update(self, serializer):
        """
        Karakter güncellenirken de (örn. class değişimi),
        'class_features' kolonunu yeniden doldurabiliriz.
        """
        instance = serializer.save()
        if instance.character_class:
            instance.class_features = instance.character_class.features
            instance.save()


# LOBBY
class LobbyViewSet(viewsets.ModelViewSet):
    queryset = Lobby.objects.all()
    serializer_class = LobbySerializer


# ÖRNEK CACHE GÖSTERİMİ
class CachedDataView(APIView):
    def get(self, request, format=None):
        data = cache.get('some_data')
        if not data:
            data = {"message": "This is cached data."}
            cache.set('some_data', data, 60)  # 60 saniye boyunca cache'le
        return Response(data)
