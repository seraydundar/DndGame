// src/pages/BattleSetup.jsx
import React from 'react';
import './BattleSetup.css'; // CSS dosyasını ekleyin
import api from '../services/api'; // API dosyasını ekleyin

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
  const CELL_SIZE = 35;          // kolay ayarlamak için sabit tuttum
  const ICON_SIZE = 30;          // hücre içindeki ikon

  const cells = Array.from({ length: totalCells }, (_, i) => (
    <div
      key={i}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, i)}
      style={{
        width:  CELL_SIZE,
        height: CELL_SIZE,
        border: '1px solid #ccc',
        display:'flex',
        flexDirection:'column',            // 👈 ikon + isim dikey hizalanacak
        alignItems:'center',
        justifyContent:'center',
        backgroundColor: placements[i] ? '#90ee90' : '#fff'
      }}
    >
      {placements[i] && (
        <>
          <img
            src={placements[i].icon || '/placeholder.png'}
            alt={placements[i].name}
            style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius:'50%' }}
          />
          <span style={{ fontSize: 6 }}>{placements[i].name}</span>
        </>
      )}
    </div>
  ));

  return (
    <div>
      <h2>Karakterleri Yerleştir</h2>

      {/* --- Grid --- */}
      <div
        style={{
          display:'grid',
          gridTemplateColumns:`repeat(${gridSize},${CELL_SIZE}px)`,
          gap:2,
          marginBottom:20
        }}
      >
        {cells}
      </div>

      {/* --- Kalan Karakterler --- */}
      <h3>Kalan Karakterler</h3>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {availableCharacters.map(ch => (
          <div
            key={ch.id}
            draggable={isGM}
            onDragStart={e => onDragStart(e, ch, 'available')}
            style={{
              width:60,               // yuvarlak + isim için biraz büyüttüm
              height:60,
              borderRadius:'50%',
              backgroundColor:'#2196F3',
              color:'#fff',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              justifyContent:'center',
              cursor: isGM ? 'grab' : 'default',
              textAlign:'center',
              padding:4
            }}
          >
            <img
              src={ch.icon || '/placeholder.png'}
              alt={ch.name}
              style={{ width:40, height:40, borderRadius:'50%' }}
            />
            <span style={{ fontSize:10, marginTop:2 }}>{ch.name}</span>
          </div>
        ))}
      </div>

      {/* --- Savaşı Başlat Butonu (sadece GM) --- */}
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
