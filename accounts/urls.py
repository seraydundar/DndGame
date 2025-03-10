# accounts/urls.py
from django.urls import path
from .views import (AddFriendView, IncomingFriendRequestsView, RespondFriendRequestView, FriendListView, RegisterView,NotificationListView)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('friends/add/', AddFriendView.as_view(), name='friend-add'),
    path('friends/requests/', IncomingFriendRequestsView.as_view(), name='friend-requests'),
    path('friends/respond/<int:friend_id>/', RespondFriendRequestView.as_view(), name='friend-respond'),
    path('friends/list/', FriendListView.as_view(), name='friends-list'),
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
]
