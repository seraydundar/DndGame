from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from accounts.models import CustomUser  # Eski Player yerine CustomUser
from game.models import Character
 

class CharacterAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Örnek kullanıcı oluşturuluyor. create_user şifreyi otomatik hashler.
        self.user = CustomUser.objects.create_user(username='testplayer', email='test@example.com', password='hashed_password')
        # Örnek lobi oluşturuluyor, gm_player alanı custom user referansı.
        # Karakter oluşturma endpoint URL'sini alıyoruz (router üzerinden gelen isim)
        self.url = reverse('character-list')

    def test_create_character(self):
        data = {

            "name": "Test Character",
            "race": "Human",
            "character_class": "Fighter",
            "level": 1,
            "hp": 15,
            "strength": 16,
            "dexterity": 12,
            "constitution": 14,
            "intelligence": 8,
            "wisdom": 10,
            "charisma": 10,
            "equipment": {},
            "gold": 50,
            "spell_slots": {},
            "status_effects": {},
            "class_features": {},
            "prepared_spells": {},
            "statistics": {}
        }
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Character.objects.count(), 1)
        self.assertEqual(Character.objects.get().name, "Test Character")
