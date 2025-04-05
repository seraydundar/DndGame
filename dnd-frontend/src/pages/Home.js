import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WebSocketContext } from '../contexts/WebSocketContext';

const Home = () => {
  const { friendRequests, notifications } = useContext(WebSocketContext);

  useEffect(() => {
    console.log("Home - Friend Requests:", friendRequests);
    console.log("Home - Notifications:", notifications);
  }, [friendRequests, notifications]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Home</h2>
      <p>Welcome to the D&D Game!</p>
      <Link to="/dashboard">Go to Dashboard</Link>
      <div style={{ marginTop: '20px' }}>
        <p><strong>Friend Requests:</strong> {friendRequests.length}</p>
        <p><strong>Notifications:</strong> {notifications.length}</p>
      </div>
    </div>
  );
};

export default Home;
