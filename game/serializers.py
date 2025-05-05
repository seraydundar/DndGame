# game/serializers.py

import json
from rest_framework import serializers
from .models import Character, Race, Class as CharacterClass, CharacterTemplate, Class
from spells.models import Spell
from spells.serializers import SpellSerializer

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
        queryset=CharacterClass.objects.all()
    )

    # 1) Okuma için nested serializer'ı tutarız
    prepared_spells = serializers.SerializerMethodField()
    # 2) Yazma için JSONField
    prepared_spells_input = serializers.JSONField(
        write_only=True,
        required=False,
        default=list
    )

    def get_prepared_spells(self, obj):
        spells = obj.prepared_spells or []
        if isinstance(spells, str):
            spells = json.loads(spells)
        spell_ids = [s.get("id") for s in spells if isinstance(s, dict) and s.get("id") is not None]
        qs = Spell.objects.filter(id__in=spell_ids)
        return SpellSerializer(qs, many=True).data

    def create(self, validated_data):
        spells = validated_data.pop('prepared_spells_input', [])
        instance = super().create(validated_data)
        instance.prepared_spells = spells
        instance.save()
        return instance

    def update(self, instance, validated_data):
        spells = validated_data.pop('prepared_spells_input', None)
        instance = super().update(instance, validated_data)
        if spells is not None:
            instance.prepared_spells = spells
            instance.save()
        return instance

    class Meta:
        model = Character
        fields = [
            'id', 'player_id', 'lobby_id', 'name',
            'race', 'character_class',
            'level', 'hp',
            'strength', 'dexterity', 'constitution',
            'intelligence', 'wisdom', 'charisma',
            'gold', 'equipment',
            # Okuma ve yazma alanlarını ayrı tuttuk:
            'prepared_spells',         # read-only nested list of SpellSerializer
            'prepared_spells_input',   # write-only raw list of {id: ...}
            'class_features'
        ]
        read_only_fields = ['prepared_spells']

