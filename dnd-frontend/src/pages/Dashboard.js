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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Background video */}
      <video
        src="/backgroundvideo.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      {/* Sidebars */}
      <div className="friend-panel">
        <FriendSidebar requests={friendRequests} />
      </div>
      <div className="notification-panel">
        <NotificationSidebar notifications={notifications} />
      </div>

      {/* Main Dashboard Panel */}
      <div className="dashboard-main">
        <h2>Dashboard</h2>
        <button className="btn logout-btn" onClick={handleLogout}>
          Logout
        </button>

        <nav className="dashboard-nav">
          <ul>
            <li>
              <Link to="/spells">List All Spells</Link>
            </li>
            <li>
              <Link to="/spells/create">Create New Spell</Link>
            </li>
            <li>
              <Link to="/items">List All Items</Link>
            </li>
            <li>
              <Link to="/items/create">Create New Item</Link>
            </li>
            <li>
              <Link to="/creatures">List All Creatures</Link>
            </li>
            <li>
              <Link to="/creatures/create">Create New Creature</Link>
            </li>
            <li>
              <Link to="/lobbies">Join Lobby/Create Lobby</Link>
            </li>
            <li>
              <Link to="/battle">Create Battle Area</Link>
            </li>
            <li>
              <Link to="/chat">Chat</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;
