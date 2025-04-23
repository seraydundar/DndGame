import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiceRoll from '../components/DiceRoll';
import { WebSocketContext } from '../contexts/WebSocketContext';
import socket from '../services/socket';
import './GodPanel.css';

const GodPanel = () => {
  const navigate = useNavigate();
  const { friendRequests, notifications } = useContext(WebSocketContext);

  const handleBattle = () => {
    socket.send(JSON.stringify({ event: "redirect", target: "battle" }));
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
    <div className="god-panel">
      <h2>GM Panel (GodPanel)</h2>

      <div className="gp-buttons">
        <button className="gp-button" onClick={handleBattle}>
          Battle Screen
        </button>
        <button className="gp-button" onClick={handleTrade}>
          Trade Screen
        </button>
      </div>

      <hr className="gp-divider" />

      <h3 className="gp-section-title">Zar Atma (D20)</h3>
      <div className="gp-diceroll-container">
        <DiceRoll />
      </div>

      <div className="gp-stats">
        <p><strong>Friend Requests:</strong> {friendRequests.length}</p>
        <p><strong>Notifications:</strong> {notifications.length}</p>
      </div>
    </div>
  );
};

export default GodPanel;
