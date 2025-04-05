from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from .models import Spell
from .serializers import SpellSerializer
import random
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
# Özel CSRF devre dışı bırakma authentication'ı
# Karakter modelini battles uygulamasından veya kendi uygulamanızdan import edin
from game.models import Character

# Global battle state (demo amaçlı; production için merkezi store kullanın)
from game.views import BATTLE_STATE

# CSRF kontrolünü devre dışı bırakmak için özel authentication sınıfı
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

class SpellViewSet(viewsets.ModelViewSet):
    queryset = Spell.objects.all()
    serializer_class = SpellSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'spell_level': ['lte'],
        'classes': ['icontains']
    }
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]


# 1. Magic Missile Spell
class MagicMissileSpellView(APIView):
    """
    Magic Missile: Otomatik isabet eder ve 1d4+1 hasar verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)
        
        damage = random.randint(1, 4) + 1
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Magic Missile spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 2. Fireball Spell
class FireballSpellView(APIView):
    """
    Fireball: Hedef hücre ve çevresindeki alanı etkiler. Örneğin, ana hedefe 1d8+attacker.intelligence hasarı verir.
    (Burada sadece ana hedef üzerinde işlem yapıyoruz, geniş alan etkisi ileride eklenebilir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 8) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Fireball spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 3. Lightning Bolt Spell
class LightningBoltSpellView(APIView):
    """
    Lightning Bolt: Tek hedefe 1d10+attacker.intelligence hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 10) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Lightning Bolt spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 4. Healing Word Spell
class HealingWordSpellView(APIView):
    """
    Healing Word: Tek hedefin HP'sini 1d4+attacker.wisdom oranında iyileştirir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")  # healing yapan karakter
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(caster, 'wisdom', 0)
        heal_amount = random.randint(1, 4) + bonus
        target.hp += heal_amount  # iyileştirme
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Healing Word spellini kullandı ve {target.name}'i {heal_amount} HP iyileştirdi (Yeni HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "heal_amount": heal_amount,
            "target_new_hp": target.hp,
            "chat_log": chat_log
        })

# 5. Shield Spell
class ShieldSpellView(APIView):
    """
    Shield: Kısa süreliğine saldırıya karşı ek koruma sağlar. 
    (Burada gerçek mekanikleri uygulamak yerine, sadece mesaj yayınlanıyor.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        # Shield spell, örneğin caster'ın geçici AC'sini artırır.
        # Bu örnekte mekanik olarak AC güncellemesi yapmadan mesaj yayıyoruz.
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Shield spellini kullandı ve kısa süreliğine korunma sağladı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 6. Invisibility Spell
class InvisibilitySpellView(APIView):
    """
    Invisibility: Hedef karakteri görünmez yapar.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        # Gerçek uygulamada target'a görünmezlik durumu eklenir.
        # Bu örnekte, sadece mesaj yayınlıyoruz.
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Invisibility spellini kullandı; {target.name} artık görünmez."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 7. Sleep Spell
class SleepSpellView(APIView):
    """
    Sleep: Hedef karakteri uyutur (örneğin, belirli bir süre hareketsiz bırakır).
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        # Sleep spell, target'ı uyutma etkisi yaratır. Bu örnekte sadece mesaj gönderiyoruz.
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Sleep spellini kullandı; {target.name} uyudu."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 8. Acid Arrow Spell
class AcidArrowSpellView(APIView):
    """
    Acid Arrow: Tek hedefe 1d6+attacker.intelligence hasarı verir; bazı versiyonlarda hasar zamanla tekrarlanır.
    Bu örnekte anlık hasar uygulanmaktadır.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 6) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Acid Arrow spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 9. Magic Weapon Spell
class MagicWeaponSpellView(APIView):
    """
    Magic Weapon: Hedefin silahına geçici bir güç katar (örneğin, saldırı gücünü artırır).
    Bu örnekte, sadece mesaj üzerinden etkisini bildiriyoruz.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Magic Weapon spellini kullandı; {target.name}'in silahı güçlendi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 10. Fly Spell
class FlySpellView(APIView):
    """
    Fly: Hedef karaktere uçma yeteneği verir.
    Bu örnekte, sadece mesajla uçma etkisi bildirilmektedir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Fly spellini kullandı; {target.name} artık uçabiliyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })
    

    # 11. Cone of Cold Spell
