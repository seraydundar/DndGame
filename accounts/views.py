# accounts/views.py

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.decorators import api_view, permission_classes,authentication_classes
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt

from rest_framework.authentication import SessionAuthentication

# CSRF kontrolünü devre dışı bırakmak için custom authentication sınıfı
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

# Modeller ve Serializer'lar
from .models import CustomUser, Friend, Notification
from .serializers import CustomUserSerializer, FriendSerializer, NotificationSerializer

# Lobi ile ilgili modeller (varsa)
from lobbies.models import Lobby, LobbyPlayer


class RegisterView(generics.CreateAPIView):
    """
    Kullanıcı kayıt view.
    POST /api/accounts/register/
    Body: { username, email, password }
    """
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [AllowAny]

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def custom_login_view(request):
    """
    Kullanıcı adı ve şifreyi doğrular, doğruysa giriş yapar.
    POST /api/accounts/login/
    Body: { "username": "...", "password": "..." }
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {"error": "username ve password alanları gereklidir."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"error": "Kullanıcı adı veya şifre yanlış."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Session bazlı login işlemi
    login(request, user)
    
    return Response(
        {
            "message": "Giriş başarılı.",
            "user_id": user.id,
            "username": user.username,
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"message": "Başarıyla çıkış yapıldı."}, status=status.HTTP_200_OK)

class NotificationListView(ListAPIView):
    """
    Giriş yapmış kullanıcının tüm bildirimlerini listeler.
    GET /api/accounts/notifications/
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        try:
            return Notification.objects.filter(user=self.request.user)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error("Error fetching notifications: %s", e, exc_info=True)
            raise e


