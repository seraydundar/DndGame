# accounts/urls.py
from django.urls import path
from .views import (custom_login_view,logout_view,
    RegisterView, NotificationListView, AddFriendView, 
    SentFriendRequestsView, RespondFriendRequestView, FriendListView,
    lobby_invite_view, respond_lobby_invite  # <-- importladık
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('friends/add/', AddFriendView.as_view(), name='friend-add'),
    path('friends/sent-requests/', SentFriendRequestsView.as_view(), name='sent-requests'),
    path('friends/respond/<int:notification_id>/', RespondFriendRequestView.as_view(), name='friend-respond'),
    path('friends/list/', FriendListView.as_view(), name='friends-list'),
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
    path('login/', custom_login_view, name='custom_login'),
    path('logout/', logout_view, name='logout'),

    # Lobi daveti
    path('lobbies/<int:lobby_id>/invite/', lobby_invite_view, name='lobby-invite'),
    path('lobby_invite/respond/<int:notification_id>/', respond_lobby_invite, name='respond-lobby-invite'),
    
]