class ConeOfColdSpellView(APIView):
    """
    Cone of Cold:
    Hedefe 1d10 + attacker.intelligence hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 10) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Cone of Cold spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 12. Dominate Person Spell
class DominatePersonSpellView(APIView):
    """
    Dominate Person:
    Hedef karakteri geçici olarak kontrol altına alır.
    (Bu örnekte mekanik olarak kontrolü sağlamıyoruz, sadece mesaj yayıyoruz.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Dominate Person spellini kullandı; {target.name} artık kontrol altına alındı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 13. Disintegrate Spell
class DisintegrateSpellView(APIView):
    """
    Disintegrate:
    Hedefe 1d12 + attacker.intelligence hasarı verir.
    Eğer hasar, hedefin mevcut HP'sine eşit veya büyükse, hedef tamamen yok olur.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 12) + bonus
        # Eğer hasar hedefin HP'sini aşarsa, hedefi yok edelim (HP = 0)
        if damage >= target.hp:
            target.hp = 0
            outcome = f"{target.name} tamamen yok oldu."
        else:
            target.hp -= damage
            outcome = f"Kalan HP: {target.hp}"
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Disintegrate spellini kullandı ve {target.name}'e {damage} hasar verdi. {outcome}"
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 14. Earthquake Spell
class EarthquakeSpellView(APIView):
    """
    Earthquake:
    Hedefe 1d8 + attacker.intelligence hasarı verir.
    (Bu örnekte, tek bir hedef üzerinde hasar uygulanmaktadır; alan etkisi daha sonra genişletilebilir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 8) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Earthquake spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 15. Hold Person Spell
class HoldPersonSpellView(APIView):
    """
    Hold Person:
    Hedef karakteri geçici olarak sersemletir.
    (Bu örnekte, yalnızca etki mesajı yayınlanmaktadır.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Hold Person spellini kullandı; {target.name} sersemledi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 16. Lightning Storm Spell
class LightningStormSpellView(APIView):
    """
    Lightning Storm:
    Hedefe 1d10 + attacker.intelligence hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 10) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Lightning Storm spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 17. Polymorph Spell
class PolymorphSpellView(APIView):
    """
    Polymorph:
    Hedef karakterin formunu değiştirir.
    (Bu örnekte, sadece mesaj üzerinden etkisi bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Polymorph spellini kullandı; {target.name} farklı bir form kazandı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 18. Sunbeam Spell
class SunbeamSpellView(APIView):
    """
    Sunbeam:
    Hedefe 1d8 + attacker.wisdom hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        bonus = getattr(attacker, 'wisdom', 0)
        damage = random.randint(1, 8) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Sunbeam spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 19. Wall of Fire Spell
class WallOfFireSpellView(APIView):
    """
    Wall of Fire:
    Hedefe 1d6 + attacker.intelligence hasarı verir.
    (Bu örnekte, hedefin duvara yakınlığı dikkate alınmamıştır, sadece tek hedefe hasar uygulanmaktadır.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)

        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 6) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Wall of Fire spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 20. Time Stop Spell
class TimeStopSpellView(APIView):
    """
    Time Stop:
    Zamanı durdurur, ancak bu örnekte sadece mesaj yayınlanır.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id = request.data.get("lobby_id")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Time Stop spellini kullandı; zaman birkaç tur için durdu."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })
    

    # 21. Blight Spell
class BlightSpellView(APIView):
    """
    Blight:
    Hedefe 1d8 + attacker.intelligence (bonus) necrotic hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)

        bonus  = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 8) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{attacker.name} Blight spellini kullandı ve {target.name}'e {damage} necrotic hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 22. Charm Person Spell
class CharmPersonSpellView(APIView):
    """
    Charm Person:
    Hedef karakteri geçici olarak etkiler (charmed) ve kontrol altına alır.
    Bu örnekte, mekanik olarak kontrol uygulanmadan yalnızca mesaj gönderilir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Charm Person spellini kullandı; {target.name} artık etkileniyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 23. Darkness Spell
