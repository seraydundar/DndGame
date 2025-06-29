# creature/serializers.py
from rest_framework import serializers
from .models import Creature
from spells.models import Spell

class CreatureSerializer(serializers.ModelSerializer):
    # spells ve icon zaten optional olsun:
    spells = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Spell.objects.all(),
        required=False
    )
    icon = serializers.ImageField(
        required=False,
        allow_null=True
    )

    class Meta:
        model = Creature
        # istersen tüm alanları list yerine '__all__' ile al
        fields = [
            'id', 'name', 'description', 'icon',
            'hit_points', 'armor_class', 'challenge_rating',
            'tags', 'spells',
            'melee_attack_dice', 'ranged_attack_dice',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_by', 'created_at', 'updated_at')
        extra_kwargs = {
            # tüm alanları optional yapmak için:
            'name':                 {'required': False, 'allow_null': True},
            'description':          {'required': False, 'allow_null': True},
            'hit_points':           {'required': False, 'allow_null': True},
            'armor_class':          {'required': False, 'allow_null': True},
            'challenge_rating':     {'required': False, 'allow_null': True},
            'tags':                 {'required': False, 'allow_null': True},
            'melee_attack_dice':    {'required': False, 'allow_null': True},
            'ranged_attack_dice':   {'required': False, 'allow_null': True},
            'created_by':           {'required': False, 'allow_null': True},
            'created_at':           {'required': False, 'allow_null': True},
            'damage_dealt   ':      {'required': False, 'allow_null': True},
            'damage_taken':         {'required': False, 'allow_null': True},
            'healing_done':         {'required': False, 'allow_null': True},
            'kills':                {'required': False, 'allow_null': True},
            
            # spells ve icon zaten üstte ayarlandı
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # kesin emin olmak için bir de runtime’da zorunlulukları kaldır:
        for field in self.fields.values():
            field.required = False
            # eğer allow_null özelliği varsa True yap
            if hasattr(field, 'allow_null'):
                field.allow_null = True

    def create(self, validated_data):
        spells = validated_data.pop('spells', [])
        user = self.context['request'].user

        # Eğer user anonim ise created_by atama, aksi halde kullanıcıyı kullan
        if user and not user.is_anonymous:
            creature = Creature.objects.create(created_by=user, **validated_data)
        else:
            creature = Creature.objects.create(**validated_data)

        creature.spells.set(spells)
        return creature

    def update(self, instance, validated_data):
        spells = validated_data.pop('spells', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if spells is not None:
            instance.spells.set(spells)
        return instance
