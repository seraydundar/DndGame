// src/pages/CreateLobby.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Lobbies.css';

const CreateLobby = () => {
  const [lobbyName, setLobbyName] = useState('');
  const navigate = useNavigate();

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    try {
      /* Backend "lobbies/create/" → {"lobby_id": 9, ...} döndürüyor */
      const { data } = await api.post('lobbies/create/', { lobby_name: lobbyName });
      alert('Lobi başarıyla oluşturuldu!');
      navigate(`/lobbies/${data.lobby_id}`);
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
