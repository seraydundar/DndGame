from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    class Meta:
        db_table = 'accounts_customuser'
        
    def __str__(self):
        return self.username

class Friend(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friend_owner'
    )
    friend_user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friend_target'
    )
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'friends'
        unique_together = ('user', 'friend_user')

    def __str__(self):
        return f"{self.user.username} -> {self.friend_user.username} ({self.status})"

class Notification(models.Model):
    NOTIF_TYPES = (
        ('friend_request', 'Friend Request'),
        ('lobby_invite', 'Lobby Invite'),
    )
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIF_TYPES, default='friend_request')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Arkadaşlık isteği bildirimi için
    friend_request = models.ForeignKey(
        Friend,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification'
    )

    # --- YENİ ALANLAR ---
    lobby_invite_id = models.IntegerField(null=True, blank=True)
    invited_lobby_name = models.CharField(max_length=255, null=True, blank=True)
    # --------------------

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type}: {self.message}"
