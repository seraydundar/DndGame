// src/pages/Lobby.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import './Lobbies.css';

// Eğer global olarak ayarlanmışsa, custom X-User-Id header’ını bu sayfada kaldır
delete api.defaults.headers.common['X-User-Id'];

// Basit bir sleep fonksiyonu
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Lobby = () => {
  const { id } = useParams();
  const [lobby, setLobby] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [myCharacters, setMyCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const navigate = useNavigate();

  // user_id artık localStorage'de tutuluyor
  const currentUserId = parseInt(localStorage.getItem("user_id") || '0', 10);

  // Lobinin, arkadaşların ve karakterlerin verisini çekiyoruz.
  const fetchLobby = async () => {
    try {
      const response = await api.get(`lobbies/${id}/`);
      setLobby(response.data);
    } catch (error) {
      console.error('Lobi alınamadı:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get(`accounts/friends/list/?user=${currentUserId}`);
      setFriends(response.data);
    } catch (error) {
      console.error('Arkadaş listesi alınamadı:', error);
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await api.get(`characters/`);
      const filtered = response.data.filter(
        (character) =>
          character.player_id === currentUserId &&
          character.lobby_id === Number(id)
      );
      setMyCharacters(filtered);
    } catch (error) {
      console.error('Karakterler alınamadı:', error);
    }
  };

  useEffect(() => {
    fetchLobby();
    fetchFriends();
    fetchCharacters();
  }, [id, currentUserId]);

  // Periyodik güncelleme: Her 3 saniyede bir lobiyi güncelliyoruz.
  useEffect(() => {
    const intervalId = setInterval(fetchLobby, 3000);
    return () => clearInterval(intervalId);
  }, [id]);

  // WebSocket mesajlarını dinleyerek lobideki güncellemeleri alıyoruz.
  useEffect(() => {
    if (!lobby) return;
    const handler = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "gameStarted") {
          navigate(currentUserId === lobby.gm_player ? "/godpanel" : "/playerpage");
        }
        if (["playerReadyUpdate","playerJoined","lobbyUpdate"].includes(data.event)) {
          fetchLobby();
        }
      } catch (e) {
        console.error("WS mesaj ayrıştırma hatası:", e);
      }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [lobby, currentUserId, navigate]);

  // Lobiye katıldığında diğer oyunculara bildiriyoruz.
  useEffect(() => {
    const joinNotify = async () => {
      if (lobby && !hasJoined) {
        if (socket.readyState !== WebSocket.OPEN) {
          await sleep(1000);
        }
        socket.send(JSON.stringify({ event: "playerJoined", lobbyId: lobby.lobby_id }));
        setHasJoined(true);
      }
    };
    joinNotify();
  }, [lobby, hasJoined]);

  const handleInviteFriend = async () => {
    if (!selectedFriend) return alert('Davet edeceğin arkadaşı seç!');
    try {
      await api.post(`accounts/lobbies/${id}/invite/`, { player_id: selectedFriend });
      alert('Arkadaş başarıyla davet edildi!');
    } catch (e) {
      console.error('Davet hatası:', e);
      alert('Oyuncu davet edilemedi.');
    }
  };

  const handleReadyToggle = async () => {
    if (!selectedCharacter && myCharacters.length > 0) {
      return alert("Önce bir karakter seçmelisin!");
    }
    const newReady = !isReady;
    try {
      await api.patch(`lobbies/${id}/players/${currentUserId}/ready/`, {
        is_ready: newReady,
        character_id: selectedCharacter
      });
      setIsReady(newReady);
      if (socket.readyState !== WebSocket.OPEN) {
        await sleep(1000);
      }
      socket.send(JSON.stringify({ event: "playerReadyUpdate", lobbyId: lobby.lobby_id }));
      const resp = await api.get(`lobbies/${id}/`);
      setLobby(resp.data);
      if (!resp.data.is_active) {
        navigate(currentUserId === resp.data.gm_player ? "/godpanel" : "/playerpage");
      }
    } catch (e) {
      console.error("Hazır durum güncelleme hatası:", e);
      alert("Hazır durumu güncellenemedi.");
    }
  };

  const handleStartGame = async () => {
    try {
      if (socket.readyState !== WebSocket.OPEN) {
        await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
      }
      socket.send(JSON.stringify({ event: "startGame", lobbyId: lobby.lobby_id }));
      navigate("/godpanel");
    } catch (e) {
      console.error("Oyun başlatma hatası:", e);
      alert("Oyun başlatılamadı.");
    }
  };

  const filteredFriends = lobby
    ? friends.filter(f => !lobby.lobby_players.some(lp => lp.player === f.friend_user.id))
    : [];

  if (!lobby) {
    return <div className="lobby-detail-container">Lobi bilgisi yükleniyor...</div>;
  }

  return (
    <div className="lobby-detail-container">
      <h2>{lobby.lobby_name} Lobisi</h2>
      <div className="lobby-detail-info">
        <p><strong>GM:</strong> {lobby.gm_player_username || lobby.gm_player}</p>
        <p><strong>Durum:</strong> {lobby.is_active ? 'Aktif' : 'Oyun Başlatıldı'}</p>
      </div>

      <div className="lobby-players-section">
        <h3>Oyuncular</h3>
        {lobby.lobby_players.length > 0 ? (
          <ul className="lobby-players-list">
            {lobby.lobby_players.map(lp => (
              <li key={lp.id}>
                {lp.player_username} {lp.is_ready ? '✅' : '❌'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-message">Henüz katılan oyuncu yok.</p>
        )}
      </div>

      <div className="lobby-invite-section">
        <h3>Arkadaş Davet Et</h3>
        <select
          value={selectedFriend}
          onChange={e => setSelectedFriend(e.target.value)}
        >
          <option value="">--Arkadaş Seç--</option>
          {filteredFriends.map(f => (
            <option key={f.id} value={f.friend_user.id}>
              {f.friend_username}
            </option>
          ))}
        </select>
        <button onClick={handleInviteFriend}>Davet Et</button>
      </div>

      {currentUserId !== lobby.gm_player && (
        <div className="lobby-ready-section">
          <h3>Karakterlerim</h3>
          <select
            value={selectedCharacter}
            onChange={e => setSelectedCharacter(e.target.value)}
          >
            <option value="">--Karakter Seç--</option>
            {myCharacters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {myCharacters.length === 0 && (
            <button onClick={() => navigate(`/lobbies/${id}/character-creation`)}>
              Karakter Oluştur
            </button>
          )}
          <button onClick={handleReadyToggle}>
            {isReady ? "Hazır Değilim ❌" : "Hazırım ✅"}
          </button>
        </div>
      )}

      {currentUserId === lobby.gm_player && (
        <button className="lobby-start-btn" onClick={handleStartGame}>
          Oyunu Başlat (GM)
        </button>
      )}

      <button className="lobby-back-btn" onClick={() => navigate('/lobbies')}>
        Tüm Lobiler
      </button>
    </div>
  );
};

export default Lobby;
