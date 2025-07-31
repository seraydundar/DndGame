import React, { useState, useEffect } from 'react';
import './DiceRollModal.css';

export default function DiceRollModal({
  visible,
  onRoll,
  onClose,
  isRolling,
  result,
  canRoll,
}) {
  const [displayValue, setDisplayValue] = useState(null);

  useEffect(() => {
    if (isRolling && result == null) {
      const id = setInterval(() => {
        setDisplayValue(Math.ceil(Math.random() * 20));
      }, 100);
      return () => clearInterval(id);
    }
    if (result != null) setDisplayValue(result);
  }, [isRolling, result]);

  if (!visible) return null;
  return (
    <div className="dice-modal-overlay">
      <div className="dice-modal">
        {result == null ? (
          <>
            <p>D20 için zar atın</p>
            {isRolling && <div className="dice">{displayValue ?? '?'}</div>}
            {canRoll ? (
              <button onClick={onRoll} disabled={isRolling}>
                {isRolling ? 'Atılıyor...' : 'Zar At'}
              </button>
            ) : (
              <p>Oyuncu zar atacak...</p>
            )}
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