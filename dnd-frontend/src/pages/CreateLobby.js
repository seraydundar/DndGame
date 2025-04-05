import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket'; // Global native WebSocket nesnesi

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

      // Eğer WebSocket bağlantısı açık ise, yeni lobi oluşturulduğuna dair mesaj gönderiyoruz
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          event: "lobbyCreated",
          lobby: response.data  // Sunucudan dönen yeni lobi bilgileri
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
    <div style={{ padding: '20px' }}>
      <h2>Yeni Lobi Oluştur</h2>
      <form onSubmit={handleCreateLobby}>
        <label>Lobi Adı:</label>
        <input
          type="text"
          value={lobbyName}
          onChange={(e) => setLobbyName(e.target.value)}
          required
        />
        <button type="submit">Oluştur</button>
      </form>
    </div>
  );
};

export default CreateLobby;
