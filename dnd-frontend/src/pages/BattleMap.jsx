// src/pages/BattleMap.jsx
import React from 'react';

/**
 * BattleMap – kare grid üzerine karakter ikon + isim + HP bar çizer.
 *  🔹 CSS entegrasyonu
 *      - Dış sarmal div  → className="battle-grid"  (BattlePage.css’te stil)
 *      - Her hücre       → className="cell" (+ reachable / ranged / aoe-preview)
 *  🔹 Inline style yalnızca dinamik ölçüler (CELL_SIZE) için tutulur.
 *  🔹 Alan büyüsü (“area”) seçildiğinde mouse-hover merkezinden 3×3 kare vurgulanır.
 */
export default function BattleMap({
  placements,
   reachableCells,
   rangedReachableCells = new Set(),
   gridSize,
   totalCells,
   moving,
   currentUserId,
   spellMode,
   selectedSpell,
   aoeHoverCell,
   onCellHover,
   onCellClick,
   onDragStart,
   onDragOver,
   onDrop,
   backgroundImage,
}) {
  const CELL_SIZE = 35;
  const ICON_SIZE = 28;

  /* ------------ 3×3 AOE vurgusu ------------ */
  const aoeCells = new Set();
  if (
    spellMode &&
    selectedSpell?.scope === 'area' &&
    typeof aoeHoverCell === 'number'
  ) {
    const cx = aoeHoverCell % gridSize;
    const cy = Math.floor(aoeHoverCell / gridSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < totalCells / gridSize) {
          aoeCells.add(y * gridSize + x);
        }
      }
    }
  }
  

  /* ------------ Hücreleri oluştur ------------ */
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const ch = placements[i];

    /* HP yüzdesi */
    const hpPerc =
      ch && ch.max_hp
        ? Math.max(
            0,
            Math.min(100, ((ch.current_hp ?? ch.max_hp) / ch.max_hp) * 100),
          )
        : 0;

    /* CSS sınıfları */
    const cellClasses = [
      'cell',
      reachableCells.has(i) ? 'reachable' : '',
      rangedReachableCells.has(i) ? 'ranged' : '',
      aoeCells.has(i) ? 'aoe-preview' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        key={i}
        className={cellClasses}
        onClick={() => onCellClick(i, ch)}
        onMouseEnter={() => onCellHover && onCellHover(i)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, i)}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          cursor: ch ? 'pointer' : 'default',
        }}
      >
        {ch && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              pointerEvents: 'none', // hücre tıklamasını engelleme
            }}
          >
            {/* ---- İKON ---- */}
            <div
              draggable
              onClick={() => onCellClick(i, ch)}
              onDragStart={(e) => onDragStart(e, ch, 'grid', i)}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                borderRadius: '50%',
                backgroundColor: ch.icon
                  ? 'transparent'
                  : ch.player_id === currentUserId
                  ? '#4CAF50'
                  : '#777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transform: moving ? 'translateY(-3px)' : 'none',
                transition: moving ? 'transform .2s' : 'none',
                cursor: 'grab',
                pointerEvents: 'auto', // drag çalışsın
              }}
            >
              {ch.icon ? (
                <img
                  src={ch.icon}
                  alt={ch.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 8, color: '#fff' }}>
                  {ch.name.slice(0, 3).toUpperCase()}
                </span>
              )}
            </div>

            {/* ---- İSİM ---- */}
            <span style={{ fontSize: 8, lineHeight: 1, marginTop: 2 }}>
              {ch.name}
            </span>

            {/* ---- HP BAR ---- */}
            {ch.max_hp && (
              <div
                style={{
                  width: ICON_SIZE,
                  height: 4,
                  background: '#ddd',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    width: `${hpPerc}%`,
                    height: '100%',
                    background: '#4caf50',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

  /* ------------ Render grid ------------ */
  return (
    
    <div
      className="battle-grid"
      style={{
        display: 'grid',
    gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
    gap: 2,
    marginBottom: 20,
    background: `url(${backgroundImage}) center / cover`
      }}
    >
      {cells}
    </div>
  );
}
