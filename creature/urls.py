# creature/urls.py

from rest_framework.routers import DefaultRouter
from .views import CreatureViewSet

router = DefaultRouter()                             
router.register(r'creatures', CreatureViewSet, basename='creature')

urlpatterns = router.urls
