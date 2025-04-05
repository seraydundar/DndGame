from rest_framework import serializers
from .models import CustomUser,Friend,Notification




class CustomUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        # Şifreyi hash'lemek için create_user metodunu kullanır.
        user = CustomUser.objects.create_user(**validated_data)
        return user


class FriendSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    friend_user = CustomUserSerializer(read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    friend_username = serializers.CharField(source="friend_user.username", read_only=True)
    
    class Meta:
        model = Friend
        fields = ["id", "user", "user_username", "friend_user", "friend_username", "status", "created_at"]



class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)  # `sender` yerine `user` olmalı

    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'notification_type', 'is_read', 'created_at']
