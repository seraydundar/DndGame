# accounts/views.py
from rest_framework import generics, status
from rest_framework.permissions import AllowAny,IsAuthenticated
from .models import CustomUser, Friend,Notification
from .serializers import CustomUserSerializer, FriendSerializer,NotificationSerializer
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

class NotificationListView(ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [AllowAny]  # Herkesin kayıt olabilmesi için



class AddFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user  # Giriş yapmış kullanıcı
        friend_username = request.data.get('friend_username', '').strip()

        if not friend_username:
            return Response({"error": "Arkadaş kullanıcı adı gerekli."}, status=status.HTTP_400_BAD_REQUEST)

        friend_user = get_object_or_404(CustomUser, username=friend_username)

        if friend_user.id == user.id:
            return Response({"error": "Kendini arkadaş ekleyemezsin."}, status=status.HTTP_400_BAD_REQUEST)

        if Friend.objects.filter(user=user, friend_user=friend_user).exists():
            return Response({"error": "Zaten arkadaş isteğiniz mevcut."}, status=status.HTTP_400_BAD_REQUEST)

        # Arkadaş isteği oluştur
        friend_req = Friend.objects.create(user=user, friend_user=friend_user, status='pending')

        # Notification oluştur: Arkadaş isteği gönderildiğine dair bildirim
        Notification.objects.create(
            user=friend_user,
            message=f"{user.username} size arkadaşlık isteği gönderdi.",
            notification_type='friend_request'
        )

        return Response({"message": "Arkadaş isteği gönderildi."}, status=status.HTTP_201_CREATED)



class IncomingFriendRequestsView(ListAPIView):
    serializer_class = FriendSerializer

    def get_queryset(self):
        return Friend.objects.filter(
            friend_user=self.request.user, 
            status='pending'
        )


class RespondFriendRequestView(APIView):
    def patch(self, request, friend_id):
        try:
            friend_req = Friend.objects.get(
                id=friend_id, 
                friend_user=request.user, 
                status='pending'
            )
        except Friend.DoesNotExist:
            return Response({"error": "İstek yok veya zaten yanıtlanmış."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ['accepted', 'rejected']:
            return Response({"error": "Geçersiz durum."}, status=status.HTTP_400_BAD_REQUEST)

        friend_req.status = new_status
        friend_req.save()
        return Response({"message": f"İstek {new_status} olarak güncellendi."})


class FriendListView(ListAPIView):
    serializer_class = FriendSerializer

    def get_queryset(self):
        return Friend.objects.filter(
            user=self.request.user, 
            status='accepted'
        )
