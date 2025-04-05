import React, { useState } from 'react';
import api from '../services/api';

const DiceRoll = () => {
  const [rollResult, setRollResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  const rollDice = async () => {
    setIsRolling(true);
    try {
      // Backend'de d20 zar atışı yapan API endpoint'i:
      // Örnek: GET /api/dice-roll/?dice=d20
      const response = await api.get('dice-roll/?dice=d20');
      setRollResult(response.data.result); // Örnek response: { result: number }
    } catch (error) {
      console.error("Zar atma hatası:", error);
      setRollResult("Hata oluştu!");
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div style={{
      textAlign: 'center',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      maxWidth: '300px',
      margin: '20px auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2>D20 Zar At</h2>
      <button
        onClick={rollDice}
        disabled={isRolling}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#007bff',
          color: '#fff',
          cursor: isRolling ? 'not-allowed' : 'pointer'
        }}
      >
        {isRolling ? 'Atılıyor...' : 'Zar At'}
      </button>
      {rollResult !== null && (
        <div style={{ marginTop: '20px', fontSize: '1.5em' }}>
          Sonuç: {rollResult}
        </div>
      )}
    </div>
  );
};

export default DiceRoll;
