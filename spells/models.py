from django.db import models
from django.db.models import JSONField
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

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

    # — Yeni Etki Alanları —
    SPELL_EFFECTS = [
        ('damage', 'Hasar'),
        ('heal', 'İyileştirme'),
        ('buff', 'Güçlendirme'),
        ('debuff', 'Zayıflatma'),
    ]
    TARGET_SCOPES = [
        ('single', 'Tek Hedef'),
        ('area', 'Alan Etkili'),
        ('self', 'Kendine'),
    ]
    DAMAGE_TYPES = [
        ('fire', 'Ateş'),
        ('glacier', 'Buz'),
        ('poison', 'Zehir'),
        ('lightning', 'Yıldırım'),
        ('earth', 'Toprak'),
        ('power', 'Arcane (Güç)'),
        ('sonic', 'Sonic'),
    ]
    effect_type   = models.CharField(
        max_length=10,
        choices=SPELL_EFFECTS,
        default='damage',
        help_text="Büyünün etki türü"
    )
    scope         = models.CharField(
        max_length=10,
        choices=TARGET_SCOPES,
        default='single',
        help_text="Büyünün hedef kapsamı"
    )
    damage_type   = models.CharField(
        max_length=10,
        choices=DAMAGE_TYPES,
        blank=True,
        null=True,
        help_text="Hasar büyüsü için hasar tipi"
    )

    # — Zar Mekaniği —
    dice_num       = models.PositiveSmallIntegerField(
                          default=1,
                          help_text="Atılacak zar sayısı (num)"
                      )
    dice_size      = models.PositiveSmallIntegerField(
                          default=6,
                          help_text="Zar yüz sayısı (size)"
                      )
    dice_modifier  = models.IntegerField(
                          default=0,
                          help_text="Zar atma sonrası eklenecek modifikasyon (modifier)"
                      )

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def clean(self):
        # Hasar tip kontrolü
        if self.effect_type == 'damage' and not self.damage_type:
            raise ValidationError({'damage_type': "Hasar büyüleri için damage_type zorunlu."})
        if self.effect_type != 'damage' and self.damage_type:
            raise ValidationError({'damage_type': "Sadece hasar büyüleri için damage_type tanımlanabilir."})

    def __str__(self):
        return f"{self.name} (Level {self.spell_level})"
