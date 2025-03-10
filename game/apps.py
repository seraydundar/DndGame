# game/apps.py

from django.apps import AppConfig

class GameConfig(AppConfig):
    default_auto_field = 'django.db.models.AutoField'  # veya BigAutoField
    name = 'game'
