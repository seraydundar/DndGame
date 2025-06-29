// src/pages/CharacterCreation.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import './Dashboard.css';
import './CharacterCreation.css';

const CharacterCreation = () => {
  const lobby_id = Number(sessionStorage.getItem('lobby_id'));
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("user_id"), 10);

  const totalPoints = 27;
  const cost = v => (v <= 13 ? v - 8 : 5 + 2 * (v - 13));

  const [step, setStep] = useState(1);
  const [races, setRaces] = useState([]);
  const [classes, setClasses] = useState([]);

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
    strength:0, dexterity:0, constitution:0,
    intelligence:0, wisdom:0, charisma:0
  });

  const [availableSpells, setAvailableSpells] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);
  const MAX_ZERO_LEVEL  = 2;
  const MAX_FIRST_LEVEL = 1;

  const [characterName, setCharacterName] = useState('');
  const [background, setBackground] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState('');
  const [icon, setIcon] = useState(null);

  const totalSpent =
    cost(strength) + cost(dexterity) + cost(constitution) +
    cost(intelligence) + cost(wisdom) + cost(charisma);
  const remainingPoints = totalPoints - totalSpent;

  useEffect(() => {
    api.get('races/')
      .then(res => {
        const list = res.data.results ?? res.data;
        setRaces(list);
      })
      .catch(console.error);
    api.get('classes/')
      .then(res => {
        const list = res.data.results ?? res.data;
        setClasses(list);
      })
      .catch(console.error);
  }, []);

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

    api.get(`spells/?classes__icontains=${selectedClass}&spell_level__lte=1`)
      .then(res => setAvailableSpells(res.data))
      .catch(console.error);
  }, [selectedClass]);

  useEffect(() => {
    const handler = e => {
      const data = JSON.parse(e.data);
      if (data.event === 'characterCreationUpdate') {
        data.races   && setRaces(data.races);
        data.classes && setClasses(data.classes);
        data.spells  && setAvailableSpells(data.spells);
      }
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, []);

  const changeStat = (stat, delta) => {
    const map = {
      strength:[strength, setStrength],
      dexterity:[dexterity, setDexterity],
      constitution:[constitution, setConstitution],
      intelligence:[intelligence, setIntelligence],
      wisdom:[wisdom, setWisdom],
      charisma:[charisma, setCharisma]
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

  const toggleSpell = spell => {
    const zeroCount = selectedSpells.filter(s => s.spell_level === 0).length;
    const oneCount  = selectedSpells.filter(s => s.spell_level === 1).length;
    const already   = selectedSpells.some(s => s.id === spell.id);

    if (already) {
      setSelectedSpells(selectedSpells.filter(s => s.id !== spell.id));
    } else {
      if ((spell.spell_level === 0 && zeroCount >= MAX_ZERO_LEVEL) ||
          (spell.spell_level === 1 && oneCount  >= MAX_FIRST_LEVEL)) {
        return alert('Bu seviyeden daha fazla seçemezsiniz.');
      }
      setSelectedSpells([...selectedSpells, spell]);
    }
  };

  const next = () => setStep(step + 1);
  const prev = () => setStep(step - 1);

  const handleSubmit = async e => {
    e.preventDefault();
    const finalStats = { strength, dexterity, constitution, intelligence, wisdom, charisma };

    const formData = new FormData();
    formData.append('player_id', currentUserId);
    formData.append('name', characterName);
    formData.append('race', selectedRace);
    formData.append('character_class', selectedClass);
    formData.append('gender', gender);
    formData.append('level', 1);
    formData.append('hp', 10);
    formData.append('max_hp', 10);
    formData.append('gold', 10);
    formData.append('equipment', JSON.stringify([]));
    formData.append('class_features', JSON.stringify({}));
    formData.append('xp', 0);
    formData.append('background', background);
    formData.append('personality_traits', personalityTraits);
    formData.append('prepared_spells_input', JSON.stringify(selectedSpells.map(s => ({ id: s.id }))));
    formData.append('strength', strength);
    formData.append('dexterity', dexterity);
    formData.append('constitution', constitution);
    formData.append('intelligence', intelligence);
    formData.append('wisdom', wisdom);
    formData.append('charisma', charisma);
    if (icon) formData.append('icon', icon);

    try {
      await api.post(`lobbies/${lobby_id}/characters/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Karakter başarıyla oluşturuldu!');
      navigate(`/lobbies/${lobby_id}`);
    } catch (err) {
      console.error('Karakter oluşturma hatası:', err.response || err);
      alert('Karakter oluşturulamadı.');
    }
  };

  let imgSrc;
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

          {/* Adım 1 */}
          {step === 1 && (
            <>
              <h3>Adım 1: Irk, Sınıf ve Cinsiyet</h3>
              <label>
                Irk:
                <select value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
                  <option value="" hidden>-- Irk Seçiniz --</option>
                  {races.map(r => (
                    <option key={r.race_name} value={r.race_name}>
                      {r.race_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sınıf:
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="" hidden>-- Sınıf Seçiniz --</option>
                  {classes.map(c => (
                    <option key={c.class_name} value={c.class_name}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cinsiyet:
                <select value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="" hidden>-- Cinsiyet Seçiniz --</option>
                  <option value="Male">Erkek</option>
                  <option value="Female">Kadın</option>
                  <option value="Other">Diğer</option>
                </select>
              </label>
              <button type="button" onClick={next}
                disabled={!selectedRace||!selectedClass||!gender}
              >
                Devam Et
              </button>
            </>
          )}

          {/* Adım 2 */}
          {step === 2 && (
            <>
              <h3>Adım 2: Stat Düzenleme</h3>
              <p>Kalan Puan: {remainingPoints}</p>
              {['strength','dexterity','constitution','intelligence','wisdom','charisma'].map(stat => {
                const labels = {
                  strength:'Strength', dexterity:'Dexterity',
                  constitution:'Constitution', intelligence:'Intelligence',
                  wisdom:'Wisdom', charisma:'Charisma'
                };
                const value = {strength,dexterity,constitution,intelligence,wisdom,charisma}[stat];
                return (
                  <p key={stat}>
                    <strong>{labels[stat]}:</strong> {value}
                    {bonusAssignments[stat] ? ` (+${bonusAssignments[stat]})` : ''}
                    <button type="button" onClick={() => changeStat(stat,+1)}>+</button>
                    <button type="button" onClick={() => changeStat(stat,-1)}>-</button>
                    <input
                      type="checkbox"
                      checked={bonusAssignments[stat]===1}
                      onChange={()=>toggleBonus(stat)}
                    /> Bonus
                  </p>
                );
              })}
              <button type="button" onClick={prev}>Geri</button>
              <button type="button" onClick={next}>Devam Et</button>
            </>
          )}

          {/* Adım 3 */}
          {step === 3 && (
            <>
              <h3>Adım 3: Büyü Seçimi</h3>
              <ul>
                {availableSpells.map(spell => (
                  <li key={spell.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedSpells.some(s=>s.id===spell.id)}
                        onChange={()=>toggleSpell(spell)}
                      />
                      {spell.name} (Seviye {spell.spell_level})
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={prev}>Geri</button>
              <button type="button" onClick={next}>Devam Et</button>
            </>
          )}

          {step === 4 && (
            <>
              <h3>Adım 4: Karakter Bilgileri</h3>
              <label>
                İsim:
                <input type="text" value={characterName} onChange={e=>setCharacterName(e.target.value)} required />
              </label>
              <label>
                Arka Plan:
                <input type="text" value={background} onChange={e=>setBackground(e.target.value)} />
              </label>
              <label>
                Kişilik Özellikleri:
                <textarea value={personalityTraits} onChange={e=>setPersonalityTraits(e.target.value)} />
              </label>
              <label>
                Karakter İkonu:
                <input type="file" accept="image/*" onChange={e => setIcon(e.target.files[0])} required />
              </label>
              <button type="button" onClick={prev}>Geri</button>
              <button type="submit" disabled={!characterName}>Oluştur</button>
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
