# items/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ItemViewSet
from .views import get_csrf_token


router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')

urlpatterns = [
    path('', include(router.urls)),
    path('api/csrf/', get_csrf_token)
]
