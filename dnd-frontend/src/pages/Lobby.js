// src/pages/Lobby.js
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import usePersistentWebSocket from '../hooks/usePersistentWebSocket';
import './Lobbies.css';
import { createBattleSocket } from '../services/battleSocket';

const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
delete api.defaults.headers.common['X-User-Id'];

export default function Lobby() {
  const { id: lobbyId } = useParams();            // route: /lobbies/:lobbyId
  const navigate       = useNavigate();
  const currentUserId  = Number(localStorage.getItem('user_id') || 0);

  useEffect(() => {
    const socket = createBattleSocket(lobbyId, msg => {
      console.log('[Lobby] battle WS mesajı:', msg);
      if (msg.event === 'battleStart') {
        console.log('[Lobby] battleStart alındı, BattlePage’e geçiliyor');
        navigate(`/battle/${lobbyId}`, { state: { init: msg } });
      }
    });
    return () => socket?.close();
  }, [lobbyId, navigate]);

  /* — State — */
  const [lobby,        setLobby]        = useState(null);
  const [friends,      setFriends]      = useState([]);
  const [characters,   setCharacters]   = useState([]);
  const [selFriend,    setSelFriend]    = useState('');
  const [selChar,      setSelChar]      = useState('');
  const [isReady,      setIsReady]      = useState(false);
  const [hasJoined,    setHasJoined]    = useState(false);

  /* — API çağrıları — */
  const fetchLobby = async () => {
    try {
      const { data } = await api.get(`lobbies/${lobbyId}/`);
      setLobby(data);
      const me = data.lobby_players.find(p => p.player.id === currentUserId);
      setIsReady(me?.is_ready ?? false);
      setSelChar(me?.character?.id ?? '');
    } catch (err) {
      console.error('Lobi alınamadı:', err);
    }
  };

  const fetchFriends = () =>
    api
      .get(`accounts/friends/list/?user=${currentUserId}`)
      .then(res => setFriends(res.data))
      .catch(console.error);

  const fetchCharacters = () =>
    api
      .get(`lobbies/${lobbyId}/characters/`)
      .then(res => {
        const myChars = res.data.filter(c => c.player_id === currentUserId);
        setCharacters(myChars);
      })
      .catch(console.error);

  /* — Yaşam döngüsü — */
  useEffect(() => {
    fetchLobby();
    fetchFriends();
    fetchCharacters();
  }, [lobbyId]);

  useEffect(() => {
    const timer = setInterval(fetchLobby, 3000);
    return () => clearInterval(timer);
  }, [lobbyId]);

  /* — WebSocket — */
  const wsHandler = useCallback(
    data => {
      if (!data) return;
      if (data.event === 'gameStarted') {
        const path = currentUserId === lobby?.gm_player ? '/godpanel' : '/playerpage';
        navigate(path);
      }
      if (data.event === 'redirect' && data.target === 'battle') {
        navigate(`/battle/${lobbyId}`);
      }
      if (['playerReadyUpdate','playerJoined','lobbyUpdate'].includes(data.event)) {
        fetchLobby();
      }
    },
    [lobby, navigate, currentUserId]
  );

  const lobbyWS = usePersistentWebSocket(
    lobbyId ? `${WS_BASE}/ws/lobby/${lobbyId}/` : null,
    { onMessage: wsHandler }
  );
  const sendWS = payload => {
    if (lobbyWS.current?.readyState === WebSocket.OPEN) {
      lobbyWS.current.send(JSON.stringify(payload));
    }
  };

  /* — Lobiye ilk katılım bildirimi — */
  useEffect(() => {
    if (lobby && !hasJoined) {
      sendWS({ event: 'playerJoined', lobbyId });
      setHasJoined(true);
    }
  }, [lobby, hasJoined]);

  const isGM = lobby?.gm_player === currentUserId;

  /* — Sadece lobide olmayan arkadaşlar — */
  const availableFriends = useMemo(() => {
    const inLobbyIds = new Set(lobby?.lobby_players.map(p => p.player.id) || []);
    return friends.filter(f => !inLobbyIds.has(f.friend_user.id));
  }, [friends, lobby]);

   // Lobby'den ayrılırken hazır değil olarak işaretle
  useEffect(() => {
    return () => {
      api
        .patch(`lobbies/${lobbyId}/players/${currentUserId}/ready/`, {
          is_ready: false,
        })
        .catch(() => {});
    };
  }, [lobbyId, currentUserId]);


  /* — Handlers — */
  const inviteFriend = async () => {
    if (!selFriend) return alert('Önce arkadaş seç!');
    try {
      await api.post(
        `accounts/lobbies/${lobbyId}/invite/`,
        { player_id: selFriend }
      );
      sendWS({ event: 'lobbyUpdate', lobbyId });
      alert('Davet gönderildi!');
      setSelFriend('');
    } catch (e) {
      console.error(e);
      alert('Davet eklenemedi.');
    }
  };

  const toggleReady = async () => {
    if (!selChar && characters.length) return alert('Önce karakter seç!');
    try {
      await api.patch(
        `lobbies/${lobbyId}/players/${currentUserId}/ready/`,
        { is_ready: !isReady, character_id: selChar || null }
      );
      setIsReady(r => !r);
      sendWS({ event: 'playerReadyUpdate', lobbyId });
    } catch (e) {
      console.error(e);
      alert('Hazır durumu güncellenemedi.');
    }
  };

  const startGame = () => {
    sendWS({ event: 'startGame', lobbyId });
  };

  if (!lobby) return <h2>Lobi bilgisi yükleniyor...</h2>;

  return (
    <div className="lobby-container">
      <h1>Lobby: {lobby.lobby_name}</h1>

      {/* — Oyuncular — */}
      <section className="lobby-players">
        <h2>Advanturers</h2>
        <ul>
          {lobby.lobby_players.map(lp => (
            <li key={lp.id}>
              {lp.player_username} {/* Serializer’dan geliyor :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5} */}
              {lp.is_ready ? ' ✅' : ' ⏳'}
              {lp.character && ` — ${lp.character.name}`}
            </li>
          ))}
        </ul>
      </section>

      {/* — GM: Arkadaş davet — */}
      {isGM && (
        <section className="lobby-gm">
          <h3>Inivte Advanturers</h3>
          <select
            value={selFriend}
            onChange={e => setSelFriend(Number(e.target.value))}
          >
            <option value="">--Select Advanturers--</option>
            {availableFriends.map(f => (
              <option
                key={f.id}
                value={f.friend_user.id}
              >
                {f.friend_username} {/* Serializer’dan geliyor :contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7} */}
              </option>
            ))}
          </select>
          <button onClick={inviteFriend}>Invite</button>
        </section>
      )}

      {/* — Player: Karakter seç & hazır ol — */}
      {!isGM && (
        <section className="lobby-player">
          <h3>Select Characater / Ready</h3>
          {selChar ? (
            <p>Character: {characters.find(c => c.id === selChar)?.name}</p>
          ) : (
            <>
              <select
                value={selChar}
                onChange={e => setSelChar(Number(e.target.value))}
              >
                <option value="">--Select Characater--</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {characters.length === 0 && (
                <button
                  onClick={() =>
                    navigate(`/lobbies/${lobbyId}/character-creation`)
                  }
                >
                  Create Character
                </button>
              )}
            </>
          )}
          <button onClick={toggleReady}>
            {isReady ? 'Hazır Değil' : 'Hazırım'}
          </button>
        </section>
      )}

      {isGM && (
        <button className="lobby-start-btn" onClick={startGame}>
          Start Game
        </button>
      )}
      <button
        className="lobby-back-btn"
        onClick={() => navigate('/lobbies')}
      >
        All Lobbies
      </button>
    </div>
  );
}