class AddFriendView(APIView):
    """
    Arkadaşlık isteği gönderme endpoint'i.
    POST /api/accounts/friends/add/
    Body: { "friend_username": "<string>" }
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        friend_username = request.data.get("friend_username", "").strip()

        if not friend_username:
            return Response({"error": "Arkadaş kullanıcı adı gerekli."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friend_user = CustomUser.objects.get(username__iexact=friend_username)
        except CustomUser.DoesNotExist:
            return Response({"error": "Böyle bir kullanıcı bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        if friend_user.id == user.id:
            return Response({"error": "Kendini arkadaş ekleyemezsin."}, status=status.HTTP_400_BAD_REQUEST)

        if Friend.objects.filter(Q(user=user, friend_user=friend_user) | Q(user=friend_user, friend_user=user)).exists():
            return Response({"error": "Zaten isteğiniz veya arkadaşlık ilişkisi mevcut."}, status=status.HTTP_400_BAD_REQUEST)

        friend_request1 = Friend.objects.create(user=user, friend_user=friend_user, status="pending")
        Friend.objects.create(user=friend_user, friend_user=user, status="pending")

        Notification.objects.create(
            user=friend_user,
            message=f"{user.username} size arkadaşlık isteği gönderdi.",
            notification_type="friend_request",
            friend_request=friend_request1,
        )
        return Response({"message": "Arkadaş isteği gönderildi."}, status=status.HTTP_201_CREATED)


class RespondFriendRequestView(APIView):
    """
    Arkadaşlık isteğine yanıt ver (Kabul veya Reddet).
    PATCH /api/accounts/friends/respond/<notification_id>/
    Body: { "status": "accepted" or "rejected" }
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        try:
            notif = get_object_or_404(
                Notification,
                id=notification_id,
                notification_type='friend_request'
            )
            friend_request = notif.friend_request
            new_status = request.data.get('status')

            if new_status not in ['accepted', 'rejected']:
                return Response({"error": "Geçersiz durum."}, status=status.HTTP_400_BAD_REQUEST)

            if new_status == 'accepted':
                friend_request.status = 'friend'
                friend_request.save()

                reciprocal = Friend.objects.filter(
                    user=friend_request.friend_user,
                    friend_user=friend_request.user
                ).first()
                if reciprocal:
                    reciprocal.status = 'friend'
                    reciprocal.save()
                else:
                    Friend.objects.create(
                        user=friend_request.friend_user,
                        friend_user=friend_request.user,
                        status='friend'
                    )
            elif new_status == 'rejected':
                friend_request.delete()

            Notification.objects.filter(friend_request_id=friend_request.id).delete()

            return Response(
                {"message": f"Arkadaşlık isteği {new_status} olarak güncellendi."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SentFriendRequestsView(ListAPIView):
    """
    Giriş yapmış kullanıcının gönderdiği 'pending' durumundaki arkadaşlık isteklerini listeler.
    GET /api/accounts/friends/sent-requests/
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    serializer_class = FriendSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Friend.objects.filter(user=self.request.user, status='pending')


class FriendListView(APIView):
    """
    GET /api/accounts/friends/list/?user=<id>
    Kullanıcı parametresi varsa o kullanıcının, yoksa request.user'ın arkadaşlarını döner.
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_param = request.GET.get("user", None)
        if user_param:
            try:
                param_user = CustomUser.objects.get(id=user_param)
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            friends = Friend.objects.filter(user=param_user, status='friend')
        else:
            friends = Friend.objects.filter(user=request.user, status='friend')

        serializer = FriendSerializer(friends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# CSRF kontrolünü devre dışı bırakmak için özel authentication sınıfı
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication

# CSRF kontrolünü devre dışı bırakmak için özel authentication sınıfı
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def lobby_invite_view(request, lobby_id):
    """
    POST /api/accounts/lobbies/<lobby_id>/invite/
    Body: { "player_id": <int> }
    Lobiye davet edilecek kullanıcıya "lobby_invite" tipinde Notification ekler.
    """
    player_id = request.data.get("player_id")
    if not player_id:
        return Response({"error": "player_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lobby = Lobby.objects.get(lobby_id=lobby_id)
    except Lobby.DoesNotExist:
        return Response({"error": "Lobby not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        invited_user = CustomUser.objects.get(id=player_id)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if not Friend.objects.filter(user=request.user, friend_user=invited_user, status='friend').exists():
        return Response({"error": "You can only invite users who are your friends."}, status=status.HTTP_400_BAD_REQUEST)

    Notification.objects.create(
        user=invited_user,
        message=f"{request.user.username} has invited you to lobby '{lobby.lobby_name}'.",
        notification_type="lobby_invite",
        lobby_invite_id=lobby.lobby_id,
        invited_lobby_name=lobby.lobby_name
    )
    return Response({"message": "Lobby invite notification created."}, status=status.HTTP_201_CREATED)



@api_view(['PATCH'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def respond_lobby_invite(request, notification_id):
    """
    PATCH /api/accounts/lobby_invite/respond/<notification_id>/
    Body: { "status": "accepted" or "rejected" }
    Lobi davetini kabul/reddetme işlemi.
    """
    status_str = request.data.get('status')
    if status_str not in ['accepted', 'rejected']:
        return Response({"error": "Geçersiz durum."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        notif = Notification.objects.get(
            id=notification_id,
            notification_type='lobby_invite'
        )
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found or not a lobby_invite."}, status=status.HTTP_404_NOT_FOUND)

    if status_str == 'rejected':
        notif.delete()
        return Response({"message": "Lobby invite rejected, notification removed."}, status=status.HTTP_200_OK)

    lobby_id = notif.lobby_invite_id
    if not lobby_id:
        notif.delete()
        return Response({"error": "No lobby_invite_id found in notification."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lobby = Lobby.objects.get(lobby_id=lobby_id)
    except Lobby.DoesNotExist:
        notif.delete()
        return Response({"error": "Lobby not found. Notification removed."}, status=status.HTTP_404_NOT_FOUND)

    if LobbyPlayer.objects.filter(lobby=lobby, player_id=request.user.id).exists():
        notif.delete()
        return Response({"error": "You are already in this lobby."}, status=status.HTTP_400_BAD_REQUEST)

    LobbyPlayer.objects.create(lobby=lobby, player_id=request.user.id, is_ready=False)
    notif.delete()
    return Response({"message": f"Joined lobby '{lobby.lobby_name}' successfully!"}, status=status.HTTP_200_OK)
