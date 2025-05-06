// src/pages/Lobbies.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Lobbies.css';

const Lobbies = () => {
  const [lobbies, setLobbies] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLobbies = async () => {
      try {
        const response = await api.get('lobbies/');
        setLobbies(response.data);
      } catch (error) {
        console.error('Lobi listesi alınamadı:', error);
      }
    };
    fetchLobbies();
  }, []);

  const handleCreateLobby = () => {
    navigate('/lobbies/create');
  };

  const goToLobbyDetail = (lobbyId) => {
    // Seçilen lobi ID'sini sessionStorage'a kaydet
    sessionStorage.setItem('lobby_id', lobbyId);
    // Mevcut user_id'yi header olarak ayarla (isteğe bağlı)
    const userId = sessionStorage.getItem('user_id');
    if (userId) {
      api.defaults.headers.common['X-User-Id'] = userId;
    } else {
      console.warn('sessionStorage["user_id"] bulunamadı; login akışını kontrol edin.');
    }
    // Ardından ilgili lobi sayfasına yönlendir
    navigate(`/lobbies/${lobbyId}`);
  };

  return (
    <div className="lobbies-container">
      <h2 className="lobbies-title">All Lobbies</h2>

      {lobbies.length === 0 ? (
        <p className="empty-message">Henüz bir lobiye katılmadınız.</p>
      ) : (
        <div className="lobby-list">
          {lobbies.map((lobby) => (
            <div key={lobby.lobby_id} className="lobby-card">
              <h3>{lobby.lobby_name}</h3>
              <p>
                <strong>GM:</strong> {lobby.gm_player_username || lobby.gm_player}
              </p>
              <p>
                <strong>Status:</strong> {lobby.is_active ? 'Active' : 'Pasif'}
              </p>

              <div>
                <strong>Joined Users:</strong>
                {lobby.lobby_players && lobby.lobby_players.length > 0 ? (
                  <ul>
                    {lobby.lobby_players.map((lp) => (
                      <li key={lp.id}>
                        {lp.player_username} {lp.is_ready ? '(Hazır)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-message">There is no Joined User</p>
                )}
              </div>

              <button
                className="lobby-card-button"
                onClick={() => goToLobbyDetail(lobby.lobby_id)}
              >
                Show Lobby
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="create-lobby-btn" onClick={handleCreateLobby}>
        Create New Lobby
      </button>
    </div>
  );
};

export default Lobbies;
