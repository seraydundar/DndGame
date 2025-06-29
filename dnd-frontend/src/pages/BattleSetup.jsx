import React from 'react';
import './BattleSetup.css';
import api from '../services/api';

export default function BattleSetup({
  isGM,
  characters,
  placements,
  availableCharacters,
  availableCreatures,
  gridSize,
  totalCells,
  onDragStart,
  onDragOver,
  onDrop,
  onStartBattle
}) {
  const CELL_SIZE = 35;
  const ICON_SIZE = 30;

  const cells = Array.from({ length: totalCells }, (_, i) => (
    <div
      key={i}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, i)}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        border: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: placements[i] ? '#90ee90' : '#fff'
      }}
    >
      {placements[i] && (
        <>
          <img
            src={
              placements[i].icon
              || placements[i].icon_url
              || '/placeholder.png'
            }
            alt={placements[i].name}
            style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius: '50%' }}
          />
          <span style={{ fontSize: 6 }}>{placements[i].name}</span>
        </>
      )}
    </div>
  ));

  return (
    <div>
      <h2>Karakterleri Yerleştir</h2>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
          gap: 2,
          marginBottom: 20
        }}
      >
        {cells}
      </div>

      {/* Kalan Karakterler */}
      <h3>Kalan Karakterler</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {availableCharacters.map(ch => (
          <div
            key={ch.id}
            draggable={isGM}
            onDragStart={e => onDragStart(e, ch, 'player')}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#2196F3',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isGM ? 'grab' : 'default',
              textAlign: 'center',
              padding: 4
            }}
          >
            <img
              src={ch.icon || '/placeholder.png'}
              alt={ch.name}
              style={{ width: 40, height: 40, borderRadius: '50%' }}
            />
            <span style={{ fontSize: 10, marginTop: 2 }}>{ch.name}</span>
          </div>
        ))}
      </div>

      {/* Yaratık Havuzu */}
      <h3>Yaratık Havuzu</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {availableCreatures.map(cr => (
          <div
            key={cr.id}
            draggable={isGM}
            onDragStart={e => onDragStart(e, cr, 'creature')}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#f44336',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isGM ? 'grab' : 'default',
              textAlign: 'center',
              padding: 4
            }}
          >
            <img
              src={
                cr.icon
                || cr.icon_url
                || '/placeholder.png'
              }
              alt={cr.name}
              style={{ width: 40, height: 40, borderRadius: '50%' }}
            />
            <span style={{ fontSize: 10, marginTop: 2 }}>{cr.name}</span>
          </div>
        ))}
      </div>

      {/* Savaşı Başlat Butonu */}
      {isGM && (
        <button
          onClick={onStartBattle}
          style={{
            marginTop: 20,
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Savaşı Başlat
        </button>
      )}
    </div>
  );
}
