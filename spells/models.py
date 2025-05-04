# DndGame/spells/models.py

from django.db import models
from django.db.models import JSONField
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

class Spell(models.Model):
    # — Temel Bilgiler —
    name            = models.CharField(max_length=100, unique=True)
    description     = models.TextField(blank=True)
    icon            = models.ImageField(
                        upload_to='spell_icons/',
                        blank=True,
                        null=True
                      )

    # — Seviye, Okul, Sınıflar —
    spell_level     = models.PositiveSmallIntegerField(
                          validators=[MinValueValidator(0), MaxValueValidator(9)]
                      )
    school          = models.CharField(
                          max_length=30,
                          choices=[
                              ("Evocation", "Evocation"),
                              ("Necromancy", "Necromancy"),
                              ("Abjuration", "Abjuration"),
                              ("Conjuration", "Conjuration"),
                              ("Divination", "Divination"),
                              ("Enchantment", "Enchantment"),
                              ("Illusion", "Illusion"),
                              ("Transmutation", "Transmutation"),
                          ]
                      )
    classes         = JSONField(
                          default=list,
                          help_text='Örnek: ["Wizard","Sorcerer"]'
                      )

    # — Kim Oluşturdu —
    created_by      = models.ForeignKey(
                          get_user_model(),
                          on_delete=models.SET_NULL,
                          null=True,
                          blank=True
                      )

    # — Atma Süresi, Menzil, Bileşenler —
    casting_time    = models.CharField(max_length=30)   # “1 Action”, “Bonus Action”, …
    range           = models.CharField(max_length=30)   # “30 feet”, “Self”, …
    components      = JSONField(
                          default=dict,
                          help_text='{"verbal": true, "somatic": true, "material": false}'
                      )
    material_detail = models.CharField(max_length=100, blank=True)

    # — Süre, Konsantrasyon, Ritüel —
    duration        = models.CharField(max_length=50)   # “Instantaneous”, “Concentration, up to 1 min”
    concentration   = models.BooleanField(default=False)
    ritual          = models.BooleanField(default=False)

    # — Etki Şeması —
    effect          = JSONField(
                          default=dict,
                          help_text=(
                              "Örnek şema: {"
                              "'type':'damage','dice':{'num':2,'size':8,'modifier':3},"
                              "'target':'enemy','damage_type':'fire',"
                              "'area':{'shape':'sphere','radius':20},"
                              "'save':{'ability':'Dex','on_success':'half'}"
                              "}"
                          )
                      )

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (Level {self.spell_level})"
