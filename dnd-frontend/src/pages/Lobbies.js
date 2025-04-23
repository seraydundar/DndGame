import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Lobbies.css';
import { WebSocketContext } from '../contexts/WebSocketContext';

const Lobbies = () => {
  const [lobbies, setLobbies] = useState([]);
  const navigate = useNavigate();
  const { friendRequests, notifications } = useContext(WebSocketContext);

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
    navigate(`/lobbies/${lobbyId}`);
  };

  return (
    <div className="lobbies-container">
      <h2 className="lobbies-title">Tüm Lobiler</h2>
      <div className="lobbies-info">
        <p><strong>Friend Requests:</strong> {friendRequests.length}</p>
        <p><strong>Notifications:</strong> {notifications.length}</p>
      </div>

      {lobbies.length === 0 ? (
        <p className="empty-message">Henüz bir lobiye katılmadınız.</p>
      ) : (
        <div className="lobby-list">
          {lobbies.map((lobby) => (
            <div key={lobby.lobby_id} className="lobby-card">
              <h3>{lobby.lobby_name}</h3>
              <p><strong>GM:</strong> {lobby.gm_player_username || lobby.gm_player}</p>
              <p><strong>Durum:</strong> {lobby.is_active ? 'Aktif' : 'Pasif'}</p>

              <div>
                <strong>Katılan Oyuncular:</strong>
                {lobby.lobby_players && lobby.lobby_players.length > 0 ? (
                  <ul>
                    {lobby.lobby_players.map((lp) => (
                      <li key={lp.id}>
                        {lp.player_username} {lp.is_ready ? '(Hazır)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-message">Henüz katılan oyuncu yok.</p>
                )}
              </div>

              <button className="lobby-card-button" onClick={() => goToLobbyDetail(lobby.lobby_id)}>
                Lobiyi Gör
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="create-lobby-btn" onClick={handleCreateLobby}>
        Lobi Oluştur
      </button>
    </div>
  );
};

export default Lobbies;
