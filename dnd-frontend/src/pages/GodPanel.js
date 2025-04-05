import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiceRoll from '../components/DiceRoll';
import { WebSocketContext } from '../contexts/WebSocketContext';
import socket from '../services/socket';

const GodPanel = () => {
  const navigate = useNavigate();
  const { friendRequests, notifications } = useContext(WebSocketContext);

  const handleBattle = () => {
    // GM butona bastığında WebSocket mesajı gönderiliyor.
    socket.send(JSON.stringify({ event: "redirect", target: "battle" }));
    // GM kendi ekranında yönlendiriliyor.
    navigate('/battle');
  };

  const handleTrade = () => {
    socket.send(JSON.stringify({ event: "redirect", target: "trade" }));
    navigate('/trade');
  };

  useEffect(() => {
    console.log("GodPanel - Friend Requests:", friendRequests);
    console.log("GodPanel - Notifications:", notifications);
  }, [friendRequests, notifications]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>GM Panel (GodPanel)</h2>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleBattle}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            fontSize: '16px',
          }}
        >
          Battle Screen
        </button>
        <button
          onClick={handleTrade}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            fontSize: '16px',
          }}
        >
          Trade Screen
        </button>
      </div>
      <hr style={{ margin: '20px 0' }} />
      <h3>Zar Atma (D20)</h3>
      <DiceRoll />
      <div style={{ marginTop: '20px' }}>
        <p><strong>Friend Requests:</strong> {friendRequests.length}</p>
        <p><strong>Notifications:</strong> {notifications.length}</p>
      </div>
    </div>
  );
};

export default GodPanel;
