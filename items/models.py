from django.db import models

ITEM_TYPE_CHOICES = [
    ('Weapon', 'Weapon'),
    ('Armor', 'Armor'),
    ('Potion', 'Potion'),
    ('Accessory', 'Accessory'),
    ('Scroll', 'Scroll'),
    ('Misc', 'Miscellaneous'),
]

class Item(models.Model):
    item_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='Misc')
    rarity = models.CharField(max_length=50)
    attributes = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    icon_path = models.CharField(max_length=255, null=True, blank=True)
    gold_value = models.IntegerField(default=0)
    daily_spell_id = models.IntegerField(null=True, blank=True)
    daily_spell_used = models.BooleanField(default=False)
    effects = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'items'

    def __str__(self):
        return self.name
