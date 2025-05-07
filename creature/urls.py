# creature/urls.py
from rest_framework.routers import DefaultRouter
from .views import CreatureViewSet

router = DefaultRouter()
# '' yani boş prefix; include edildiğinde path prefix’iyle birleşecek
router.register(r'', CreatureViewSet, basename='creature')

urlpatterns = router.urls
