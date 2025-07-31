import json
from rest_framework import serializers
from .models import Character, Race, Class as CharacterClass, CharacterTemplate
from spells.models import Spell
from spells.serializers import SpellSerializer
from items.models import Item
from items.serializers import ItemSerializer

class CharacterTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharacterTemplate
        fields = [
            'template_id', 'name', 'class_name', 'race', 'level', 'hp',
            'strength', 'dexterity', 'constitution', 'intelligence',
            'wisdom', 'charisma', 'equipment', 'spells', 'gold',
            'created_at', 'updated_at'
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
        model = CharacterClass
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

    # Core fields
    hp = serializers.IntegerField()
    max_hp = serializers.IntegerField()
    icon = serializers.ImageField(required=False, allow_null=True)
    inventory = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )

    # Equipment serializers
    head_armor = ItemSerializer(read_only=True)
    head_armor_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='head_armor',
        write_only=True,
        required=False,
        allow_null=True
    )
    chest_armor = ItemSerializer(read_only=True)
    chest_armor_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='chest_armor',
        write_only=True,
        required=False,
        allow_null=True
    )
    hand_armor = ItemSerializer(read_only=True)
    hand_armor_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='hand_armor',
        write_only=True,
        required=False,
        allow_null=True
    )
    legs_armor = ItemSerializer(read_only=True)
    legs_armor_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='legs_armor',
        write_only=True,
        required=False,
        allow_null=True
    )
    ring1 = ItemSerializer(read_only=True)
    ring1_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='ring1',
        write_only=True,
        required=False,
        allow_null=True
    )
    ring2 = ItemSerializer(read_only=True)
    ring2_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='ring2',
        write_only=True,
        required=False,
        allow_null=True
    )
    necklace = ItemSerializer(read_only=True)
    necklace_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='necklace',
        write_only=True,
        required=False,
        allow_null=True
    )
    ear1 = ItemSerializer(read_only=True)
    ear1_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='ear1',
        write_only=True,
        required=False,
        allow_null=True
    )
    ear2 = ItemSerializer(read_only=True)
    ear2_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='ear2',
        write_only=True,
        required=False,
        allow_null=True
    )
    melee_weapon = ItemSerializer(read_only=True)
    melee_weapon_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='melee_weapon',
        write_only=True,
        required=False,
        allow_null=True
    )
    ranged_weapon = ItemSerializer(read_only=True)
    ranged_weapon_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='ranged_weapon',
        write_only=True,
        required=False,
        allow_null=True
    )
    off_hand = ItemSerializer(read_only=True)
    off_hand_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='off_hand',
        write_only=True,
        required=False,
        allow_null=True
    )

    # ——— Yeni Alanlar: Geçici monster karakterleri için ———
    is_temporary = serializers.BooleanField(read_only=True)
    melee_dice   = serializers.CharField(required=False, allow_null=True)
    ranged_dice  = serializers.CharField(required=False, allow_null=True)
    # ——————————————————————————————————————————————

    prepared_spells = serializers.SerializerMethodField()
    prepared_spells_input = serializers.JSONField(
        write_only=True,
        required=False,
        default=list
    )
    class_features = serializers.JSONField(required=False)

    def get_prepared_spells(self, obj):
        spells = obj.prepared_spells or []
        if isinstance(spells, str):
            spells = json.loads(spells)
        spell_ids = [s.get("id") for s in spells
                     if isinstance(s, dict) and s.get("id") is not None]
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
        
        # Track constitution before applying updates
        old_constitution = instance.constitution

        instance = super().update(instance, validated_data)

        # Apply prepared spells if provided
        instance = super().update(instance, validated_data)
        if spells is not None:
            instance.prepared_spells = spells
            
        # If constitution increased, give bonus HP (5 per point)
        new_constitution = instance.constitution
        if new_constitution > old_constitution:
            bonus = (new_constitution - old_constitution) * 5
            instance.max_hp += bonus
            instance.hp += bonus

        instance.save()
        return instance

    class Meta:
        model = Character
        fields = [
            'id', 'player_id', 'lobby_id', 'name', 'race', 'character_class',
            'level', 'hp', 'max_hp', 'icon',
            'strength', 'dexterity', 'constitution', 'intelligence',
            'wisdom', 'charisma', 'ac', 'xp', 'gold', 'inventory',
            'action_points', 'max_action_points',
            'head_armor', 'head_armor_id',
            'chest_armor', 'chest_armor_id',
            'hand_armor', 'hand_armor_id',
            'legs_armor', 'legs_armor_id',
            'ring1', 'ring1_id',
            'ring2', 'ring2_id',
            'necklace', 'necklace_id',
            'ear1', 'ear1_id',
            'ear2', 'ear2_id',
            'melee_weapon', 'melee_weapon_id',
            'ranged_weapon', 'ranged_weapon_id',
            'off_hand', 'off_hand_id',
            # ——— Yeni Alanlar ———
            'is_temporary', 'melee_dice', 'ranged_dice',
            # ——————————————————
            'prepared_spells', 'prepared_spells_input', 'class_features'
        ]
        read_only_fields = ['prepared_spells', 'is_temporary',
                           'action_points', 'max_action_points']
