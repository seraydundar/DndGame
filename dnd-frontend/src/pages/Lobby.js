import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

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
    const intervalId = setInterval(() => {
      fetchLobby();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [id]);

  // WebSocket mesajlarını dinleyerek lobideki güncellemeleri de alıyoruz.
  useEffect(() => {
    if (!lobby) return;
    const messageHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "gameStarted") {
          navigate(currentUserId === lobby.gm_player ? "/godpanel" : "/playerpage");
        }
        if (
          data.event === "playerReadyUpdate" ||
          data.event === "playerJoined" ||
          data.event === "lobbyUpdate"
        ) {
          fetchLobby();
        }
      } catch (error) {
        console.error("Mesaj ayrıştırma hatası:", error);
      }
    };
    socket.addEventListener("message", messageHandler);
    return () => socket.removeEventListener("message", messageHandler);
  }, [lobby, currentUserId, navigate]);

  // Lobiye katıldığında diğer oyunculara bildiriyoruz.
  useEffect(() => {
    const sendPlayerJoined = async () => {
      if (lobby && !hasJoined) {
        if (socket.readyState !== WebSocket.OPEN) {
          await sleep(1000);
        }
        socket.send(JSON.stringify({ event: "playerJoined", lobbyId: lobby.lobby_id }));
        setHasJoined(true);
      }
    };
    sendPlayerJoined();
  }, [lobby, hasJoined]);

  // Davet için
  const handleInviteFriend = async () => {
    if (!selectedFriend) {
      alert('Davet edeceğin arkadaşı seç!');
      return;
    }
    try {
      await api.post(`accounts/lobbies/${id}/invite/`, { player_id: selectedFriend });
      alert('Arkadaş başarıyla davet edildi!');
    } catch (error) {
      console.error('Oyuncu davet hatası:', error);
      alert('Oyuncu davet edilemedi.');
    }
  };

  // Karakter silme işlemi
  const handleDeleteCharacter = async (characterId) => {
    try {
      await api.delete(`characters/${characterId}/`);
      setMyCharacters(myCharacters.filter((char) => char.id !== characterId));
      alert('Karakter silindi!');
    } catch (error) {
      console.error('Karakter silme hatası:', error);
      alert('Karakter silinemedi.');
    }
  };

  // GM için oyunu başlatma
  const handleStartGame = async () => {
    try {
      if (socket.readyState !== WebSocket.OPEN) {
        await new Promise((resolve) => {
          socket.addEventListener("open", resolve, { once: true });
        });
      }
      socket.send(JSON.stringify({ event: "startGame", lobbyId: lobby.lobby_id }));
      navigate("/godpanel");
    } catch (error) {
      console.error("Oyun başlatma hatası:", error);
      alert("Oyun başlatılamadı.");
    }
  };

  // Ready toggle: oyuncu karakterini seçip hazır dediğinde
  const handleReadyToggle = async () => {
    if (!selectedCharacter && myCharacters.length > 0) {
      return alert("Önce bir karakter seçmelisin!");
    }
    const newReadyStatus = !isReady;
    try {
      await api.patch(`lobbies/${id}/players/${currentUserId}/ready/`, {
        is_ready: newReadyStatus,
        character_id: selectedCharacter
      });
      setIsReady(newReadyStatus);
      if (socket.readyState !== WebSocket.OPEN) {
        await sleep(1000);
      }
      socket.send(JSON.stringify({ event: "playerReadyUpdate", lobbyId: lobby.lobby_id }));
      const response = await api.get(`lobbies/${id}/`);
      setLobby(response.data);
      if (!response.data.is_active) {
        navigate(currentUserId === response.data.gm_player ? "/godpanel" : "/playerpage");
      }
    } catch (error) {
      console.error("Hazır durum güncelleme hatası:", error);
      alert("Hazır durumu güncellenemedi.");
    }
  };

  const filteredFriends = lobby
    ? friends.filter((friend) => {
        const friendId = friend.friend_user.id;
        return !lobby.lobby_players.some(lp => lp.player === friendId);
      })
    : [];

  if (!lobby) {
    return <div style={{ padding: '20px' }}>Lobi bilgisi yükleniyor...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>{lobby.lobby_name} Lobisi</h2>
      <p>
        <strong>GM:</strong> {lobby.gm_player_username || lobby.gm_player}
      </p>
      <p>
        <strong>Durum:</strong> {lobby.is_active ? 'Aktif' : 'Oyun Başlatıldı'}
      </p>

      <h3>Oyuncular</h3>
      {lobby.lobby_players && lobby.lobby_players.length > 0 ? (
        <ul>
          {lobby.lobby_players.map((lp) => (
            <li key={lp.id}>
              {lp.player_username} {lp.is_ready ? '✅' : '❌'}
              {lp.is_ready && lp.character ? (
                <> - {lp.character.name} ({lp.character.race} / {lp.character.character_class})</>
              ) : lp.is_ready && !lp.character && lp.player === currentUserId ? (
                (() => {
                  const myChar = myCharacters.find(c => c.id === parseInt(selectedCharacter));
                  return myChar ? <> - {myChar.name} ({myChar.race} / {myChar.character_class})</> : null;
                })()
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>Henüz katılan oyuncu yok.</p>
      )}

      <h3>Arkadaş Davet Et</h3>
      <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
        <option value="">--Arkadaş Seç--</option>
        {filteredFriends.map((friend) => (
          <option key={friend.id} value={friend.friend_user.id}>
            {friend.friend_username}
          </option>
        ))}
      </select>
      <button onClick={handleInviteFriend}>Davet Et</button>

      {currentUserId !== lobby.gm_player && (
        <>
          <h3>Karakterlerim</h3>
          <select value={selectedCharacter} onChange={(e) => setSelectedCharacter(e.target.value)}>
            <option value="">--Karakter Seç--</option>
            {myCharacters.map((c) => (
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
        </>
      )}

      {currentUserId === lobby.gm_player && (
        <button onClick={handleStartGame}>Oyunu Başlat (GM)</button>
      )}

      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate('/lobbies')}>Tüm Lobiler</button>
      </div>
    </div>
  );
};

export default Lobby;
