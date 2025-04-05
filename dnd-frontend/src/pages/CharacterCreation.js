import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import TemplateDisplay from '../components/TemplateDisplay';
import socket from '../services/socket';

const CharacterCreation = () => {
  const { lobby_id } = useParams();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("user_id"), 10);
  
  const totalPoints = 27;
  const [step, setStep] = useState(1);
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [gender, setGender] = useState('Male');
  const [characterName, setCharacterName] = useState('');
  const [background, setBackground] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState('');
  
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
    charisma: 0,
  });
  
  const [availableSpells, setAvailableSpells] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);
  const MAX_ZERO_LEVEL = 2;
  const MAX_FIRST_LEVEL = 1;
  
  const [races, setRaces] = useState([]);
  const [classes, setClasses] = useState([]);
  const [startItems, setStartItems] = useState([]);
  
  const cost = (value) => {
    if (value <= 13) {
      return value - 8;
    } else {
      return 5 + 2 * (value - 13);
    }
  };

  const totalSpent = cost(strength) +
                     cost(dexterity) +
                     cost(constitution) +
                     cost(intelligence) +
                     cost(wisdom) +
                     cost(charisma);
  const remainingPoints = totalPoints - totalSpent;

  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const response = await api.get('races/');
        setRaces(response.data);
        if (response.data.length > 0 && !selectedRace) {
          setSelectedRace(response.data[0].race_name);
        }
      } catch (error) {
        console.error('Hata (races):', error);
      }
    };
    const fetchClasses = async () => {
      try {
        const response = await api.get('classes/');
        setClasses(response.data);
        if (response.data.length > 0 && !selectedClass) {
          setSelectedClass(response.data[0].class_name);
        }
      } catch (error) {
        console.error('Hata (classes):', error);
      }
    };
    fetchRaces();
    fetchClasses();
  }, [selectedRace, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      const fetchTemplate = async () => {
        try {
          const queryParam = selectedClass.trim();
          const response = await api.get(`character-templates/?class=${queryParam}`);
          console.log("Template fetch response:", response.data);
          if (response.data && response.data.length > 0) {
            const template = response.data[0];
            setStrength(template.strength);
            setDexterity(template.dexterity);
            setConstitution(template.constitution);
            setIntelligence(template.intelligence);
            setWisdom(template.wisdom);
            setCharisma(template.charisma);
          } else {
            console.log('Hazır şablon bulunamadı, varsayılan statlar kullanılacak.');
          }
        } catch (error) {
          console.error('Hata (template fetch):', error);
        }
      };
      fetchTemplate();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      const fetchStartItems = async () => {
        try {
          const rarityParam = "Start";
          const nameParam = selectedClass.trim();
          const response = await api.get(`items/?rarity=${rarityParam}&name__icontains=${nameParam}`);
          console.log("Start items response:", response.data);
          setStartItems(response.data);
        } catch (error) {
          console.error('Start items fetch error:', error);
          setStartItems([]);
        }
      };
      fetchStartItems();
    }
  }, [selectedClass, step]);

  useEffect(() => {
    if (selectedClass) {
      const fetchSpells = async () => {
        try {
          const response = await api.get(`spells/?classes__icontains=${selectedClass}&spell_level__lte=1`);
          console.log("Available spells:", response.data);
          setAvailableSpells(response.data);
        } catch (error) {
          console.error("Error fetching spells:", error);
          setAvailableSpells([]);
        }
      };
      fetchSpells();
    }
  }, [selectedClass]);

  useEffect(() => {
    const ccUpdateHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "characterCreationUpdate") {
          if (data.races) {
            setRaces(data.races);
          }
          if (data.classes) {
            setClasses(data.classes);
          }
          if (data.startItems) {
            setStartItems(data.startItems);
          }
          if (data.spells) {
            setAvailableSpells(data.spells);
          }
          console.log("CharacterCreation güncellemesi alındı:", data);
        }
      } catch (error) {
        console.error("CharacterCreationUpdate mesaj ayrıştırma hatası:", error);
      }
    };

    socket.addEventListener("message", ccUpdateHandler);
    return () => {
      socket.removeEventListener("message", ccUpdateHandler);
    };
  }, []);

  const toggleSpellSelection = (spell) => {
    if (selectedSpells.some(s => s.spell_id === spell.spell_id)) {
      setSelectedSpells(selectedSpells.filter(s => s.spell_id !== spell.spell_id));
    } else {
      if (spell.spell_level === 0) {
        const zeroLevelCount = selectedSpells.filter(s => s.spell_level === 0).length;
        if (zeroLevelCount >= MAX_ZERO_LEVEL) {
          alert(`Seviye 0 büyüden en fazla ${MAX_ZERO_LEVEL} seçebilirsiniz.`);
          return;
        }
      }
      if (spell.spell_level === 1) {
        const firstLevelCount = selectedSpells.filter(s => s.spell_level === 1).length;
        if (firstLevelCount >= MAX_FIRST_LEVEL) {
          alert(`Seviye 1 büyüden en fazla ${MAX_FIRST_LEVEL} seçebilirsiniz.`);
          return;
        }
      }
      setSelectedSpells([...selectedSpells, spell]);
    }
  };

  const toggleBonus = (stat) => {
    const current = bonusAssignments[stat];
    const totalBonus = Object.values(bonusAssignments).reduce((sum, val) => sum + val, 0);
    if (current === 0) {
      if (totalBonus >= 2) {
        alert("En fazla 2 bonus puan seçebilirsiniz.");
        return;
      }
      setBonusAssignments({ ...bonusAssignments, [stat]: 1 });
    } else {
      setBonusAssignments({ ...bonusAssignments, [stat]: 0 });
    }
  };

  const increaseStat = (statName) => {
    let current, setter;
    switch(statName) {
      case 'strength':
        current = strength; setter = setStrength; break;
      case 'dexterity':
        current = dexterity; setter = setDexterity; break;
      case 'constitution':
        current = constitution; setter = setConstitution; break;
      case 'intelligence':
        current = intelligence; setter = setIntelligence; break;
      case 'wisdom':
        current = wisdom; setter = setWisdom; break;
      case 'charisma':
        current = charisma; setter = setCharisma; break;
      default: return;
    }
    const newValue = current + 1;
    if (newValue > 17) return;
    const newTotalSpent = totalSpent - cost(current) + cost(newValue);
    if (newTotalSpent <= totalPoints) {
      setter(newValue);
    }
  };

  const decreaseStat = (statName) => {
    let current, setter;
    switch(statName) {
      case 'strength':
        current = strength; setter = setStrength; break;
      case 'dexterity':
        current = dexterity; setter = setDexterity; break;
      case 'constitution':
        current = constitution; setter = setConstitution; break;
      case 'intelligence':
        current = intelligence; setter = setIntelligence; break;
      case 'wisdom':
        current = wisdom; setter = setWisdom; break;
      case 'charisma':
        current = charisma; setter = setCharisma; break;
      default: return;
    }
    const newValue = current - 1;
    if (newValue < 8) return;
    setter(newValue);
  };

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalStrength = strength + bonusAssignments.strength;
    const finalDexterity = dexterity + bonusAssignments.dexterity;
    const finalConstitution = constitution + bonusAssignments.constitution;
    const finalIntelligence = intelligence + bonusAssignments.intelligence;
    const finalWisdom = wisdom + bonusAssignments.wisdom;
    const finalCharisma = charisma + bonusAssignments.charisma;

    const newCharacter = {
      player_id: currentUserId,
      lobby_id: Number(lobby_id),
      name: characterName,
      race: selectedRace,
      character_class: selectedClass,
      gender,
      level: 1,
      hp: 10,
      strength: finalStrength,
      dexterity: finalDexterity,
      constitution: finalConstitution,
      intelligence: finalIntelligence,
      wisdom: finalWisdom,
      charisma: finalCharisma,
      gold: 10,
      equipment: startItems,
      prepared_spells: selectedSpells,
      class_features: {},
      xp: 0,
      background,
      personality_traits: personalityTraits,
    };

    try {
      await api.post('characters/', newCharacter);
      alert('Karakter başarıyla oluşturuldu!');
      navigate(`/lobbies/${lobby_id}`);
    } catch (error) {
      console.error('Karakter oluşturma hatası:', error);
      alert('Karakter oluşturulamadı.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Yeni Karakter Oluşturma</h2>
      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div>
            <h3>Adım 1: Irk, Sınıf ve Cinsiyet Seçimi</h3>
            <div>
              <label>
                <strong>Irk:</strong>
                <select value={selectedRace} onChange={(e) => setSelectedRace(e.target.value)}>
                  {races.length > 0 ? (
                    races.map((r) => (
                      <option key={r.race_name} value={r.race_name}>
                        {r.race_name} - {r.description}
                      </option>
                    ))
                  ) : (
                    <option value="">Irk bulunamadı</option>
                  )}
                </select>
              </label>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label>
                <strong>Sınıf:</strong>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                  {classes.length > 0 ? (
                    classes.map((c) => (
                      <option key={c.class_name} value={c.class_name}>
                        {c.class_name} - {c.description}
                      </option>
                    ))
                  ) : (
                    <option value="">Sınıf bulunamadı</option>
                  )}
                </select>
              </label>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label>
                <strong>Cinsiyet:</strong>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Male">Erkek</option>
                  <option value="Female">Kadın</option>
                  <option value="Other">Diğer</option>
                </select>
              </label>
            </div>
            <br />
            <button type="button" onClick={handleNext} disabled={!selectedRace || !selectedClass}>
              Devam Et
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Adım 2: Stat Değerlerini Düzenle</h3>
            <p>
              <strong>Kalan Point-Buy Puanı:</strong> {remainingPoints}
            </p>
            <div>
              {/* Stat ayarlama */}
              <p>
                <strong>Strength:</strong> {strength} {bonusAssignments.strength ? `(+${bonusAssignments.strength})` : ""} (Toplam: {strength + bonusAssignments.strength})
                <button type="button" onClick={() => increaseStat('strength')}>+</button>
                <button type="button" onClick={() => decreaseStat('strength')}>-</button>
                <input type="checkbox" checked={bonusAssignments.strength === 1} onChange={() => toggleBonus('strength')} /> Bonus
              </p>
              {/* Diğer statlar benzer şekilde */}
              <p>
                <strong>Dexterity:</strong> {dexterity} {bonusAssignments.dexterity ? `(+${bonusAssignments.dexterity})` : ""} (Toplam: {dexterity + bonusAssignments.dexterity})
                <button type="button" onClick={() => increaseStat('dexterity')}>+</button>
                <button type="button" onClick={() => decreaseStat('dexterity')}>-</button>
                <input type="checkbox" checked={bonusAssignments.dexterity === 1} onChange={() => toggleBonus('dexterity')} /> Bonus
              </p>
              <p>
                <strong>Constitution:</strong> {constitution} {bonusAssignments.constitution ? `(+${bonusAssignments.constitution})` : ""} (Toplam: {constitution + bonusAssignments.constitution})
                <button type="button" onClick={() => increaseStat('constitution')}>+</button>
                <button type="button" onClick={() => decreaseStat('constitution')}>-</button>
                <input type="checkbox" checked={bonusAssignments.constitution === 1} onChange={() => toggleBonus('constitution')} /> Bonus
              </p>
              <p>
                <strong>Intelligence:</strong> {intelligence} {bonusAssignments.intelligence ? `(+${bonusAssignments.intelligence})` : ""} (Toplam: {intelligence + bonusAssignments.intelligence})
                <button type="button" onClick={() => increaseStat('intelligence')}>+</button>
                <button type="button" onClick={() => decreaseStat('intelligence')}>-</button>
                <input type="checkbox" checked={bonusAssignments.intelligence === 1} onChange={() => toggleBonus('intelligence')} /> Bonus
              </p>
              <p>
                <strong>Wisdom:</strong> {wisdom} {bonusAssignments.wisdom ? `(+${bonusAssignments.wisdom})` : ""} (Toplam: {wisdom + bonusAssignments.wisdom})
                <button type="button" onClick={() => increaseStat('wisdom')}>+</button>
                <button type="button" onClick={() => decreaseStat('wisdom')}>-</button>
                <input type="checkbox" checked={bonusAssignments.wisdom === 1} onChange={() => toggleBonus('wisdom')} /> Bonus
              </p>
              <p>
                <strong>Charisma:</strong> {charisma} {bonusAssignments.charisma ? `(+${bonusAssignments.charisma})` : ""} (Toplam: {charisma + bonusAssignments.charisma})
                <button type="button" onClick={() => increaseStat('charisma')}>+</button>
                <button type="button" onClick={() => decreaseStat('charisma')}>-</button>
                <input type="checkbox" checked={bonusAssignments.charisma === 1} onChange={() => toggleBonus('charisma')} /> Bonus
              </p>
            </div>
            <button type="button" onClick={handlePrev}>Geri</button>
            <button type="button" onClick={handleNext}>Devam Et</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>Adım 3: Equipment ve Spells Düzenle</h3>
            <div>
              <strong>Başlangıç Item'leri:</strong>
              {startItems.length > 0 ? (
                <ul>
                  {startItems.map((item) => (
                    <li key={item.item_id}>
                      <strong>{item.name}</strong>: {item.description} (Attributes: {JSON.stringify(item.attributes)})
                    </li>
                  ))}
                </ul>
              ) : (
                <span> Başlangıç item'i bulunamadı.</span>
              )}
            </div>
            <br />
            <div>
              <strong>Mevcut Büyüler:</strong>
              {availableSpells.length > 0 ? (
                <ul>
                  {availableSpells.map((spell) => (
                    <li key={spell.spell_id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSpells.some(s => s.spell_id === spell.spell_id)}
                          onChange={() => toggleSpellSelection(spell)}
                        />
                        <strong>{spell.name}</strong> (Seviye: {spell.spell_level}) - {spell.school}<br />
                        <small>Açıklama: {spell.description}</small><br />
                        <small>Efekt: {spell.effect?.text}</small>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <span>Büyü bulunamadı.</span>
              )}
            </div>
            <button type="button" onClick={handlePrev}>Geri</button>
            <button type="button" onClick={handleNext}>Devam Et</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3>Adım 4: Karakter İsmi ve Ek Bilgiler</h3>
            <label>Karakter İsmi:</label>
            <input type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)} required /><br />
            <label>Arka Plan (Background):</label>
            <input type="text" value={background} onChange={(e) => setBackground(e.target.value)} /><br />
            <label>Kişilik Özellikleri (Personality Traits):</label>
            <textarea value={personalityTraits} onChange={(e) => setPersonalityTraits(e.target.value)} /><br />
            <button type="button" onClick={handlePrev}>Geri</button>
            <button type="submit" disabled={!characterName}>Karakter Oluştur</button>
          </div>
        )}
      </form>
    </div>
  );
};

export default CharacterCreation;
