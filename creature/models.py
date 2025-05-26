from django.db import models
from django.contrib.auth import get_user_model
from spells.models import Spell

class Creature(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    icon = models.ImageField(
        upload_to='creatures/icons/',
        blank=True,
        null=True
    )
    hit_points = models.IntegerField(blank=True, null=True)
    armor_class = models.IntegerField(blank=True, null=True)
    challenge_rating = models.FloatField(blank=True, null=True)
        # ——————————————————————————————————————
    # Inisiyatif ve ızgara konumu
    initiative_bonus = models.IntegerField(default=0)
    grid_x = models.IntegerField(default=0)
    grid_y = models.IntegerField(default=0)
    # ——————————————————————————————————————
    tags = models.JSONField(default=list, blank=True, null=True)
    spells = models.ManyToManyField(
        Spell,
        blank=True,
        related_name='creatures'
    )
    melee_attack_dice = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="e.g. '2d6+3'"
    )
    ranged_attack_dice = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="e.g. '1d8+2'"
    )
    created_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return self.name or ''
    
    def to_dict(self):
        return {
            "id": self.id,
            "type": "creature",
            "name": self.name,
            "current_hp": self.hit_points,
            "max_hp": self.hit_points,
            "armor_class": self.armor_class,
            "grid_x": self.grid_x,
            "grid_y": self.grid_y,
            "initiative_bonus": self.initiative_bonus,
            "icon_url": self.icon.url if self.icon else None,
        }
