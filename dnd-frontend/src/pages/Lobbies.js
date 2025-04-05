import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
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
    <div style={styles.container}>
      <h2 style={styles.title}>Tüm Lobiler</h2>
      <div>
        <p><strong>Friend Requests:</strong> {friendRequests.length}</p>
        <p><strong>Notifications:</strong> {notifications.length}</p>
      </div>
      {lobbies.length === 0 ? (
        <p style={styles.empty}>Henüz bir lobiye katılmadınız.</p>
      ) : (
        <div style={styles.lobbyList}>
          {lobbies.map((lobby) => (
            <div key={lobby.lobby_id} style={styles.lobbyCard}>
              <h3 style={styles.lobbyName}>{lobby.lobby_name}</h3>
              <p style={styles.info}>
                <strong>GM:</strong> {lobby.gm_player_username || lobby.gm_player}
              </p>
              <p style={styles.info}>
                <strong>Durum:</strong> {lobby.is_active ? 'Aktif' : 'Pasif'}
              </p>
              <div style={styles.playersSection}>
                <strong>Katılan Oyuncular:</strong>
                {lobby.lobby_players && lobby.lobby_players.length > 0 ? (
                  <ul style={styles.playersList}>
                    {lobby.lobby_players.map((lp) => (
                      <li key={lp.id} style={styles.playerItem}>
                        {lp.player_username} {lp.is_ready ? '(Hazır)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.noPlayers}>Henüz katılan oyuncu yok.</p>
                )}
              </div>
              <button
                style={styles.detailButton}
                onClick={() => goToLobbyDetail(lobby.lobby_id)}
              >
                Lobiyi Gör
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.createSection}>
        <button style={styles.createButton} onClick={handleCreateLobby}>
          Lobi Oluştur
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    marginBottom: '20px',
  },
  empty: {
    fontStyle: 'italic',
  },
  lobbyList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
  },
  lobbyCard: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '15px',
    width: '300px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  lobbyName: {
    marginTop: 0,
    marginBottom: '10px',
  },
  info: {
    margin: '5px 0',
  },
  playersSection: {
    marginTop: '10px',
  },
  playersList: {
    listStyleType: 'disc',
    paddingLeft: '20px',
    margin: '5px 0',
  },
  playerItem: {
    fontSize: '0.9em',
  },
  noPlayers: {
    fontStyle: 'italic',
    fontSize: '0.9em',
    color: '#555',
  },
  detailButton: {
    marginTop: '10px',
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  createSection: {
    marginTop: '30px',
    textAlign: 'center',
  },
  createButton: {
    padding: '10px 15px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
  },
};

export default Lobbies;
