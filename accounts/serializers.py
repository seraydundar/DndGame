# accounts/serializers.py
from rest_framework import serializers
from .models import CustomUser,Friend,Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'notification_type', 'is_read', 'created_at']

class CustomUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        # Şifreyi hash'lemek için create_user metodunu kullanın.
        user = CustomUser.objects.create_user(**validated_data)
        return user
    

class FriendSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    friend_user = CustomUserSerializer(read_only=True)

    class Meta:
        model = Friend
        fields = ['id', 'user', 'friend_user', 'status', 'created_at']

