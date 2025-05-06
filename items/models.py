from django.db import models
from django.db.models import JSONField
from django.contrib.auth import get_user_model
from spells.models import Spell

class Item(models.Model):
    EQUIP_SLOTS = [
        ('HEAD',     'Head'),
        ('CHEST',    'Chest'),
        ('PANT',     'Pant'),
        ('BOOT',     'Boot'),
        ('NECKLACE', 'Necklace'),
        ('EARRING',  'Earring'),
        ('RING',     'Ring'),
        ('MAIN_HAND','Main Hand'),
        ('OFF_HAND', 'Off Hand'),
        ('INVENTORY','Inventory'),
    ]

    SUBTYPE_CHOICES = [
        # … aynı …
    ]
    ITEM_TYPES = [
        # … aynı …
    ]
    RARITY_CHOICES = [
        # … aynı …
    ]

    name             = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        null=True
    )
    description      = models.TextField(
        blank=True,
        null=True
    )
    icon             = models.ImageField(
        upload_to='item_icons/',
        blank=True,
        null=True
    )
    item_type        = models.CharField(
        max_length=20,
        choices=ITEM_TYPES,
        blank=True,
        null=True
    )
    subtype          = models.CharField(
        max_length=20,
        choices=SUBTYPE_CHOICES,
        blank=True,
        null=True
    )
    rarity           = models.CharField(
        max_length=20,
        choices=RARITY_CHOICES,
        blank=True,
        null=True
    )
    value            = models.PositiveIntegerField(
        default=0,
        blank=True,
        null=True
    )
    weight           = models.FloatField(
        default=0.0,
        blank=True,
        null=True
    )
    properties       = JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text='Item-specific stats/effects'
    )
    bonuses          = JSONField(
        default=list,
        blank=True,
        null=True,
        help_text='List of bonus effects'
    )
    damage_dice      = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="e.g. '2d6'"
    )
    damage_modifier  = models.IntegerField(
        default=0,
        blank=True,
        null=True,
        help_text='Numeric damage modifier'
    )
    ac_bonus         = models.IntegerField(
        default=0,
        blank=True,
        null=True,
        help_text='Armor Class bonus'
    )
    equip_slot       = models.CharField(
        max_length=20,
        choices=EQUIP_SLOTS,
        blank=True,
        null=True
    )
    two_handed       = models.BooleanField(
        default=False
    )
    spells           = models.ManyToManyField(
        Spell,
        blank=True,
        related_name='items',
        help_text='Spells granted when equipped'
    )
    created_by       = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f"Item {self.pk}"
