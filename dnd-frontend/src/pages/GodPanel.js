// src/pages/GodPanel.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import DiceRoll from '../components/DiceRoll';
import socket from '../services/socket';
import './GodPanel.css';

const GodPanel = () => {
  const navigate = useNavigate();
const lobbyId = sessionStorage.getItem('lobby_id');


  const handleBattle = () => {
    socket.send(JSON.stringify({ event: "redirect", target: "battle" }));
    navigate(`/battle/${lobbyId}`);
  };

  const handleTrade = () => {
    socket.send(JSON.stringify({ event: "redirect", target: "trade" }));
    navigate('/trade');
  };

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

      {/* Friend Requests ve Notifications bölümü kaldırıldı */}
    </div>
  );
};

export default GodPanel;
