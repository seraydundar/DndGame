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
            # Yeni alanlar
            'effect_type',
            'scope',
            'damage_type',
            'dice_num',
            'dice_size',
            'dice_modifier',
            # Zaman damgaları
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        # damage type kontrolü
        effect_type = attrs.get(
            'effect_type',
            self.instance.effect_type if self.instance else None
        )
        damage_type = attrs.get(
            'damage_type',
            self.instance.damage_type if self.instance else None
        )
        if effect_type == 'damage' and not damage_type:
            raise serializers.ValidationError({
                'damage_type': "Hasar büyüleri için damage_type zorunlu."
            })
        if effect_type != 'damage' and damage_type:
            raise serializers.ValidationError({
                'damage_type': "Sadece hasar büyüleri için damage_type tanımlanabilir."
            })
        return super().validate(attrs)

    def create(self, validated_data):
        user = self.context['request'].user
        if hasattr(user, 'is_authenticated') and user.is_authenticated:
            validated_data['created_by'] = user
        return super().create(validated_data)
