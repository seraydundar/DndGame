// src/pages/BattleSetup.jsx
import React, { useState } from 'react';
import forestBg from '../assets/backgrounds/forest.jpg';
// import desertBg from '../assets/backgrounds/Desert.jpg';
// import dungeonBg from '../assets/backgrounds/Dungeon.jpg';

const backgrounds = [
  { id: 'forest',  label: 'Orman',  src: forestBg  },
  // { id: 'desert',  label: 'Çöl',    src: desertBg  },
  // { id: 'dungeon', label: 'Zindan', src: dungeonBg },
];

export default function BattleSetup({
  isGM,
  placements,
  availableCharacters,
  gridSize,
  totalCells,
  onDragStart,
  onDragOver,
  onDrop,
  onStartBattle
}) {
  const [placingMode,  setPlacingMode]  = useState('characters');
  const [obstacles,    setObstacles]    = useState([]);
  const [hoverCells,   setHoverCells]   = useState(new Set());
  const [obstacleType, setObstacleType] = useState('tree');
  const [obstacleSize, setObstacleSize] = useState({ w:1, h:1 });
  const [selectedBg,   setSelectedBg]   = useState(backgrounds[0].id);

  const bgSrc = backgrounds.find(b => b.id === selectedBg).src;

  // hover / place obstacle
  const onCellMouseEnter = idx => {
    if (placingMode !== 'obstacles') return;
    const r = Math.floor(idx/gridSize), c = idx%gridSize;
    const prev = new Set();
    for (let dr=0; dr<obstacleSize.h; dr++){
      for (let dc=0; dc<obstacleSize.w; dc++){
        const i = (r+dr)*gridSize + (c+dc);
        if (i < totalCells) prev.add(i);
      }
    }
    setHoverCells(prev);
  };
  const onCellMouseLeave = () => setHoverCells(new Set());
  const onCellClick = idx => {
    if (placingMode !== 'obstacles') return;
    const r = Math.floor(idx/gridSize), c = idx%gridSize;
    setObstacles(obs => [
      ...obs,
      { id:`${r}-${c}-${Date.now()}`, type:obstacleType, row:r, col:c, size:{...obstacleSize} }
    ]);
  };

  // build cells
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const hasChar = Boolean(placements[i]);
    const isHover = hoverCells.has(i);
    return (
      <div
        key={i}
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, i)}
        onMouseEnter={() => onCellMouseEnter(i)}
        onMouseLeave={onCellMouseLeave}
        onClick={() => onCellClick(i)}
        style={{
          width:35, height:35, border:'1px solid #ccc',
          backgroundColor: isHover
            ? 'rgba(0,200,0,0.3)'
            : hasChar
              ? '#90ee90'
              : 'transparent',
          position:'relative', display:'flex',
          alignItems:'center', justifyContent:'center',
          cursor: placingMode==='obstacles' ? 'crosshair' : 'default'
        }}
      >
        {/* karakter yerleşimi */}
        {placements[i]?.name && (
          <div
            draggable={isGM}
            onDragStart={e => onDragStart(e, placements[i], 'grid', i)}
            style={{
              width:30, height:30,
              borderRadius:'50%',
              backgroundColor:'#4CAF50',
              color:'#fff',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:10,
              pointerEvents:'none'
            }}
          >
            {placements[i].name}
          </div>
        )}
        {/* obstacle */}
        {obstacles.map(o => {
          const idx0 = o.row*gridSize + o.col;
          if (i === idx0) {
            return (
              <img
                key={o.id}
                src={`/assets/${o.type}.png`}
                alt={o.type}
                style={{
                  position:'absolute', top:0, left:0,
                  width:o.size.w*35, height:o.size.h*35,
                  pointerEvents:'none'
                }}
              />
            );
          }
          return null;
        })}
      </div>
    );
  });

  const handleStart = () => {
    onStartBattle({ placements, obstacles, background: selectedBg });
  };

  return (
    <div>
      <h2>Karakter & Engel Yerleştirme</h2>

      {isGM && (
        <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setPlacingMode('characters')}
                  style={{ fontWeight: placingMode==='characters'?'bold':'normal' }}>
            Karakter
          </button>
          <button onClick={()=>setPlacingMode('obstacles')}
                  style={{ fontWeight: placingMode==='obstacles'?'bold':'normal' }}>
            Engel
          </button>

          {placingMode==='obstacles' && (
            <span>
              Tip:
              <select value={obstacleType}
                      onChange={e=>setObstacleType(e.target.value)}
                      style={{ margin:'0 8px' }}>
                <option value="tree">Ağaç</option>
                <option value="rock">Taş</option>
                <option value="crate">Kutu</option>
              </select>
              Boyut:
              <input type="number" min="1" max="5" value={obstacleSize.w}
                     onChange={e=>setObstacleSize(s=>({...s,w:+e.target.value}))}
                     style={{ width:'2ch', margin:'0 4px' }}/>×
              <input type="number" min="1" max="5" value={obstacleSize.h}
                     onChange={e=>setObstacleSize(s=>({...s,h:+e.target.value}))}
                     style={{ width:'2ch', margin:'0 4px' }}/> hücre
            </span>
          )}

          <span>
            Arkaplan:
            <select value={selectedBg}
                    onChange={e=>setSelectedBg(e.target.value)}
                    style={{ margin:'0 8px' }}>
              {backgrounds.map(b=>(
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <img src={bgSrc} alt="preview"
                 style={{ width:80, height:48, objectFit:'cover', border:'1px solid #444' }}/>
          </span>
        </div>
      )}

      <div style={{
           display:          'grid',
           gridTemplateColumns:`repeat(${gridSize},35px)`,
           gap:              2,
           /* center horizontally: */
           margin:           '0 auto 20px',
           backgroundImage:  `url(${bgSrc})`,
           backgroundSize:   'cover',
           backgroundPosition:'center'
         }}>
        {cells}
      </div>

      <h3>Kalan Karakterler</h3>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {availableCharacters.map(ch=>(
          <div key={ch.id}
               draggable={isGM}
               onDragStart={e=>onDragStart(e,ch,'available')}
               style={{
                 width:40, height:40, borderRadius:'50%',
                 backgroundColor:'#2196F3', color:'#fff',
                 display:'flex', alignItems:'center',
                 justifyContent:'center', cursor:'grab'
               }}>
            {ch.name}
          </div>
        ))}
      </div>

      {isGM && (
        <button onClick={handleStart}
                style={{
                  padding:'10px 20px',
                  backgroundColor:'#4CAF50',
                  color:'#fff',
                  border:'none',
                  borderRadius:4,
                  cursor:'pointer'
                }}>
          Savaşı Başlat
        </button>
      )}
    </div>
  );
}
