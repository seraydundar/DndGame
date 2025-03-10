# game/admin.py
from django.contrib import admin
from .models import Race, Class, Character

@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    list_display = ('race_name', 'description')

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ('class_name', 'description')

@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'race', 'character_class', 'level', 'hp', 'gold')
