// src/pages/CharacterCreation.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import './Dashboard.css';
import './CharacterCreation.css';

const CharacterCreation = () => {
  const { lobby_id } = useParams();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("user_id"), 10);

  // --- Point-buy hesaplama ---
  const totalPoints = 27;
  const cost = (value) =>
    value <= 13 ? value - 8 : 5 + 2 * (value - 13);

  // --- State’ler ---
  const [step, setStep] = useState(1);

  const [races, setRaces] = useState([]);
  const [classes, setClasses] = useState([]);

  // Başlangıçta boş değerler
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [gender, setGender] = useState('');

  const [strength, setStrength] = useState(8);
  const [dexterity, setDexterity] = useState(8);
  const [constitution, setConstitution] = useState(8);
  const [intelligence, setIntelligence] = useState(8);
  const [wisdom, setWisdom] = useState(8);
  const [charisma, setCharisma] = useState(8);

  const [bonusAssignments, setBonusAssignments] = useState({
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  });

  const [startItems, setStartItems] = useState([]);
  const [availableSpells, setAvailableSpells] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);
  const MAX_ZERO_LEVEL = 2;
  const MAX_FIRST_LEVEL = 1;

  const [characterName, setCharacterName] = useState('');
  const [background, setBackground] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState('');

  // --- Toplam harcanan ve kalan puan ---
  const totalSpent =
    cost(strength) +
    cost(dexterity) +
    cost(constitution) +
    cost(intelligence) +
    cost(wisdom) +
    cost(charisma);

  const remainingPoints = totalPoints - totalSpent;

  // --- API’den ırk ve sınıf çek ---
  useEffect(() => {
    api.get('races/')
      .then(res => setRaces(res.data))
      .catch(console.error);

    api.get('classes/')
      .then(res => setClasses(res.data))
      .catch(console.error);
  }, []);

  // --- Sınıfa göre şablon, eşyalar ve büyüler çek ---
  useEffect(() => {
    if (!selectedClass) return;

    api.get(`character-templates/?class=${selectedClass}`)
      .then(res => {
        const tpl = res.data[0];
        if (tpl) {
          setStrength(tpl.strength);
          setDexterity(tpl.dexterity);
          setConstitution(tpl.constitution);
          setIntelligence(tpl.intelligence);
          setWisdom(tpl.wisdom);
          setCharisma(tpl.charisma);
        }
      })
      .catch(console.error);

    api.get(`items/?rarity=Start&name__icontains=${selectedClass}`)
      .then(res => setStartItems(res.data))
      .catch(() => setStartItems([]));

    api.get(`spells/?classes__icontains=${selectedClass}&spell_level__lte=1`)
      .then(res => setAvailableSpells(res.data))
      .catch(() => setAvailableSpells([]));
  }, [selectedClass]);

  // --- WebSocket üzerinden dinamik güncelleme ---
  useEffect(() => {
    const handler = e => {
      const data = JSON.parse(e.data);
      if (data.event === 'characterCreationUpdate') {
        data.races && setRaces(data.races);
        data.classes && setClasses(data.classes);
        data.startItems && setStartItems(data.startItems);
        data.spells && setAvailableSpells(data.spells);
      }
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, []);

  // --- Stat arttırma/azaltma ve bonus atama ---
  const changeStat = (stat, delta) => {
    const map = {
      strength: [strength, setStrength],
      dexterity: [dexterity, setDexterity],
      constitution: [constitution, setConstitution],
      intelligence: [intelligence, setIntelligence],
      wisdom: [wisdom, setWisdom],
      charisma: [charisma, setCharisma]
    };
    const [value, setter] = map[stat];
    const newValue = value + delta;
    if (newValue < 8 || newValue > 17) return;
    const newSpent = totalSpent - cost(value) + cost(newValue);
    if (newSpent > totalPoints) return;
    setter(newValue);
  };

  const toggleBonus = stat => {
    const totalBonus = Object.values(bonusAssignments).reduce((a,b) => a + b, 0);
    if (!bonusAssignments[stat] && totalBonus >= 2) {
      return alert('En fazla 2 bonus puan seçebilirsiniz.');
    }
    setBonusAssignments({
      ...bonusAssignments,
      [stat]: bonusAssignments[stat] ? 0 : 1
    });
  };

  // --- Büyü seçimi ---
const toggleSpell = (spell) => {
    const zeroCount = selectedSpells.filter(s => s.spell_level === 0).length;
    const oneCount = selectedSpells.filter(s => s.spell_level === 1).length;

    const alreadySelected = selectedSpells.some(s => s.id === spell.id);

    if (alreadySelected) {
      setSelectedSpells(selectedSpells.filter(s => s.id !== spell.id));
    } else {
      if ((spell.spell_level === 0 && zeroCount >= MAX_ZERO_LEVEL) ||
          (spell.spell_level === 1 && oneCount >= MAX_FIRST_LEVEL)) {
        return alert(`Bu seviyeden daha fazla seçemezsiniz.`);
      }
      setSelectedSpells([...selectedSpells, spell]);
    }
  };

  // --- Form adımları ---
  const next = () => setStep(step + 1);
  const prev = () => setStep(step - 1);

  // --- Gönderim ---
  const handleSubmit = async e => {
    e.preventDefault();
    const finalStats = {
      strength: strength + bonusAssignments.strength,
      dexterity: dexterity + bonusAssignments.dexterity,
      constitution: constitution + bonusAssignments.constitution,
      intelligence: intelligence + bonusAssignments.intelligence,
      wisdom: wisdom + bonusAssignments.wisdom,
      charisma: charisma + bonusAssignments.charisma
    };
    const payload = {
      player_id: currentUserId,
      lobby_id: Number(lobby_id),
      name: characterName,
      race: selectedRace,
      character_class: selectedClass,
      gender,
      level: 1,
      hp: 10,
      ...finalStats,
      gold: 10,
      equipment: startItems,
      prepared_spells_input: selectedSpells.map(s => ({ id: s.id })),
      class_features: {},
      xp: 0,
      background,
      personality_traits: personalityTraits
    };
    try {
      await api.post('characters/', payload);
      alert('Karakter başarıyla oluşturuldu!');
      navigate(`/lobbies/${lobby_id}`);
    } catch {
      alert('Karakter oluşturulamadı.');
    }
  };

  // --- Dinamik görsel ---
  let imgSrc = null;
  try {
    imgSrc = require(`../assets/character/${selectedRace}-${selectedClass}-${gender}.png`);
  } catch {
    imgSrc = require(`../assets/character/rndm1.jpg`);
  }

  return (
    <div className="character-creation-container">
      <div className="cc-panel">
        <h2>Yeni Karakter Oluşturma</h2>
        <form onSubmit={handleSubmit}>

          {step === 1 && (
            <>
              <h3>Adım 1: Irk, Sınıf ve Cinsiyet Seçimi</h3>
              <label>
                <strong>Irk:</strong>
                <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
                  <option value="" hidden>-- Irk Seçiniz --</option>
                  {races.map(r => (
                    <option key={r.race_name} value={r.race_name}>
                      {r.race_name} – {r.description}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <strong>Sınıf:</strong>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="" hidden>-- Sınıf Seçiniz --</option>
                  {classes.map(c => (
                    <option key={c.class_name} value={c.class_name}>
                      {c.class_name} – {c.description}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <strong>Cinsiyet:</strong>
                <select value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="" hidden>-- Cinsiyet Seçiniz --</option>
                  <option value="Male">Erkek</option>
                  <option value="Female">Kadın</option>
                  <option value="Other">Diğer</option>
                </select>
              </label>

              <button type="button" onClick={next} disabled={!selectedRace || !selectedClass || !gender}>
                Devam Et
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h3>Adım 2: Stat Değerlerini Düzenle</h3>
              <p><strong>Kalan Puan:</strong> {remainingPoints}</p>

              {/* Stat satırları */}
              <p>
                <strong>Strength:</strong> {strength}
                {bonusAssignments.strength ? ` (+${bonusAssignments.strength})` : ''} 
                (Toplam: {strength + bonusAssignments.strength})
                <button type="button" onClick={() => changeStat('strength', +1)}>+</button>
                <button type="button" onClick={() => changeStat('strength', -1)}>-</button>
                <input
                  type="checkbox"
                  checked={bonusAssignments.strength === 1}
                  onChange={() => toggleBonus('strength')}
                /> Bonus
              </p>

              <p>
                <strong>Dexterity:</strong> {dexterity}
                {bonusAssignments.dexterity ? ` (+${bonusAssignments.dexterity})` : ''} 
                (Toplam: {dexterity + bonusAssignments.dexterity})
                <button type="button" onClick={() => changeStat('dexterity', +1)}>+</button>
                <button type="button" onClick={() => changeStat('dexterity', -1)}>-</button>
                <input
                  type="checkbox"
                  checked={bonusAssignments.dexterity === 1}
                  onChange={() => toggleBonus('dexterity')}
                /> Bonus
              </p>

              <p>
                <strong>Constitution:</strong> {constitution}
                {bonusAssignments.constitution ? ` (+${bonusAssignments.constitution})` : ''} 
                (Toplam: {constitution + bonusAssignments.constitution})
                <button type="button" onClick={() => changeStat('constitution', +1)}>+</button>
                <button type="button" onClick={() => changeStat('constitution', -1)}>-</button>
                <input
                  type="checkbox"
                  checked={bonusAssignments.constitution === 1}
                  onChange={() => toggleBonus('constitution')}
                /> Bonus
              </p>

              <p>
                <strong>Intelligence:</strong> {intelligence}
                {bonusAssignments.intelligence ? ` (+${bonusAssignments.intelligence})` : ''} 
                (Toplam: {intelligence + bonusAssignments.intelligence})
                <button type="button" onClick={() => changeStat('intelligence', +1)}>+</button>
                <button type="button" onClick={() => changeStat('intelligence', -1)}>-</button>
                <input
                  type="checkbox"
                  checked={bonusAssignments.intelligence === 1}
                  onChange={() => toggleBonus('intelligence')}
                /> Bonus
              </p>

              <p>
                <strong>Wisdom:</strong> {wisdom}
                {bonusAssignments.wisdom ? ` (+${bonusAssignments.wisdom})` : ''} 
                (Toplam: {wisdom + bonusAssignments.wisdom})
                <button type="button" onClick={() => changeStat('wisdom', +1)}>+</button>
                <button type="button" onClick={() => changeStat('wisdom', -1)}>-</button>
                <input
                  type="checkbox"
                  checked={bonusAssignments.wisdom === 1}
                  onChange={() => toggleBonus('wisdom')}
                /> Bonus
              </p>

              <p>
                <strong>Charisma:</strong> {charisma}
                {bonusAssignments.charisma ? ` (+${bonusAssignments.charisma})` : ''} 
                (Toplam: {charisma + bonusAssignments.charisma})
                <button type="button" onClick={() => changeStat('charisma', +1)}>+</button>
                <button type="button" onClick={() => changeStat('charisma', -1)}>-</button>
                <input
                  type="checkbox"
                  checked={bonusAssignments.charisma === 1}
                  onChange={() => toggleBonus('charisma')}
                /> Bonus
              </p>

              <button type="button" onClick={prev}>Geri</button>
              <button type="button" onClick={next}>Devam Et</button>
            </>
          )}

          {step === 3 && (
            <>
              <h3>Adım 3: Equipment ve Spells</h3>

              <div>
                <strong>Başlangıç Item'leri:</strong>
                <ul>
                  {startItems.map(item => (
                    <li key={item.item_id}>
                      <strong>{item.name}</strong>: {item.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <strong>Mevcut Büyüler:</strong>
                <ul>
                  {availableSpells.map(spell => (
                    <li key={spell.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSpells.some(s => s.id === spell.id)}
                          onChange={() => toggleSpell(spell)}
                        />
                        <strong>{spell.name}</strong> (Seviye: {spell.spell_level})
                      </label>
                    </li>
                  ))}
                </ul>q
              </div>

              <button type="button" onClick={prev}>Geri</button>
              <button type="button" onClick={next}>Devam Et</button>
            </>
          )}

          {step === 4 && (
            <>
              <h3>Adım 4: Karakter İsmi & Ek Bilgiler</h3>

              <label>
                Karakter İsmi:
                <input
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  required
                />
              </label>

              <label>
                Arka Plan:
                <input
                  type="text"
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                />
              </label>

              <label>
                Kişilik Özellikleri:
                <textarea
                  value={personalityTraits}
                  onChange={e => setPersonalityTraits(e.target.value)}
                />
              </label>

              <button type="button" onClick={prev}>Geri</button>
              <button type="submit" disabled={!characterName}>
                Karakter Oluştur
              </button>
            </>
          )}

        </form>
      </div>

      {selectedRace && selectedClass && gender && (
        <div className="character-image">
          <img src={imgSrc} alt="Karakter Önizleme" />
        </div>
      )}
    </div>
  );
};

export default CharacterCreation;