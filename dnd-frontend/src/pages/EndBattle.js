import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const EndBattle = () => {
  const { lobbyId } = useParams();
  const [battleStats, setBattleStats] = useState(null);
  const currentUserId = parseInt(localStorage.getItem("user_id") || '0', 10);
  const [gmId, setGmId] = useState(null);

  useEffect(() => {
    const fetchBattleStats = async () => {
      const res = await api.get(`battle-state/${lobbyId}/`);
      setBattleStats(res.data);
    };

    const fetchLobbyData = async () => {
      const res = await api.get(`lobbies/${lobbyId}/`);
      setGmId(res.data.gm_player);
    };

    fetchBattleStats();
    fetchLobbyData();
  }, [lobbyId]);

  const handleContinue = () => {
    if (currentUserId === gmId) {
      window.location.href = '/godpanel';
    } else {
      window.location.href = '/playerpage';
    }
  };

  if (!battleStats) return <div>İstatistikler yükleniyor...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Savaş Bitti!</h2>
      <div>
        <h3>İstatistikler:</h3>
        {/* Şimdilik basit bir yapı, detaylandırılacak */}
        <pre>{JSON.stringify(battleStats, null, 2)}</pre>
      </div>
      <button onClick={handleContinue} style={{ padding: '10px 20px', marginTop: '20px' }}>
        Devam Et
      </button>
    </div>
  );
};

export default EndBattle;
