import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { WebSocketContext } from '../contexts/WebSocketContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { friendRequests, notifications } = useContext(WebSocketContext);

  const handleLogout = async () => {
    try {
      await api.post('accounts/logout/');
      localStorage.removeItem('user_id');
      navigate('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      alert('Çıkış yapılamadı.');
    }
  };

  useEffect(() => {
    console.log("Friend Requests:", friendRequests);
    console.log("Notifications:", notifications);
  }, [friendRequests, notifications]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleLogout}>Çıkış Yap</button>
      </div>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>
            <Link to="/charactercreation">Yeni Karakter Oluştur</Link>
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
      <div style={{ marginTop: '20px' }}>
        <h3>Bildirimler</h3>
        <p>Arkadaş İstekleri: {friendRequests.length}</p>
        <p>Genel Bildirimler: {notifications.length}</p>
      </div>
    </div>
  );
};

export default Dashboard;
