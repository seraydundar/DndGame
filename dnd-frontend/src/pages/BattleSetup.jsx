// src/components/BattleSetup.jsx
import React, { useState } from 'react';
import './BattleSetup.css';
import api from '../services/api';          // axios instance’in

export default function BattleSetup({
  isGM,
  lobbyId,
  placements: initialPlacements,
  availableCharacters,
  availableCreatures,
  totalCells,
  onStartBattle,
}) {
  const [placements, setPlacements] = useState(initialPlacements || {});
  const CELL_SIZE = 35;
  const ICON_SIZE = 30;

  /* -------- Monster’ı backend’de spawn et -------- */
  const spawnMonster = async (monsterId) => {
    const { data } = await api.post('/api/characters/spawn-monster/', {
      monster_id: monsterId,
      lobby_id:   lobbyId,
    });
    // Dönen veri CharacterSerializer çıktısı
    return {
      ...data,
      icon_url: data.icon || null,
    };
  };

  /* ---------------- Drag helpers ---------------- */
  const handleDragOver = (e) => e.preventDefault();

  const handleDragStart = (e, item, type, sourceIndex = null) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', item.id);
    if (type === 'move' && sourceIndex !== null) {
      e.dataTransfer.setData('sourceIndex', sourceIndex);
    }
  };

  /* ---------------- Drop (güncellenen kısım) ---------------- */
  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    const type        = e.dataTransfer.getData('type');
    const id          = parseInt(e.dataTransfer.getData('id'), 10);
    const sourceIndex = e.dataTransfer.getData('sourceIndex');

    // 1) Eğer grid içi taşıma ise eski hücreyi boşalt
    if (type === 'move' && sourceIndex !== '') {
      setPlacements((prev) => {
        const copy = { ...prev };
        delete copy[sourceIndex];
        return copy;
      });
    }

    let entity = null;

    if (type === 'player') {
      entity = availableCharacters.find((ch) => ch.id === id);

    } else if (type === 'creature') {
      try {
        entity = await spawnMonster(id);      // ⇦ backend’de gerçek Character
      } catch (err) {
        console.error('spawn-monster failed', err);
        return; // hata varsa ekleme
      }

    } else if (type === 'move') {
      entity = placements[sourceIndex];
    }

    if (entity) {
      setPlacements((prev) => ({ ...prev, [targetIndex]: entity }));
    }
  };

  /* ---------------- Start battle ---------------- */
  const handleStart = () => {
    if (Object.keys(placements).length === 0) {
      alert('Haritaya en az bir birim yerleştirmelisiniz.');
      return;
    }
    onStartBattle(placements);
  };

  /* ---------------- Pools ---------------- */
  const placedIds = Object.values(placements).map((p) => p.id);

  const remainingCharacters = availableCharacters.filter(
    (ch) => !placedIds.includes(ch.id),
  );

  const remainingCreatures = availableCreatures; // havuz tükenmez

  /* ---------------- Grid cells ---------------- */
  const cells = Array.from({ length: totalCells }, (_, i) => {
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

  /* ---------------- Render ---------------- */
  return (
    <div className="battle-setup">
      <h2>Karakterleri Yerleştir</h2>

      <h3>Harita</h3>
      <div className="battle-grid">{cells}</div>

      <h3>Kalan Karakterler</h3>
      <div className="character-list">
        {remainingCharacters.map((ch) => (
          <div
            key={ch.id}
            className="character-tile"
            draggable={isGM}
            onDragStart={(ev) => handleDragStart(ev, ch, 'player')}
          >
            <img
              src={ch.icon_url || ch.icon || '/placeholder.png'}
              alt={ch.name}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                color: '#322810',
              }}
            >
              {ch.name}
            </span>
          </div>
        ))}
      </div>

      <h3>Yaratık Havuzu</h3>
      <div className="creature-list">
        {remainingCreatures.map((cr) => (
          <div
            key={cr.id}
            className="character-tile"
            draggable={isGM}
            onDragStart={(ev) => handleDragStart(ev, cr, 'creature')}
          >
            <img
              src={cr.icon_url || cr.icon || '/placeholder.png'}
              alt={cr.name}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                color: '#322810',
              }}
            >
              {cr.name}
            </span>
          </div>
        ))}
      </div>

      {isGM && (
        <button className="start-btn" onClick={handleStart}>
          Savaşı Başlat
        </button>
      )}
    </div>
  );
}
