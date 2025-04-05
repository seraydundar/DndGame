# game/serializers.py

from rest_framework import serializers
from .models import Character, Race, Class, CharacterTemplate

class CharacterTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharacterTemplate
        fields = [
            'template_id',
            'name',
            'class_name',  # veritabanında "class" sütunu olarak saklanır
            'race',
            'level',
            'hp',
            'strength',
            'dexterity',
            'constitution',
            'intelligence',
            'wisdom',
            'charisma',
            'equipment',
            'spells',
            'gold',
            'created_at',
            'updated_at'
        ]
    
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['class'] = rep.pop('class_name')
        return rep

class RaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Race
        fields = ['race_name', 'description', 'traits']

class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ['class_name', 'description', 'features']

class CharacterSerializer(serializers.ModelSerializer):
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
