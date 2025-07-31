import React from 'react';

export default function GMPanel({ onEndBattle, onRequestRoll, requestRollMode }) {
  return (
    <div style={{
      margin: '20px 0',
      padding: 10,
      border: '1px solid #f44336',
      borderRadius: 4,
      backgroundColor: '#ffebee'
    }}>
      <h3>GM Panel</h3>
      {requestRollMode ? (
        <p>Gridde bir karakter seçin...</p>
      ) : (
        <>
          <button onClick={onRequestRoll} style={{ marginRight: 8 }}>
            Zar İste
          </button>
          <button onClick={onEndBattle}>Savaşı Bitir</button>
        </>
      )}
    </div>
  );
}