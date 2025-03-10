from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class CustomUser(AbstractUser):
    # Ek alanlar eklemek isterseniz buraya ekleyebilirsiniz.
    # AbstractUser; username, email, password, is_staff, is_active vb. alanları zaten içerir.
    class Meta:
        db_table = 'accounts_customuser'
        
    def __str__(self):
        return self.username


class Friend(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friend_owner'
    )
    friend_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friend_target'
    )
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'friends'
        unique_together = ('user', 'friend_user')



class Notification(models.Model):
    NOTIF_TYPES = (
        ('friend_request', 'Friend Request'),
        ('lobby_invite', 'Lobby Invite'),
    )
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIF_TYPES, default='friend_request')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

