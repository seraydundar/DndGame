# Generated by Django 5.1.7 on 2025-05-06 21:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('creature', '0002_alter_creature_armor_class_alter_creature_hit_points'),
    ]

    operations = [
        migrations.AlterField(
            model_name='creature',
            name='challenge_rating',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='creature',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name='creature',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='creature',
            name='name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='creature',
            name='tags',
            field=models.JSONField(blank=True, default=list, null=True),
        ),
        migrations.AlterField(
            model_name='creature',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ]
