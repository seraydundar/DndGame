from django.db import models

class Spell(models.Model):
    spell_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField()
    spell_level = models.IntegerField()
    casting_class = models.CharField(max_length=255)
    school = models.CharField(max_length=255)
    cast_time = models.CharField(max_length=255)
    range = models.CharField(max_length=255)
    components = models.CharField(max_length=255)
    duration = models.CharField(max_length=255)
    icon_path = models.CharField(max_length=255)
    is_ritual = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    higher_level = models.TextField(blank=True)
    concentration = models.BooleanField(default=False)
    classes = models.CharField(max_length=255)
    effect = models.JSONField()

    class Meta:
        db_table = "spells"  # Veritabanınızdaki tablo adı
        managed = False      # Bu tabloyu Django migration'larının yönetmesine gerek yok
