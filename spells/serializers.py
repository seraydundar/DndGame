# DndGame/spells/serializers.py

from rest_framework import serializers
from .models import Spell

class SpellSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.username')
    icon       = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Spell
        fields = [
            'id',
            'name',
            'description',
            'icon',
            'spell_level',
            'school',
            'classes',
            'created_by',
            'casting_time',
            'range',
            'components',
            'material_detail',
            'duration',
            'concentration',
            'ritual',
            'effect',
            'created_at',
            'updated_at',
        ]

    def validate_effect(self, value):
        # Temel kontrol: 'type' ve dice alanları mutlaka olmalı
        if 'type' not in value:
            raise serializers.ValidationError("Effect JSON must include a 'type' field.")
        dice = value.get('dice')
        if not dice or any(k not in dice for k in ('num', 'size', 'modifier')):
            raise serializers.ValidationError(
                "Effect.dice must have 'num', 'size' and 'modifier'."
            )
        return value

    def create(self, validated_data):
        # Eğer kullanıcı authenticated ise created_by ataması yap,
        # aksi halde anonymous olarak bırak.
        user = self.context['request'].user
        if hasattr(user, 'is_authenticated') and user.is_authenticated:
            validated_data['created_by'] = user
        return super().create(validated_data)
