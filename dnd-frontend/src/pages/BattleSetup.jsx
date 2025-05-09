// src/pages/BattleSetup.jsx
import React from 'react';

export default function BattleSetup({
  isGM,
  characters,
  placements,
  availableCharacters,
  gridSize,
  totalCells,
  onDragStart,
  onDragOver,
  onDrop,
  onStartBattle
}) {
  const cells = Array.from({ length: totalCells }, (_, i) => (
    <div
      key={i}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, i)}
      style={{
        width: 35, height: 35,
        border: '1px solid #ccc',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        backgroundColor: placements[i] ? '#90ee90' : '#fff'
      }}
    >
      {placements[i]?.name}
    </div>
  ));

  return (
    <div>
      <h2>Karakterleri Yerleştir</h2>
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(${gridSize},35px)`,
        gap:2,
        marginBottom:20
      }}>
        {cells}
      </div>
      <h3>Kalan Karakterler</h3>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {availableCharacters.map(ch => (
          <div key={ch.id}
               draggable={isGM}
               onDragStart={e=>onDragStart(e,ch,'available')}
               style={{
                 width:40, height:40,
                 borderRadius:'50%',
                 backgroundColor:'#2196F3',
                 color:'#fff',
                 display:'flex',
                 alignItems:'center',
                 justifyContent:'center',
                 cursor:'grab'
               }}>
            {ch.name}
          </div>
        ))}
      </div>
      {isGM && (
        <button
          onClick={onStartBattle}
          style={{
            marginTop:20,
            padding:'10px 20px',
            backgroundColor:'#4CAF50',
            color:'#fff',
            border:'none',
            borderRadius:4,
            cursor:'pointer'
          }}
        >
          Savaşı Başlat
        </button>
      )}
    </div>
  );
}
