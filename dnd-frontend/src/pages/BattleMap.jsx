// src/pages/BattleMap.jsx
import React from 'react';
import forestBg from '../assets/backgrounds/forest.jpg';
// import desertBg from '../assets/backgrounds/Desert.jpg';
// import dungeonBg from '../assets/backgrounds/Dungeon.jpg';

const backgrounds = {
  forest: forestBg,
  // desert: desertBg,
  // dungeon: dungeonBg,
};

export default function BattleMap({
  placements,
  reachableCells,
  rangedReachableCells,
  obstacles,
  background,
  gridSize,
  totalCells,
  moving,
  currentUserId,
  onCellClick,
  onDragStart,
  onDragOver,
  onDrop
}) {
  const bgSrc = backgrounds[background] || backgrounds.forest;

  return (
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
      {Array.from({ length: totalCells }, (_, i) => {
        const ch      = placements[i];
        const isReach = reachableCells.has(i);
        const isRange = rangedReachableCells.has(i);
        const isObs   = obstacles.some(o => {
          const inRow = Math.floor(i/gridSize) >= o.row &&
                        Math.floor(i/gridSize) <  o.row+o.size.h;
          const inCol = i%gridSize >= o.col &&
                        i%gridSize <  o.col+o.size.w;
          return inRow && inCol;
        });

        return (
          <div key={i}
               onClick={()=>!isObs && onCellClick(i,ch)}
               onDragOver={onDragOver}
               onDrop={e=>onDrop(e,i)}
               style={{
                 width:35, height:35, border:'1px solid #ccc',
                 backgroundColor: isObs
                   ? '#3a5a40'
                   : isReach
                     ? '#e0ffe0'
                     : 'transparent',
                 borderColor: isRange ? '#ff9800' : '#ccc',
                 position:'relative',
                 cursor: ch
                   ? 'pointer'
                   : isObs
                     ? 'not-allowed'
                     : 'default'
               }}>
            {/* karakter ikonu */}
            {ch && (
              <div draggable
                   onDragStart={e=>onDragStart(e,ch,'grid',i)}
                   style={{
                     width:30, height:30,
                     borderRadius:'50%',
                     backgroundColor: ch.player_id===currentUserId ? '#4CAF50' : '#777',
                     color:'#fff',
                     display:'flex',
                     alignItems:'center',
                     justifyContent:'center',
                     fontSize:10
                   }}>
                {ch.name}
              </div>
            )}
            {/* obstacle ikonu */}
            {obstacles.map(o => {
              const origin = o.row*gridSize + o.col;
              if (i === origin) {
                return (
                  <img key={o.id}
                       src={`/assets/${o.type}.png`}
                       alt={o.type}
                       style={{
                         position:'absolute', top:0, left:0,
                         width:o.size.w*35, height:o.size.h*35,
                         pointerEvents:'none'
                       }} />
                );
              }
              return null;
            })}
          </div>
        );
      })}
    </div>
  );
}