class DarknessSpellView(APIView):
    """
    Darkness:
    Hedef karakter veya alan etrafını karartır, düşmanların görüşünü kısıtlar.
    (Bu örnekte, sadece mesaj ile etkisi bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")  # Eğer alan etkisi olacaksa, hedef bölge seçilebilir.
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Darkness spellini kullandı; {target.name} ve çevresi karanlığa gömüldü."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 24. Haste Spell
class HasteSpellView(APIView):
    """
    Haste:
    Hedef karakterin hızını ve aksiyon sayısını geçici olarak artırır.
    (Bu örnekte sadece mesaj yayınlanmaktadır.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Haste spellini kullandı; {target.name} şimdi daha hızlı hareket edebiliyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 25. Slow Spell
class SlowSpellView(APIView):
    """
    Slow:
    Hedef karakterin hızını ve aksiyonlarını geçici olarak yavaşlatır.
    (Bu örnekte, sadece mesajla etkisi bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Slow spellini kullandı; {target.name} şimdi yavaşlıyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )

        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 26. Counterspell Spell
class CounterspellSpellView(APIView):
    """
    Counterspell:
    Hedefin büyü yapma girişimini engeller.
    (Bu örnekte, sadece mesaj olarak bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Counterspell spellini kullandı; rakibin büyü girişimi engellendi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 27. Fire Shield Spell
class FireShieldSpellView(APIView):
    """
    Fire Shield:
    Kısa süreliğine, saldırı yapanlara ateş hasarı verecek bir koruma sağlar.
    (Bu örnekte, sadece mesaj ile bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Fire Shield spellini kullandı; koruyucu ateş etkisi devreye girdi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 28. Ice Storm Spell
class IceStormSpellView(APIView):
    """
    Ice Storm:
    Hedefe 2d8 (bludgeoning) + 1d6 (cold) hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)
        
        damage_bludgeoning = random.randint(1, 8) + random.randint(1, 8)
        damage_cold        = random.randint(1, 6)
        total_damage = damage_bludgeoning + damage_cold
        
        target.hp = max(0, target.hp - total_damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = (f"{attacker.name} Ice Storm spellini kullandı ve {target.name}'e "
                   f"{total_damage} hasar verdi (Bludgeoning: {damage_bludgeoning}, Cold: {damage_cold}) "
                   f"(Kalan HP: {target.hp}).")
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": total_damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 29. Prismatic Spray Spell
class PrismaticSpraySpellView(APIView):
    """
    Prismatic Spray:
    Hedefe 1d10 + attacker.intelligence hasarı verir.
    (Bu örnekte, tek bir hedefe uygulanmaktadır. Gerçek kullanımında çoklu renk efektleri eklenebilir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1, 10) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{attacker.name} Prismatic Spray spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 30. Dispel Magic Spell
class DispelMagicSpellView(APIView):
    """
    Dispel Magic:
    Hedefin üzerindeki büyüsel etkileri kaldırır.
    (Bu örnekte, sadece mesaj ile etkisi bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message = f"{caster.name} Dispel Magic spellini kullandı; {target.name} üzerindeki büyüsel etkiler kaldırıldı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })
    

    # 31. Animate Dead Spell
class AnimateDeadSpellView(APIView):
    """
    Animate Dead:
    Hedefteki ölü bedenin animasyonunu sağlar; ölü beden zombiye dönüşür.
    (Bu örnekte, mekanik olarak hedefin durumunu değiştirmiyoruz; yalnızca mesaj yayıyoruz.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        # Burada target normalde ölü beden olmalı; biz yine Character kullanıyoruz.
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Animate Dead spellini kullandı; {target.name} zombiye dönüştü."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 32. Banishment Spell
class BanishmentSpellView(APIView):
    """
    Banishment:
    Hedefi geçici olarak başka bir düzleme gönderir.
    (Bu örnekte, sadece mesaj yayılarak etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Banishment spellini kullandı; {target.name} geçici olarak başka bir düzleme gönderildi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 33. Circle of Death Spell
class CircleOfDeathSpellView(APIView):
    """
    Circle of Death:
    Hedefe 2d6 + attacker.intelligence hasarı veren güçlü necrotic bir dalga.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = (random.randint(1,6) + random.randint(1,6)) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Circle of Death spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 34. Cloudkill Spell
class CloudkillSpellView(APIView):
    """
    Cloudkill:
    Hedefe 3d6 poison hasarı verir.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)
        
        damage = sum(random.randint(1,6) for _ in range(3))
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Cloudkill spellini kullandı ve {target.name}'e {damage} poison hasarı verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 35. Confusion Spell
class ConfusionSpellView(APIView):
    """
    Confusion:
    Hedef karakterin kontrolünü geçici olarak zorlaştırır.
    (Bu örnekte, yalnızca mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Confusion spellini kullandı; {target.name} şimdi kontrol etmekte zorlanıyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 36. Delayed Blast Fireball Spell
class DelayedBlastFireballSpellView(APIView):
    """
    Delayed Blast Fireball:
    Hedefe 1d10 + attacker.intelligence + 5 bonus hasarı verir.
    (Bu örnekte, hasar sabitlenmiş; gerçek kullanımında hasar zamanla artar.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id   = request.data.get("target_id")
        lobby_id    = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target   = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1,10) + bonus + 5
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Delayed Blast Fireball spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 37. Dimension Door Spell
class DimensionDoorSpellView(APIView):
    """
    Dimension Door:
    Saldırıyı yapan karakteri, belirlenen hedef konuma anında taşır.
    (Bu örnekte, sadece mesaj ile taşınma bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        destination = request.data.get("destination")  # Örneğin "x,y" koordinatları
        if not caster_id or not lobby_id or not destination:
            return Response({"error": "attacker_id, lobby_id ve destination gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        # Burada gerçek konum güncellemesi yapılabilir; örneğimizde sadece mesaj yayınlanır.
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Dimension Door spellini kullandı ve {destination} konumuna taşındı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 38. Dominate Monster Spell
class DominateMonsterSpellView(APIView):
    """
    Dominate Monster:
    Hedef canavar üzerinde geçici kontrol sağlar.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Dominate Monster spellini kullandı; {target.name} artık canavar kontrolü altında."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 39. Feeblemind Spell
class FeeblemindSpellView(APIView):
    """
    Feeblemind:
    Hedefin zihinsel yeteneklerini keskin şekilde düşürür.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Feeblemind spellini kullandı; {target.name}'in zihinsel yetenekleri köreltilmeye başladı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })

# 40. True Resurrection Spell
class TrueResurrectionSpellView(APIView):
    """
    True Resurrection:
    Eğer hedef tamamen ölmüşse, onu hayata döndürür.
    (Bu örnekte, sadece mesaj ile hayata dönüş bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        # True Resurrection: Hedefin ölü olduğu varsayılır, HP'si belirli bir değere getirilir.
        if target.hp > 0:
            message = f"{caster.name} True Resurrection spellini kullandı fakat {target.name} zaten hayatta."
        else:
            target.hp = 1  # Örneğin, hayata döndürüldüğünde minimum HP ile.
            target.save()
            message = f"{caster.name} True Resurrection spellini kullandı; {target.name} hayata döndürüldü (HP: {target.hp})."
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        
        return Response({
            "message": message,
            "chat_log": chat_log
        })
    
    # 41. Forcecage Spell
class ForcecageSpellView(APIView):
    """
    Forcecage:
    Hedefi görünmez bir kafese hapsederek hareket edemez hale getirir.
    (Bu örnekte, sadece mesaj ile etkisi bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Forcecage spellini kullandı; {target.name} görünmez bir kafese hapsedildi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 42. Telekinesis Spell
class TelekinesisSpellView(APIView):
    """
    Telekinesis:
    Hedefin nesnesini veya kendisini belirli bir konuma taşıma etkisi sağlar.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        destination = request.data.get("destination", "belirtilmemiş")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Telekinesis spellini kullandı; {target.name} {destination} konumuna taşındı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 43. Earthbind Spell
class EarthbindSpellView(APIView):
    """
    Earthbind:
    Hedefin hareket kabiliyetini kısıtlar, hızını düşürür.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Earthbind spellini kullandı; {target.name} hareket kabiliyeti kısıtlandı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 44. Mind Blank Spell
class MindBlankSpellView(APIView):
    """
    Mind Blank:
    Hedefi zihinsel saldırılardan korur.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Mind Blank spellini kullandı; {target.name} artık zihinsel saldırılardan korunuyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 45. Maze Spell
class MazeSpellView(APIView):
    """
    Maze:
    Hedefi geçici olarak labirent benzeri bir düzleme gönderir.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Maze spellini kullandı; {target.name} labirente gönderildi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 46. Power Word Kill Spell
class PowerWordKillSpellView(APIView):
    """
    Power Word Kill:
    Eğer hedefin HP'si belirli bir eşiğin altındaysa, hedefi anında öldürür.
    (Bu örnekte, hedefin HP'si 50'nin altındaysa HP 0 yapılır.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        if target.hp < 50:
            target.hp = 0
            outcome = f"{target.name} anında öldü."
        else:
            outcome = f"{target.name} direndi."
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Power Word Kill spellini kullandı; {outcome}"
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 47. Finger of Death Spell
class FingerOfDeathSpellView(APIView):
    """
    Finger of Death:
    Hedefe 1d20 + attacker.intelligence hasarı verir. Eğer bu hasar hedefin HP'sini aşarsa, hedef tamamen yok olur.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        attacker_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not attacker_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."},
                            status=status.HTTP_400_BAD_REQUEST)
        attacker = get_object_or_404(Character, id=attacker_id)
        target = get_object_or_404(Character, id=target_id)
        
        bonus = getattr(attacker, 'intelligence', 0)
        damage = random.randint(1,20) + bonus
        if damage >= target.hp:
            target.hp = 0
            outcome = f"{target.name} tamamen yok oldu."
        else:
            target.hp -= damage
            outcome = f"Kalan HP: {target.hp}"
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{attacker.name} Finger of Death spellini kullandı ve {target.name}'e {damage} hasar verdi. {outcome}"
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({
            "message": message,
            "damage": damage,
            "target_remaining_hp": target.hp,
            "chat_log": chat_log
        })

# 48. Globe of Invulnerability Spell
class GlobeOfInvulnerabilitySpellView(APIView):
    """
    Globe of Invulnerability:
    Belirli bir süre boyunca, hedefi büyü etkilerine karşı korur.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        duration  = request.data.get("duration", "1 tur")  # Varsayılan süre
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Globe of Invulnerability spellini kullandı; {duration} boyunca büyü etkilerine karşı korunuyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 49. Otto's Irresistible Dance Spell
class OttosIrresistibleDanceSpellView(APIView):
    """
    Otto's Irresistible Dance:
    Hedef karakteri kontrol edilemez bir şekilde dans ettirir.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        target = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Otto's Irresistible Dance spellini kullandı; {target.name} kontrol edilemez şekilde dans ediyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 50. Symbol Spell
class SymbolSpellView(APIView):
    """
    Symbol:
    Belirlenen alanda (veya hedef üzerinde) korku, paralize, acı vb. etkiler tetikler.
    (Bu örnekte, sadece mesaj ile etkisi bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        area      = request.data.get("area", "belirtilmemiş alan")
        lobby_id  = request.data.get("lobby_id")
        effect    = request.data.get("effect", "paralize")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log = battle_state.get("chat_log", [])
        message = f"{caster.name} Symbol spellini kullandı; {area} alanında {effect} etkisi tetiklendi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})
    
    # 51. Mass Heal Spell
class MassHealSpellView(APIView):
    """
    Mass Heal:
    Belirtilen alandaki (veya liste halinde gönderilen) tüm hedeflerin HP'sini 1d8 + caster.wisdom oranında iyileştirir.
    (Bu örnekte, sadece tek bir hedef üzerinde işlem yapıyoruz; geniş alan etkisi ileride eklenebilir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id  = request.data.get("attacker_id")
        target_id  = request.data.get("target_id")
        lobby_id   = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster  = get_object_or_404(Character, id=caster_id)
        target  = get_object_or_404(Character, id=target_id)
        bonus   = getattr(caster, 'wisdom', 0)
        heal    = random.randint(1, 8) + bonus
        target.hp += heal
        target.save()

        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Mass Heal spellini kullandı ve {target.name}'in HP'sini {heal} iyileştirdi (Yeni HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "heal": heal, "target_new_hp": target.hp, "chat_log": chat_log})

# 52. Chain Lightning Spell
class ChainLightningSpellView(APIView):
    """
    Chain Lightning:
    Hedefe 1d8 + caster.intelligence hasarı verir; zincir etkisiyle ek hedeflere de hasar verebilir (bu örnekte yalnızca tek hedefe uygulanır).
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "Gerekli alanlar eksik."}, status=status.HTTP_400_BAD_REQUEST)
        caster  = get_object_or_404(Character, id=caster_id)
        target  = get_object_or_404(Character, id=target_id)
        bonus   = getattr(caster, 'intelligence', 0)
        damage  = random.randint(1, 8) + bonus
        target.hp = max(0, target.hp - damage)
        target.save()
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Chain Lightning spellini kullandı ve {target.name}'e {damage} hasar verdi (Kalan HP: {target.hp})."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "damage": damage, "target_remaining_hp": target.hp, "chat_log": chat_log})

# 53. Reverse Gravity Spell
class ReverseGravitySpellView(APIView):
    """
    Reverse Gravity:
    Belirlenen alan içinde yer alan tüm hedeflerin hareketini geçici olarak tersine çevirir.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id   = request.data.get("attacker_id")
        lobby_id    = request.data.get("lobby_id")
        area        = request.data.get("area", "belirtilmemiş alan")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."}, status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Reverse Gravity spellini kullandı; {area} içindeki hedeflerin hareketi tersine çevrildi."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 54. Flesh to Stone Spell
class FleshToStoneSpellView(APIView):
    """
    Flesh to Stone:
    Hedefin belirli bir süre boyunca taşlaşma etkisi kazanmasına yol açar.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster  = get_object_or_404(Character, id=caster_id)
        target  = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Flesh to Stone spellini kullandı; {target.name} yavaş yavaş taşa dönüşüyor."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 55. Animate Objects Spell
class AnimateObjectsSpellView(APIView):
    """
    Animate Objects:
    Belirli nesneleri canlandırır ve savaşta yardımcı yaratıklar olarak kullanır.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        object_description = request.data.get("object_description", "nesneler")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Animate Objects spellini kullandı; {object_description} canlandı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 56. Antimagic Field Spell
class AntimagicFieldSpellView(APIView):
    """
    Antimagic Field:
    Belirli bir alan içinde büyü etkilerini engeller.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        area      = request.data.get("area", "belirtilmemiş alan")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Antimagic Field spellini kullandı; {area} içindeki büyü etkileri devre dışı bırakıldı."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 57. Eyebite Spell
class EyebiteSpellView(APIView):
    """
    Eyebite:
    Hedefin zihinsel durumunu etkiler; farklı seçeneklere bağlı olarak korku, sersemlik vb. etkiler verebilir.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        target_id = request.data.get("target_id")
        lobby_id  = request.data.get("lobby_id")
        effect    = request.data.get("effect", "korku")
        if not caster_id or not target_id or not lobby_id:
            return Response({"error": "attacker_id, target_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster  = get_object_or_404(Character, id=caster_id)
        target  = get_object_or_404(Character, id=target_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Eyebite spellini kullandı; {target.name} {effect} etkisi altında."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 58. Control Weather Spell
class ControlWeatherSpellView(APIView):
    """
    Control Weather:
    Belirtilen bölgede havanın durumunu değiştirir.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        new_weather = request.data.get("new_weather", "fırtınalı")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Control Weather spellini kullandı; hava {new_weather} oldu."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 59. Holy Aura Spell
class HolyAuraSpellView(APIView):
    """
    Holy Aura:
    Hedeflere geçici ilahi koruma ve bonuslar sağlar.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        duration  = request.data.get("duration", "1 tur")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Holy Aura spellini kullandı; müttefikler {duration} boyunca ilahi korumaya sahip."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})

# 60. Wish Spell
class WishSpellView(APIView):
    """
    Wish:
    En güçlü büyüdür; tüm diğer spellerin etkilerini aşan olağanüstü bir etki sağlar.
    (Bu örnekte, sadece mesaj ile etki bildirilmektedir.)
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        caster_id = request.data.get("attacker_id")
        lobby_id  = request.data.get("lobby_id")
        wish_text = request.data.get("wish_text", "dilediği şey gerçekleşti")
        if not caster_id or not lobby_id:
            return Response({"error": "attacker_id ve lobby_id gereklidir."},
                            status=status.HTTP_400_BAD_REQUEST)
        caster = get_object_or_404(Character, id=caster_id)
        
        battle_state = BATTLE_STATE.get(str(lobby_id), {})
        chat_log     = battle_state.get("chat_log", [])
        message      = f"{caster.name} Wish spellini kullandı; {wish_text}."
        chat_log.append(message)
        battle_state["chat_log"] = chat_log
        BATTLE_STATE[str(lobby_id)] = battle_state

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"lobby_{lobby_id}",
            {"type": "game_message", "message": battle_state}
        )
        return Response({"message": message, "chat_log": chat_log})
