import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket'; // Global native WebSocket nesnesi
import './Lobbies.css';

const CreateLobby = () => {
  const [lobbyName, setLobbyName] = useState('');
  const navigate = useNavigate();

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    try {
      // Lobi oluşturma isteği (POST: http://localhost:8000/api/lobbies/)
      const response = await api.post('lobbies/', {
        lobby_name: lobbyName
      });

      // WebSocket üzerinden yeni lobi bilgisi gönder
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          event: "lobbyCreated",
          lobby: response.data
        }));
      } else {
        console.log("WebSocket bağlantısı henüz açılmamış.");
      }

      alert('Lobi başarıyla oluşturuldu!');
      navigate('/lobbies');
    } catch (error) {
      console.error('Lobi oluşturma hatası:', error);
      alert('Lobi oluşturulamadı.');
    }
  };

  return (
    <div className="lobbies-wrapper">
      <div className="lobby-panel">
        <h2 className="lobbies-title">Yeni Lobi Oluştur</h2>
        <form className="lobby-form" onSubmit={handleCreateLobby}>
          <label htmlFor="lobbyName">Lobi Adı:</label>
          <input
            id="lobbyName"
            className="lobby-input"
            type="text"
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            required
          />
          <button className="lobby-button" type="submit">Oluştur</button>
        </form>
      </div>
    </div>
  );
};

export default CreateLobby;