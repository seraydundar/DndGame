// src/pages/BattleActions.jsx
import React from 'react';

export default function BattleActions({
  selectedAttacker,
  attackMode,
  spellMode,
  selectedSpell,
  availableSpells,
  onChooseMelee,
  onChooseSpell,
  onSelectSpell,
  onCancel,
  onEndTurn,
  onEndBattle,
  isGM
}) {
  if (!selectedAttacker) return null;

  return (
    <div style={{
      margin:'20px 0',
      padding:10,
      border:'1px solid #4CAF50',
      borderRadius:4,
      backgroundColor:'#e8f5e9'
    }}>
      <h3>{selectedAttacker.name} – Aksiyon Seçimi</h3>

      {!attackMode && !spellMode && (
        <>
          <button onClick={onChooseMelee} style={{ marginRight:8 }}>Yakın Dövüş</button>
          <button onClick={onChooseSpell} style={{ marginRight:8 }}>Büyü Kullan</button>
          <button onClick={onCancel}>İptal</button>
        </>
      )}

      {attackMode && (
        <p>Hedef karaktere tıklayarak saldırını gerçekleştir.</p>
      )}

      {spellMode && !selectedSpell && (
        <>
          <p>Kullanmak istediğin büyüyü seç:</p>
          {availableSpells?.map(sp => (
            <button key={sp.id} onClick={()=>onSelectSpell(sp)} style={{ margin:4 }}>
              {sp.name}
            </button>
          ))}
          <button onClick={onCancel} style={{ marginLeft:8 }}>Geri</button>
        </>
      )}

      {spellMode && selectedSpell && (
        <p>“{selectedSpell.name}” için hedef seç ve üzerine tıkla.</p>
      )}

      <div style={{ marginTop:10 }}>
        <button onClick={onEndTurn} style={{ marginRight:8 }}>Tur Sonu</button>
        {isGM && <button onClick={onEndBattle}>Savaşı Bitir</button>}
      </div>
    </div>
  );
}
