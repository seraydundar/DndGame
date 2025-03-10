# game/models.py
from django.db import models
from django.conf import settings

# ÖRNEK: accounts_player tablosu -> Biz "Player" modelinin 
#        accounts/models.py içinde tanımlandığını varsayıyoruz.
#        Orada 'db_table = "accounts_player"' ve PK 'id' olmalı.
# from accounts.models import Player

# ÖRNEK: lobbies tablosu -> PK 'lobby_id'
# from lobbies.models import Lobby  # varsayımsal

class Race(models.Model):
    """
    races tablosu:
    - race_name (PK, char/varchar)
    - description (text)
    - traits (JSONB)
    """
    race_name = models.CharField(primary_key=True, max_length=50)
    description = models.TextField(blank=True)
    traits = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'races'

    def __str__(self):
        return self.race_name


class Class(models.Model):
    """
    character_classes tablosu:
    - class_name (PK, char/varchar)
    - description (text)
    - features (JSONB)
    """
    class_name = models.CharField(primary_key=True, max_length=50)
    description = models.TextField(blank=True)
    features = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'character_classes'

    def __str__(self):
        return self.class_name


class Character(models.Model):
    """
    characters tablosu:
     - id (PK, integer)
     - player_id -> FK to accounts_player(id)
     - lobby_id -> FK to lobbies(lobby_id)
     - name
     - race (FK to races.race_name)
     - class (FK to character_classes.class_name)
     - level=1, hp=10
     - strength, dexterity, constitution, intelligence, wisdom, charisma
     - gold=10
     - equipment (JSON, boş)
     - prepared_spells (JSON, boş)
     - class_features (JSON, doldurulacak)
    """

    id = models.AutoField(primary_key=True, db_column='id')

    # Varsayıyoruz: "accounts_player" tablosu -> "id" PK
    # from accounts.models import Player
    player_id = models.IntegerField(null=True, blank=True)  
    # En basit yaklaşım: int alan. 
    # İstersen: 
    # player = models.ForeignKey(Player, db_column='player_id', to_field='id', on_delete=models.SET_NULL, null=True, blank=True)

    # Lobi -> "lobbies" tablosu -> "lobby_id" PK
    lobby_id = models.IntegerField(null=True, blank=True)
    # Veya: 
    # lobby = models.ForeignKey(Lobby, db_column='lobby_id', to_field='lobby_id', on_delete=models.SET_NULL, null=True, blank=True)

    name = models.CharField(max_length=100)

    # race = FK => "races"."race_name"
    # Tablo 'characters' içinde sütun adı "race"
    # to_field='race_name' -> Race tablosunun PK
    race = models.ForeignKey(
        Race,
        db_column='race',      # characters.race (char/varchar)
        to_field='race_name',  # races.race_name (PK)
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # class = FK => "character_classes"."class_name"
    # Tablo 'characters' içinde sütun adı "class"
    # to_field='class_name' -> Class tablosunun PK
    character_class = models.ForeignKey(
        Class,
        db_column='class',
        to_field='class_name',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    level = models.IntegerField(default=1)
    hp = models.IntegerField(default=10)

    strength = models.IntegerField(default=10)
    dexterity = models.IntegerField(default=10)
    constitution = models.IntegerField(default=10)
    intelligence = models.IntegerField(default=10)
    wisdom = models.IntegerField(default=10)
    charisma = models.IntegerField(default=10)

    gold = models.IntegerField(default=10)

    equipment = models.JSONField(default=dict, blank=True)
    prepared_spells = models.JSONField(default=dict, blank=True)

    # class_features = features kolonunun kopyası (JSON) 
    class_features = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'characters'

    def __str__(self):
        return self.name

    # TODO: Burada "stat_point" mekaniği, create sırasında ırk traits ekleme vb.
    #       logic eklenebilir (örnek save() override, signals, vs.)
class Lobby(models.Model):
    lobby_id = models.AutoField(primary_key=True, db_column='lobby_id')
    lobby_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lobbies'

    def __str__(self):
        return self.lobby_name
