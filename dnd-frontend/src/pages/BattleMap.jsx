// src/pages/BattleMap.jsx
import React from 'react';

export default function BattleMap({
  placements,
  reachableCells,
  gridSize,
  totalCells,
  moving,
  currentUserId,
  onCellClick,
  onDragStart,
  onDragOver,
  onDrop
}) {
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const ch = placements[i];
    return (
      <div
        key={i}
        onClick={()=>onCellClick(i,ch)}
        onDragOver={onDragOver}
        onDrop={e=>onDrop(e,i)}
        style={{
          width:35, height:35,
          border:'1px solid #ccc',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          backgroundColor: reachableCells.has(i) ? '#e0ffe0' : '#fff',
          cursor: ch ? 'pointer' : 'default'
        }}
      >
        {ch && (
          <div
            draggable
            onDragStart={e=>onDragStart(e,ch,'grid',i)}
            style={{
              width:30, height:30,
              borderRadius:'50%',
              backgroundColor: ch.player_id===currentUserId ? '#4CAF50' : '#777',
              color:'#fff',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:10,
              transform: moving ? 'translateY(-5px)' : 'none',
              transition: moving ? 'transform .3s' : 'none'
            }}
          >
            {ch.name}
          </div>
        )}
      </div>
    );
  });

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:`repeat(${gridSize},35px)`,
      gap:2,
      marginBottom:20
    }}>
      {cells}
    </div>
  );
}
