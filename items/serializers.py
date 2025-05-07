from rest_framework import serializers
from .models import Item
from spells.models import Spell

class ItemSerializer(serializers.ModelSerializer):
    name             = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description      = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    icon             = serializers.ImageField(required=False, allow_null=True)
    item_type        = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    subtype          = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    rarity           = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    value            = serializers.IntegerField(required=False, allow_null=True)
    weight           = serializers.FloatField(required=False, allow_null=True)
    properties       = serializers.JSONField(required=False, allow_null=True)
    bonuses = serializers.JSONField(
        required=False,
        allow_null=True,
        default=list,
        help_text="List of bonus objects { stat, type, value }"
    )
    damage_dice      = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    damage_modifier  = serializers.IntegerField(required=False, allow_null=True)
    ac_bonus         = serializers.IntegerField(required=False, allow_null=True)
    equip_slot       = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    two_handed       = serializers.BooleanField(required=False)
    spells           = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Spell.objects.all(),
        required=False,
        allow_null=True,
        default=list
    )

    class Meta:
        model  = Item
        fields = '__all__'

    def create(self, validated_data):
        spells_data = validated_data.pop('spells', [])
        user = self.context['request'].user
        if user and user.is_authenticated:
            validated_data['created_by'] = user
        item = super().create(validated_data)
        if spells_data:
            item.spells.set(spells_data)
        return item

    def update(self, instance, validated_data):
        spells_data = validated_data.pop('spells', None)
        item = super().update(instance, validated_data)
        if spells_data is not None:
            item.spells.set(spells_data)
        return item
