import React, { useState } from 'react';
import './BattleSetup.css';


export default function BattleSetup({
  isGM,
  lobbyId, 
  placements: initialPlacements,
  availableCharacters,
  availableCreatures,
  totalCells,
  onStartBattle
}) {
  // Local state for drag-and-drop placements
  const [placements, setPlacements] = useState(initialPlacements || {});
  const CELL_SIZE = 35;
  const ICON_SIZE = 30;

  // Allow dropping by preventing default
  const handleDragOver = e => {
    e.preventDefault();
  };

  // When a drag starts, store the type, id, and (if moving) source index
  const handleDragStart = (e, item, type, sourceIndex = null) => {
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', item.id);
    if (type === 'move' && sourceIndex !== null) {
      e.dataTransfer.setData('sourceIndex', sourceIndex);
    }
  };

  // On drop, remove from old position (if move) and place into new cell
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const id = parseInt(e.dataTransfer.getData('id'), 10);
    const sourceIndex = e.dataTransfer.getData('sourceIndex');

    setPlacements(prev => {
      const newPlacements = { ...prev };

      // If we're moving an existing piece, delete its old slot
      if (type === 'move' && sourceIndex !== '') {
        delete newPlacements[sourceIndex];
      }

      // Figure out which entity to place
      let entity = null;
      if (type === 'player') {
        entity = availableCharacters.find(ch => ch.id === id);
      } else if (type === 'creature') {
        entity = availableCreatures.find(cr => cr.id === id);
      } else if (type === 'move') {
        entity = prev[sourceIndex];
      }

      // Place it in the new cell
      if (entity) {
        newPlacements[targetIndex] = entity;
      }

      return newPlacements;
    });
  };
 // Savaşı başlatma butonu için click handler
  const handleStart = async () => {
    if (Object.keys(placements).length < 1) {
      alert('Haritaya en az bir birim yerleştirmelisiniz.');
      return;
    }
    onStartBattle(placements);
  };

  // Prepare lists: normalize to array, get placed IDs, then filter pools
  const placementValues = Array.isArray(placements)
    ? placements
    : Object.values(placements);
  const placedIds = placementValues.filter(p => p).map(p => p.id);
  const remainingCharacters = availableCharacters.filter(
    ch => !placedIds.includes(ch.id)
  );
  const remainingCreatures = availableCreatures.filter(
    cr => !placedIds.includes(cr.id)
  );

  // Build the grid cells
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const placed = placements[i];
    return (
      <div
        key={i}
        className={`cell ${placed ? 'reachable' : ''}`}
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
        onDragOver={handleDragOver}
        onDrop={e => handleDrop(e, i)}
      >
        {placed && (
          <img
            src={placed.icon || placed.icon_url || '/placeholder.png'}
            alt={placed.name}
            draggable={isGM}
            onDragStart={e => handleDragStart(e, placed, 'move', i)}
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              objectFit: 'cover',
              borderRadius: '50%'
            }}
          />
        )}
      </div>
    );
  });

  return (
    <div className="battle-setup">
      <h2>Karakterleri Yerleştir</h2>

      <h3>Harita</h3>
      <div className="battle-grid">{cells}</div>

      <h3>Kalan Karakterler</h3>
      <div className="character-list">
        {remainingCharacters.map(ch => (
          <div
            key={ch.id}
            className="character-tile"
            draggable={isGM}
            onDragStart={e => handleDragStart(e, ch, 'player')}
          >
            <img
              src={ch.icon || ch.icon_url || '/placeholder.png'}
              alt={ch.name}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                color: '#322810'
              }}
            >
              {ch.name}
            </span>
          </div>
        ))}
      </div>

      <h3>Yaratık Havuzu</h3>
      <div className="creature-list">
        {remainingCreatures.map(cr => (
          <div
            key={cr.id}
            className="character-tile"
            draggable={isGM}
            onDragStart={e => handleDragStart(e, cr, 'creature')}
          >
            <img
              src={cr.icon || cr.icon_url || '/placeholder.png'}
              alt={cr.name}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
            <span
              style={{
                display: 'block',
                marginTop: '4px',
                fontWeight: 'bold',
                fontSize: '12px',
                color: '#322810'
              }}
            >
              {cr.name}
            </span>
          </div>
        ))}
      </div>

      {isGM && <button onClick={handleStart}>Savaşı Başlat</button>}
    </div>
  );
}
