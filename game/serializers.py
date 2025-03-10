# game/serializers.py
from rest_framework import serializers
from .models import Character, Race, Class

class RaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Race
        fields = ['race_name', 'description', 'traits']

class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ['class_name', 'description', 'features']

class CharacterSerializer(serializers.ModelSerializer):
    # race ve character_class alanlarını nested gösterelim istersen
    race = serializers.SlugRelatedField(
        slug_field='race_name',
        queryset=Race.objects.all()
    )
    character_class = serializers.SlugRelatedField(
        slug_field='class_name',
        queryset=Class.objects.all()
    )

    class Meta:
        model = Character
        fields = [
            'id', 'player_id', 'lobby_id', 'name', 'race', 'character_class',
            'level', 'hp', 'strength', 'dexterity', 'constitution',
            'intelligence', 'wisdom', 'charisma', 'gold',
            'equipment', 'prepared_spells', 'class_features'
        ]
# game/serializers.py
from rest_framework import serializers
from .models import Character, Lobby, Race, Class

class LobbySerializer(serializers.ModelSerializer):
    class Meta:
        model = Lobby
        fields = '__all__'  # veya istediğin sütunları yazabilirsin
