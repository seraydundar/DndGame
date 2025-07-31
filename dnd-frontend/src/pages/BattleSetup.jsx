// ====================================================================
// BattleSetup.jsx — 03 Tem 2025
// ====================================================================
import React, { useState } from 'react';
import './BattleSetup.css';
import api from '../services/api';
import { getBattleSocket } from '../services/battleSocket';

import forestPng  from '../assets/backgrounds/forest.png';
import dungeonJpg from '../assets/backgrounds/dungeon.jpg';
import castleJpg  from '../assets/backgrounds/castle.jpg';

export default function BattleSetup({
  isGM,
  lobbyId,
  placements: initialPlacements,
  availableCharacters,
  availableCreatures,
  onStartBattle,
  selectedBg,
  setSelectedBg,
}) {
  /* -------- GRID sabiti -------- */
  const COLS = 20;
  const ROWS = 20;
  const CELL_SIZE = 35;
  const ICON_SIZE = 30;
  const TOTAL_CELLS = COLS * ROWS;

  const [placements, setPlacements] = useState(initialPlacements || {});

  const handleBgChange = (e) => {
    const newBg = e.target.value;
    setSelectedBg(newBg);
    const sock = getBattleSocket();
    if (sock?.readyState === WebSocket.OPEN) {
      sock.send(
        JSON.stringify({
          event: 'battleUpdate',
          lobbyId,
          background: newBg,
        })
      );
    }
  };

  /* -------- Sunucuda canavar oluştur -------- */
  const spawnMonster = async (monsterId) => {
    const { data } = await api.post('characters/spawn-monster/', {
      monster_id: monsterId,
      lobby_id:   lobbyId,
    });
    return { ...data, icon_url: data.icon || null };
  };

  /* -------- Drag helpers -------- */
  const handleDragOver  = (e) => e.preventDefault();
  const handleDragStart = (e, item, type, sourceIndex = null) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id',   item.id);
    if (type === 'move' && sourceIndex !== null) {
      e.dataTransfer.setData('sourceIndex', sourceIndex);
    }
  };

  /* -------- Drop -------- */
  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    const type        = e.dataTransfer.getData('type');
    const id          = parseInt(e.dataTransfer.getData('id'), 10);
    const sourceIndex = e.dataTransfer.getData('sourceIndex');

    if (type === 'move' && sourceIndex !== '') {
      setPlacements((prev) => {
        const copy = { ...prev };
        delete copy[sourceIndex];
        return copy;
      });
    }

    let entity = null;
    if (type === 'player') {
      entity = availableCharacters.find((c) => c.id === id);
    } else if (type === 'creature') {
      try      { entity = await spawnMonster(id); }
      catch(er){ console.error('spawn-monster', er); return; }
    } else if (type === 'move') {
      entity = placements[sourceIndex];
    }

    if (entity) setPlacements((p) => ({ ...p, [targetIndex]: entity }));
  };

  /* -------- Savaşı başlat -------- */
  const handleStart = () => {
    if (Object.keys(placements).length === 0) {
      return alert('Haritaya en az bir birim yerleştirmelisiniz.');
    }
    onStartBattle(placements);
  };

  /* -------- Havuzlar -------- */
  const placedIds = Object.values(placements)
    .filter(Boolean)            // null/undefined hücreler hariç
    .map((p) => p.id);
  const remainingCharacters = availableCharacters.filter(
    (c) => !placedIds.includes(c.id),
  );
  const remainingCreatures = availableCreatures;

  /* -------- Grid Hücreleri -------- */
  const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => {
    const placed = placements[i];
    return (
      <div
        key={i}
        className={`cell ${placed ? 'reachable' : ''}`}
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
        onDragOver={handleDragOver}
        onDrop={(ev) => handleDrop(ev, i)}
      >
        {placed && (
          <img
            src={placed.icon_url || placed.icon || '/placeholder.png'}
            alt={placed.name}
            draggable={isGM}
            onDragStart={(ev) => handleDragStart(ev, placed, 'move', i)}
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        )}
      </div>
    );
  });

  /* -------- Render -------- */
  return (
    <div className="battle-setup">
      <h2>Karakterleri Yerleştir</h2>

      {/* Mekan seçimi */}
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="bgSelect"><strong>Mekan:</strong></label>
        <select
          id="bgSelect"
          value={selectedBg}
          onChange={handleBgChange}
          style={{ marginLeft: 8 }}
        >
          <option value={forestPng}>Orman</option>
          <option value={dungeonJpg}>Zindan</option>
          <option value={castleJpg}>Kale</option>
        </select>
      </div>

      {/* Grid + Sağ sütun */}
      <div className="setup-row">

        {/* GRID */}
        <div className="grid-panel">
          <div
            className="battle-grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, var(--cell))`,
              gridTemplateRows:    `repeat(${ROWS}, var(--cell))`,
            }}
          >
            {cells}
          </div>
        </div>

        {/* Sağ sütun (Karakter + Yaratık panelleri) */}
        <div className="pools-column">
          <div>
            <h3>Kalan Karakterler</h3>
            <div className="character-list">
              {remainingCharacters.map((ch) => (
                <div
                  key={ch.id}
                  className="character-tile"
                  draggable={isGM}
                  onDragStart={(ev) => handleDragStart(ev, ch, 'player')}
                >
                  <img src={ch.icon_url || ch.icon || '/placeholder.png'} alt={ch.name} />
                  <span>{ch.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Yaratık Havuzu</h3>
            <div className="creature-list">
              {remainingCreatures.map((cr) => (
                <div
                  key={cr.id}
                  className="character-tile"
                  draggable={isGM}
                  onDragStart={(ev) => handleDragStart(ev, cr, 'creature')}
                >
                  <img src={cr.icon_url || cr.icon || '/placeholder.png'} alt={cr.name} />
                  <span>{cr.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isGM && (
        <button className="start-button" onClick={handleStart}>
          Savaşı Başlat
        </button>
      )}
    </div>
  );
}
