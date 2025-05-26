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

  // Ekipman bazlı koşullar
  const weapon = selectedAttacker.main_hand || selectedAttacker.off_hand || {};
  const subtype = weapon.subtype;
  const hasMeleeWeapon  = subtype === 'sword' || subtype === 'axe';
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

      {/* Karakter için seçim butonları */}
      {!attackMode && !spellMode && (
        <>
          {hasMeleeWeapon && (
            <>
              <button onClick={onChooseMelee} style={{ marginRight: 8 }}>
                Yakın Dövüş
              </button>
              <button onClick={onCancel} style={{ marginRight: 8 }}>
                İptal
              </button>
            </>
          )}

          {hasRangedWeapon && (
            <>
              <button onClick={onChooseRanged} style={{ marginRight: 8 }}>
                Menzilli Saldırı
              </button>
              <button onClick={onCancel} style={{ marginRight: 8 }}>
                İptal
              </button>
            </>
          )}

          {hasSpells && (
            <button onClick={onChooseSpell} style={{ marginRight: 8 }}>
              Büyü Kullan
            </button>
          )}

          {canMove
            ? <button onClick={onChooseMove} style={{ marginRight: 8 }}>Hareket Et</button>
            : <button disabled style={{ marginRight: 8 }}>Hareket (Bitti)</button>
          }

          <button onClick={onCancel}>İptal</button>
        </>
      )}

      {/* Karakter saldırı açıklamaları */}
      {attackMode && attackType === 'melee' && !spellMode && (
        <>
          <p>Hedef karaktere tıklayarak yakın dövüş saldırını gerçekleştir.</p>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>İptal</button>
        </>
      )}

      {attackMode && attackType === 'ranged' && !spellMode && (
        <>
          <p>Hedef karaktere tıklayarak menzilli saldırını gerçekleştir.</p>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>İptal</button>
        </>
      )}

      {/* Karakter büyü seçimleri */}
      {spellMode && !selectedSpell && (
        <>
          <p>Kullanmak istediğin büyüyü seç:</p>
          {availableSpells.map(sp => (
            <button key={sp.id} onClick={() => onSelectSpell(sp)} style={{ margin: 4 }}>
              {sp.name}
            </button>
          ))}
          <button onClick={onCancel} style={{ marginLeft: 8 }}>Geri</button>
        </>
      )}

      {spellMode && selectedSpell && (
        <>
          <p>“{selectedSpell.name}” için hedef seç ve üzerine tıkla.</p>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>İptal</button>
        </>
      )}

      {/* Tur sonu ve GM savaş bitir */}
      <div style={{ marginTop: 10 }}>
        <button onClick={onEndTurn} style={{ marginRight: 8 }}>Tur Sonu</button>
        {isGM && <button onClick={onEndBattle}>Savaşı Bitir</button>}
      </div>

      {/* ——— Canavarları GM yönetebilsin ——— */}
      {selectedAttacker.type === 'creature' && isGM && (
        <div style={{
          marginTop: 20,
          padding: 10,
          borderTop: '1px dashed #666'
        }}>
          <h4>GM: Canavarı Yönetin</h4>
          <button onClick={onChooseMove} style={{ marginRight: 8 }}>Hareket Et</button>
          <button onClick={onChooseMelee} style={{ marginRight: 8 }}>Saldırı Yap</button>
          <button onClick={onEndTurn}>Tur Sonu</button>
        </div>
      )}
    </div>
  );
}