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
  isGM
}) {
  if (!selectedAttacker) return null;

  // Ekipman bazlı koşullar; geçici yaratıklar her zaman melee yapabilir
  const weapon = selectedAttacker.main_hand || selectedAttacker.off_hand || {};
  const subtype = weapon.subtype;
  const hasMeleeWeapon  =
    selectedAttacker.is_temporary ||
    subtype === 'sword' ||
    subtype === 'axe';
  const hasRangedWeapon = subtype === 'bow';
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

      {/* 1. Seçim blokları */}
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

      {/* 2. Hangi moda girdiysek ona özel açıklama */}
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
            <button key={sp.id} onClick={() => onSelectSpell(sp)} style={{ margin: 4 }}>
              {sp.name}
            </button>
          ))}
        </>
      )}
      {spellMode && selectedSpell && (
        <p>“{selectedSpell.name}” için hedef seç ve üzerine tıkla.</p>
      )}

      {/* 3. Genel Kontroller */}
      <div style={{ marginTop: 10 }}>
        <button onClick={onCancel} style={{ marginRight: 8 }}>İptal</button>
        <button onClick={onEndTurn} style={{ marginRight: 8 }}>Tur Sonu</button>
        {isGM && <button onClick={onEndBattle}>Savaşı Bitir</button>}
      </div>
    </div>
  );
}
