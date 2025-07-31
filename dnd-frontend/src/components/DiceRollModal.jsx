import React from 'react';
import './DiceRollModal.css';

export default function DiceRollModal({ visible, onRoll, onClose, isRolling, result }) {
  if (!visible) return null;
  return (
    <div className="dice-modal-overlay">
      <div className="dice-modal">
        {result == null ? (
          <>
            <p>D20 için zar atın</p>
            <button onClick={onRoll} disabled={isRolling}>
              {isRolling ? 'Atılıyor...' : 'Zar At'}
            </button>
          </>
        ) : (
          <>
            <p>Sonuç: {result}</p>
            <button onClick={onClose}>Tamam</button>
          </>
        )}
      </div>
    </div>
  );
}