// CreatureCreate.js
import React, { useState, useEffect } from 'react';
import api from "../services/api";
import './Creature.css';

const CreatureCreate = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hitPoints, setHitPoints] = useState('');
  const [armorClass, setArmorClass] = useState('');
  const [challengeRating, setChallengeRating] = useState('');
  const [meleeDice, setMeleeDice] = useState('');
  const [rangedDice, setRangedDice] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [spells, setSpells] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('spells/')
      .then(res => {
        const data = res.data.results ?? res.data;
        setSpells(data);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSpellChange = (e) => {
    const opts = Array.from(e.target.options);
    const vals = opts.filter(o => o.selected).map(o => o.value);
    setSelectedSpells(vals);
  };

  const handleIconChange = (e) => {
    setIconFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', name);
    data.append('description', description);
    data.append('hit_points', hitPoints);
    data.append('armor_class', armorClass);
    data.append('challenge_rating', challengeRating);
    if (meleeDice)   data.append('melee_attack_dice', meleeDice);
    if (rangedDice)  data.append('ranged_attack_dice', rangedDice);
    if (iconFile)    data.append('icon', iconFile);
    selectedSpells.forEach(id => data.append('spells', id));

    try {
      await api.post('creatures/', data);
      // Başarılıysa formu resetleyelim
      setName(''); setDescription('');
      setHitPoints(''); setArmorClass('');
      setChallengeRating(''); setMeleeDice('');
      setRangedDice(''); setIconFile(null);
      setSelectedSpells([]); setErrors({});
      alert('Creature başarıyla oluşturuldu!');
    } catch (err) {
      setErrors(err.response?.data || { non_field_errors: ['Beklenmeyen hata'] });
    }
  };

  return (
    <form className="creature-form" onSubmit={handleSubmit} noValidate>
      <h2>Yeni Yaratık Oluştur</h2>

      <label>İsim</label>
      <input
        type="text" value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      {errors.name && <small className="error">{errors.name}</small>}

      <label>Açıklama</label>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <label>Hit Points (HP)</label>
      <input
        type="number" value={hitPoints}
        onChange={e => setHitPoints(e.target.value)}
        required
      />
      {errors.hit_points && <small className="error">{errors.hit_points}</small>}

      <label>Armor Class (AC)</label>
      <input
        type="number" value={armorClass}
        onChange={e => setArmorClass(e.target.value)}
        required
      />
      {errors.armor_class && <small className="error">{errors.armor_class}</small>}

      <label>Challenge Rating (CR)</label>
      <input
        type="number" step="0.1" value={challengeRating}
        onChange={e => setChallengeRating(e.target.value)}
      />

      <label>Melee Attack Dice</label>
      <input
        type="text" placeholder="örn. 2d6+3"
        value={meleeDice}
        onChange={e => setMeleeDice(e.target.value)}
      />

      <label>Ranged Attack Dice</label>
      <input
        type="text" placeholder="örn. 1d8+2"
        value={rangedDice}
        onChange={e => setRangedDice(e.target.value)}
      />

      <label>Yaratık İkonu</label>
      <input
        type="file" accept="image/*"
        onChange={handleIconChange}
      />

      <label>Büyü Seçimi</label>
      <select
        multiple
        value={selectedSpells}
        onChange={handleSpellChange}
        size={Math.min(5, spells.length)}
      >
        {spells.map(sp => (
          <option key={sp.id} value={sp.id}>
            {sp.name} (Lv {sp.level})
          </option>
        ))}
      </select>
      {errors.spells && <small className="error">{errors.spells}</small>}

      <button type="submit">Oluştur</button>
    </form>
  );
};

export default CreatureCreate;
