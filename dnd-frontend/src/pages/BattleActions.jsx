// src/components/BattleActions.jsx

import React from 'react';

export default function BattleActions({
  selectedAttacker,
  attackMode,
  attackType,
  spellMode,
  selectedSpell,
  availableSpells,
  movementRemaining,
  onChooseMelee,
  onChooseRanged,
  onChooseSpell,
  onChooseMove,
  onSelectSpell,
  onCancel,
  onEndTurn,
  onEndBattle,
  onDiceRequest,
  isGM
}) {
  if (!selectedAttacker) return null;

  // Ekipman bazlı koşullar; geçici yaratıklar her zaman melee yapabilir
  const weapon = selectedAttacker.melee_weapon || selectedAttacker.ranged_weapon || {};
  const hasMeleeWeapon =
    selectedAttacker.is_temporary || !!selectedAttacker.melee_weapon;
  const hasRangedWeapon = selectedAttacker.is_temporary
    ? !!selectedAttacker.ranged_dice
    : !!selectedAttacker.ranged_weapon;
  const hasSpells       = Array.isArray(availableSpells) && availableSpells.length > 0;
  const canMove         = movementRemaining > 0;

  return (
    <div style={{
      margin: '20px 0',
      padding: 10,
      border: '1px solid #4CAF50',
      borderRadius: 4,
      backgroundColor: '#e8f5e9'
    }}>
      <h3>{selectedAttacker.name} – Aksiyon Seçimi</h3>
      <p><strong>Hareket Hakkı:</strong> {movementRemaining}</p>

      {/* 1. Seçim Blokları */}
      {!attackMode && !spellMode && (
        <div style={{ marginBottom: 10 }}>
          {hasMeleeWeapon && (
            <button onClick={onChooseMelee} style={{ marginRight: 8 }}>
              Yakın Dövüş
            </button>
          )}
          {hasRangedWeapon && (
            <button onClick={onChooseRanged} style={{ marginRight: 8 }}>
              Menzilli Saldırı
            </button>
          )}
          {hasSpells && (
            <button onClick={onChooseSpell} style={{ marginRight: 8 }}>
              Büyü Kullan
            </button>
          )}
          {canMove && (
            <button onClick={onChooseMove} style={{ marginRight: 8 }}>
              Hareket Et
            </button>
          )}
        </div>
      )}

      {/* 2. Açıklamalar */}
      {attackMode && attackType === 'melee' && !spellMode && (
        <p>Hedef karaktere tıklayarak yakın dövüş saldırını gerçekleştir.</p>
      )}
      {attackMode && attackType === 'ranged' && !spellMode && (
        <p>Hedef karaktere tıklayarak menzilli saldırını gerçekleştir.</p>
      )}
      {spellMode && !selectedSpell && (
        <>
          <p>Kullanmak istediğin büyüyü seç:</p>
          {availableSpells.map(sp => (
            <button
              key={sp.id}
              onClick={() => onSelectSpell(sp)}
              style={{ margin: 4 }}
            >
              {sp.name}
            </button>
          ))}
        </>
      )}
      {spellMode && selectedSpell && (
        <p>“{selectedSpell.name}” için hedef seç ve üzerine tıkla.</p>
      )}

      {/* 3. Kontroller */}
      <div style={{ marginTop: 10 }}>
        <button onClick={onCancel} style={{ marginRight: 8 }}>
          İptal
        </button>
         <button onClick={onEndTurn} style={{ marginRight: 8 }}>
          Tur Sonu
        </button>
        {isGM && (
          <>
            <button onClick={onDiceRequest} style={{ marginRight: 8 }}>
              Zar Attır
            </button>
            <button onClick={onEndBattle}>
              Savaşı Bitir
            </button>
          </>
        )}
      </div>
    </div>
  );
}
