// src/pages/GodPanel.js
import React, { useEffect, useState } from 'react';
import { useNavigate }                from 'react-router-dom';
import socket                         from '../services/socket';
import api                            from '../services/api';
import './GodPanel.css';

export default function GodPanel() {
  const navigate    = useNavigate();
  const lobbyId     = sessionStorage.getItem('lobby_id');
  const [chars, setChars] = useState([]);

  // 1) Tüm karakterleri çek, sonra client-side’da lobby_id’ye göre filtrele
  useEffect(() => {
    api.get('characters/')
      .then(res => {
        const all = res.data;
        const filtered = lobbyId
          ? all.filter(c => String(c.lobby_id) === String(lobbyId))
          : [];
        console.log(
          `[GodPanel] fetched ${all.length} characters, filtered for lobby ${lobbyId}:`,
          filtered
        );
        setChars(filtered);
      })
      .catch(err => console.error('GodPanel karakter çekme hatası:', err));
  }, [lobbyId]);

  // 2) GM “Savaş Ekranına Geç” dediğinde tüm client’ları yönlendir
  const handleBattle = () => {
    socket.send(JSON.stringify({ event: 'redirect', target: 'battle' }));
    navigate(`/battle/${lobbyId}`);
  };

  return (
    <div className="god-panel">
      <h2>GM Panel (GodPanel)</h2>

      <button className="gp-button" onClick={handleBattle}>
        Savaş Ekranına Geç
      </button>

      <hr className="gp-divider" />

      <h3>Lobi Karakterleri</h3>
      <div className="gp-character-list">
        {chars.length > 0 ? (
          chars.map(c => (
            <div key={c.id} className="gp-char-card">
              <h4>{c.name}</h4>
              <p><strong>Level:</strong> {c.level}</p>
              <p><strong>HP:</strong> {c.hp}</p>
              <p>
                <strong>XP:</strong>{' '}
                {c.xp} /{' '}
                {typeof c.level === 'number'
                  ? 100 * (2 ** (c.level - 1))
                  : '-'}
              </p>
              <p><strong>Gold:</strong> {c.gold}</p>

              <section className="gp-stats">
                <h5>Stats</h5>
                <ul>
                  <li>STR: {c.strength}</li>
                  <li>DEX: {c.dexterity}</li>
                  <li>CON: {c.constitution}</li>
                  <li>INT: {c.intelligence}</li>
                  <li>WIS: {c.wisdom}</li>
                  <li>CHA: {c.charisma}</li>
                </ul>
              </section>
            </div>
          ))
        ) : (
          <p>Henüz bu lobiye ait karakter yok.</p>
        )}
      </div>
    </div>
  );
}
