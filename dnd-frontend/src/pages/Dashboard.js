// src/pages/Dashboard.js

import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { WebSocketContext } from '../contexts/WebSocketContext';
import FriendSidebar from '../components/FriendSidebar';
import NotificationSidebar from '../components/NotificationSidebar';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const ctx = useContext(WebSocketContext) || {};
  const { friendRequests = [], notifications = [] } = ctx;

  useEffect(() => {
    console.log('Friend Requests:', friendRequests);
    console.log('Notifications:', notifications);
  }, [friendRequests, notifications]);

  const handleLogout = async () => {
    try {
      await api.post('accounts/logout/');
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      navigate('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      alert('Çıkış yapılamadı.');
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebars */}
      <div className="friend-panel">
        <FriendSidebar />
      </div>
      <div className="notification-panel">
        <NotificationSidebar />
      </div>

      {/* Main Dashboard Panel */}
      <div className="dashboard-main">
        <h2>Dashboard</h2>
        <button className="btn logout-btn" onClick={handleLogout}>
          Çıkış Yap
        </button>
        <nav className="dashboard-nav">
          <ul>
            <li>
              <Link to="/charactercreation">Yeni Karakter Oluştur</Link>
            </li>
            <li>
              <Link to="/spells">Tüm Büyüleri Görüntüle</Link>
            </li>
            <li>
              <Link to="/spells/create">Yeni Büyü Oluştur</Link>
            </li>
            <li>
              <Link to="/lobbies">Lobiye Katıl / Lobi Oluştur</Link>
            </li>
            <li>
              <Link to="/battle">Savaş Alanına Gir</Link>
            </li>
            <li>
              <Link to="/trade">Ticaret Alanına Gir</Link>
            </li>
            <li>
              <Link to="/chat">Sohbet Ekranı</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default Dashboard;
