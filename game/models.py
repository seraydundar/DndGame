from django.db import models
import random

class Race(models.Model):
    race_name = models.CharField(primary_key=True, max_length=50)
    description = models.TextField(blank=True)
    traits = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'races'

    def __str__(self):
        return self.race_name


class Class(models.Model):
    class_name = models.CharField(primary_key=True, max_length=50)
    description = models.TextField(blank=True)
    features = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'character_classes'

    def __str__(self):
        return self.class_name


class Character(models.Model):
    id = models.AutoField(primary_key=True)
    player_id = models.IntegerField(null=True, blank=True)
    lobby_id = models.IntegerField(null=True, blank=True)
    name = models.CharField(max_length=100)
    race = models.ForeignKey(
        'game.Race',
        db_column='race',
        to_field='race_name',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    character_class = models.ForeignKey(
        'game.Class',
        db_column='class',
        to_field='class_name',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    level = models.IntegerField(default=1)

    # Current and maximum HP
    hp = models.IntegerField(default=10)
    max_hp = models.IntegerField(default=10)

    xp = models.IntegerField(default=0)
    strength = models.IntegerField(default=10)
    dexterity = models.IntegerField(default=10)
    constitution = models.IntegerField(default=10)
    intelligence = models.IntegerField(default=10)
    wisdom = models.IntegerField(default=10)
    charisma = models.IntegerField(default=10)
    ac = models.IntegerField(default=0)
    gold = models.IntegerField(default=10)
    action_points = models.IntegerField(default=1)

    # Icon for character portrait
    icon = models.ImageField(
        upload_to='character_icons/',
        null=True,
        blank=True,
        help_text='PNG or JPG image for character icon (64×64 recommended)'
    )

    # Inventory replaces equipment list
    inventory = models.JSONField(default=list, blank=True)

    # Equipped items slots
    head_armor = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    chest_armor = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    hand_armor = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    legs_armor = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    ring1 = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    ring2 = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    necklace = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    ear1 = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    ear2 = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    main_hand = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )
    off_hand = models.ForeignKey(
        'items.Item', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+'
    )

    # ——— Yeni Alanlar: Geçici monster karakterleri için ———
    is_temporary = models.BooleanField(default=False)
    melee_dice  = models.CharField(max_length=20, blank=True, null=True)
    ranged_dice = models.CharField(max_length=20, blank=True, null=True)
    # ——————————————————————————————————————————————

    prepared_spells = models.JSONField(default=dict, blank=True)
    class_features = models.JSONField(default=dict, blank=True)
    background = models.CharField(max_length=100, null=True, blank=True)
    personality_traits = models.TextField(null=True, blank=True)
    ideals = models.TextField(null=True, blank=True)
    bonds = models.TextField(null=True, blank=True)
    flaws = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'characters'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure hp does not exceed max_hp
        if self.max_hp is not None:
            self.hp = min(self.hp, self.max_hp)
        return super().save(*args, **kwargs)

    def xp_for_next_level(self):
        if self.level >= 20:
            return float('inf')
        return 100 * (2 ** (self.level - 1))

    def gain_experience(self, xp_amount):
        self.xp += xp_amount
        self.save()

    @property
    def can_level_up(self):
        return self.level < 20 and self.xp >= self.xp_for_next_level()

    def level_up_info(self):
        hp_increase = (self.constitution // 2) + 3
        return {"hp_increase": hp_increase}

    def confirm_level_up(self):
        if not self.can_level_up:
            raise ValueError("Level up için yeterli XP yok.")
        info = self.level_up_info()
        self.level += 1
        self.max_hp += info["hp_increase"]
        self.hp = self.max_hp
        self.xp = 0
        self.save()
        return info

    def roll_initiative(self):
        return random.randint(1, 20)

    @property
    def movement_range(self):
        dex_bonus = (self.dexterity - 10) // 2 if self.dexterity >= 10 else 0
        return 2 + dex_bonus

    def normal_attack_damage(self):
        # Bu metot artık yalnızca player saldırıları için fallback olabilir
        strength_mod = (self.strength - 10) // 2 if self.strength >= 10 else 0
        damage_roll = random.randint(1, 6)
        return damage_roll + strength_mod


class CharacterTemplate(models.Model):
    template_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    class_name = models.CharField(max_length=50, db_column='class')
    race = models.CharField(max_length=50)
    level = models.IntegerField(default=1)
    hp = models.IntegerField()
    strength = models.IntegerField()
    dexterity = models.IntegerField()
    constitution = models.IntegerField()
    intelligence = models.IntegerField()
    wisdom = models.IntegerField()
    charisma = models.IntegerField()
    equipment = models.JSONField(default=dict, blank=True)
    spells = models.JSONField(default=dict, blank=True)
    gold = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'character_templates'

    def __str__(self):
        return self.name
