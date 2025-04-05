import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

const PlayerPage = () => {
  const [character, setCharacter] = useState(null);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const currentUserId = parseInt(localStorage.getItem("user_id") || '0', 10);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await api.get('characters/');
        const myChars = response.data.filter(ch => ch.player_id === currentUserId);
        if (myChars && myChars.length > 0) {
          setCharacter(myChars[0]);
        }
      } catch (error) {
        console.error("Karakter verileri alınırken hata:", error);
      }
    };

    fetchCharacter();
  }, [currentUserId]);

  // Karakter güncellemelerini websocket üzerinden alıyoruz.
  useEffect(() => {
    const characterUpdateHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "characterUpdate" && data.character.player_id === currentUserId) {
          setCharacter(data.character);
        }
      } catch (error) {
        console.error("Karakter güncelleme mesajı ayrıştırma hatası:", error);
      }
    };

    socket.addEventListener("message", characterUpdateHandler);
    return () => {
      socket.removeEventListener("message", characterUpdateHandler);
    };
  }, [currentUserId]);

  // GM yönlendirmelerini websocket üzerinden dinliyoruz.
  useEffect(() => {
    const redirectHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "redirect") {
          if (data.target === "battle") {
            navigate('/battle');
          } else if (data.target === "trade") {
            navigate('/trade');
          }
        }
      } catch (error) {
        console.error("Redirect mesajı ayrıştırma hatası:", error);
      }
    };

    socket.addEventListener("message", redirectHandler);
    return () => {
      socket.removeEventListener("message", redirectHandler);
    };
  }, [navigate]);

  if (!character) {
    return <div style={{ padding: '20px' }}>Karakter verileri yükleniyor...</div>;
  }

  // XP eşiğini hesaplayalım: seviye 1 için 100, seviye 2 için 200, seviye 3 için 400, vb.
  const xpThreshold = character.level >= 20 ? Infinity : 100 * Math.pow(2, character.level - 1);

  // Level up bilgilerini almak için API çağrısı
  const fetchLevelUpInfo = async () => {
    try {
      const response = await api.get(`characters/${character.id}/level-up-info/`);
      setLevelUpInfo(response.data.level_up_info);
    } catch (error) {
      console.error("Level up bilgileri alınırken hata:", error);
    }
  };

  // Level up işlemini onaylamak için API çağrısı
  const confirmLevelUp = async () => {
    try {
      const response = await api.post(`characters/${character.id}/confirm-level-up/`);
      setLevelUpInfo(null);
      setCharacter(prev => ({
        ...prev,
        level: response.data.new_level,
        xp: 0,
        hp: prev.hp + response.data.level_up_info.hp_increase
      }));
      // WebSocket üzerinden güncellemeyi yayınlayabilirsiniz.
      socket.send(JSON.stringify({ event: "characterUpdate", character: { ...character, level: response.data.new_level, xp: 0 } }));
    } catch (error) {
      console.error("Level up işlemi onaylanırken hata:", error);
    }
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '20px auto',
      backgroundColor: '#f8f8f8',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <h1>{character.name}</h1>
      <p><strong>HP:</strong> {character.hp}</p>
      <p><strong>Level:</strong> {character.level}</p>
      <p><strong>XP:</strong> {character.xp} / {xpThreshold}</p>

      {/* Eğer XP eşiği aşıldıysa Level Up butonu göster */}
      {character.xp >= xpThreshold && (
        <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #4CAF50', borderRadius: '4px', backgroundColor: '#e8f5e9' }}>
          <h3>Level Up!</h3>
          {!levelUpInfo ? (
            <button onClick={fetchLevelUpInfo} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
              Level Up Bilgilerini Getir
            </button>
          ) : (
            <div>
              <p><strong>Beklenen HP Artışı:</strong> {levelUpInfo.hp_increase}</p>
              {/* İleride ek artışlar eklenebilir: büyü slotları, yetenekler vs. */}
              <button onClick={confirmLevelUp} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
                Level Up Onayla
              </button>
            </div>
          )}
        </div>
      )}

      <section style={{ marginTop: '20px' }}>
        <h3>Statlar</h3>
        <ul>
          <li><strong>Strength:</strong> {character.strength}</li>
          <li><strong>Dexterity:</strong> {character.dexterity}</li>
          <li><strong>Constitution:</strong> {character.constitution}</li>
          <li><strong>Intelligence:</strong> {character.intelligence}</li>
          <li><strong>Wisdom:</strong> {character.wisdom}</li>
          <li><strong>Charisma:</strong> {character.charisma}</li>
        </ul>
      </section>
      <section style={{ marginTop: '20px' }}>
        <h3>Envanter (Eşyalar)</h3>
        {character.equipment && character.equipment.length > 0 ? (
          <ul>
            {character.equipment.map((item, index) => (
              <li key={index}>
                <strong>{item.name}</strong> - {item.description}
              </li>
            ))}
          </ul>
        ) : (
          <p>Envanter boş.</p>
        )}
      </section>
      <section style={{ marginTop: '20px' }}>
        <h3>Büyüler</h3>
        {character.prepared_spells && character.prepared_spells.length > 0 ? (
          <ul>
            {character.prepared_spells.map((spell, index) => (
              <li key={index}>
                <strong>{spell.name}</strong> (Seviye: {spell.spell_level})<br />
                <em>{spell.description}</em><br />
                <small>Efekt: {spell.effect && spell.effect.text}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>Hazır büyü bulunmuyor.</p>
        )}
      </section>
    </div>
  );
};

export default PlayerPage;
