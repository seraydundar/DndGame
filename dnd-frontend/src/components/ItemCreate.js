// src/components/ItemCreate.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ItemCreate.css';

// CSRF token helper
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Axios global configuration
axios.defaults.baseURL         = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRFToken'] = getCookie('csrftoken');

// Constants
const ITEM_TYPES     = ['Weapon','Armor','Consumable','Misc'];
const SUBTYPES       = [ /* aynı listeler */ ];
const RARITY_CHOICES = ['Common','Uncommon','Rare','Legendary'];
const EQUIP_SLOTS    = [ /* aynı listeler */ ];
const BONUS_STATS    = ['attack_bonus','dexterity','strength','constitution','intelligence','wisdom','charisma'];

export default function ItemCreate() {
  // State’ler
  const [allSpells,      setAllSpells]      = useState([]);
  const [bonuses,        setBonuses]        = useState([]);
  const [newBonus,       setNewBonus]       = useState({ stat:'', type:'add', value:0 });
  const [selectedSpells, setSelectedSpells] = useState([]);
  const [iconPreview,    setIconPreview]    = useState(null);
  const [rawMode,        setRawMode]        = useState(false);
  const [rawJson,        setRawJson]        = useState('{}');
  const [form, setForm] = useState({
    name: '', description:'', item_type: '', subtype: '', rarity: '', equip_slot: '',
    two_handed: false, damage_dice: '', damage_modifier: '', ac_bonus: ''
  });

  // Spell’leri çek
  useEffect(() => {
    axios.get('/api/spells/')
      .then(res => setAllSpells(res.data))
      .catch(err => console.error('Spells yüklenirken hata:', err));
  }, []);

  // Genel input handler
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Icon önizlemesi
  const handleIconChange = e => {
    const file = e.target.files[0] || null;
    setForm(f => ({ ...f, iconFile: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIconPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setIconPreview(null);
    }
  };

  // Bonus ekle/kaldır
  const addBonus    = () => {
    if (newBonus.stat) {
      setBonuses(b => [...b, newBonus]);
      setNewBonus({ stat:'', type:'add', value:0 });
    }
  };
  const removeBonus = idx => setBonuses(b => b.filter((_,i) => i!==idx));

  // Submit
  const handleSubmit = async e => {
    e.preventDefault();

    if (!rawMode) {
      const data = new FormData();

      // Sadece boş olmayanları append et
      if (form.name)           data.append('name', form.name);
      if (form.description)    data.append('description', form.description);
      if (form.iconFile)       data.append('icon', form.iconFile);
      if (form.item_type)      data.append('item_type', form.item_type);
      if (form.subtype)        data.append('subtype', form.subtype);
      if (form.rarity)         data.append('rarity', form.rarity);
      if (form.equip_slot)     data.append('equip_slot', form.equip_slot);
      if (form.two_handed)     data.append('two_handed', form.two_handed);
      if (form.damage_dice)    data.append('damage_dice', form.damage_dice);
      if (form.damage_modifier) data.append('damage_modifier', form.damage_modifier);
      if (form.ac_bonus)       data.append('ac_bonus', form.ac_bonus);
      if (bonuses.length)      data.append('bonuses', JSON.stringify(bonuses));
      if (selectedSpells.length) data.append('spells', JSON.stringify(selectedSpells));

      try {
        await axios.post('http://127.0.0.1:8000/api/items/', data);
        alert('Eşya başarıyla oluşturuldu!');
        // Reset
        setForm({
          name:'', description:'', item_type:'', subtype:'',
          rarity:'', equip_slot:'', two_handed:false,
          damage_dice:'', damage_modifier:'', ac_bonus:''
        });
        setBonuses([]);
        setSelectedSpells([]);
        setIconPreview(null);
      } catch (err) {
        console.error('Eşya oluşturma hatası:', err);
        alert('Eşya oluşturulamadı. Konsolu kontrol edin.');
      }

    } else {
      // Raw JSON
      let payload;
      try {
        payload = JSON.parse(rawJson);
      } catch {
        return alert('Raw JSON hatalı, düzeltin.');
      }
      try {
        await axios.post('/api/items/', payload);
        alert('Eşya başarıyla oluşturuldu!');
        setRawJson('{}');
      } catch (err) {
        console.error('Eşya oluşturma hatası:', err);
        alert('Eşya oluşturulamadı. Konsolu kontrol edin.');
      }
    }
  };

  return (
    <form className="item-create-form" onSubmit={handleSubmit}>
      <button
        type="button"
        className="toggle-button"
        onClick={() => setRawMode(r => !r)}
      >
        {rawMode ? 'Switch to Builder' : 'Switch to Raw JSON'}
      </button>

      {rawMode ? (
        <textarea
          value={rawJson}
          onChange={e => setRawJson(e.target.value)}
          style={{ width:'100%', height:200, fontFamily:'monospace' }}
        />
      ) : (
        <>
          <h2>Yeni Eşya Oluştur</h2>

          <label>
            İsim
            <input name="name" value={form.name} onChange={handleChange} />
          </label>

          <label>
            Açıklama
            <textarea name="description" value={form.description} onChange={handleChange}/>
          </label>

          <label>
            Icon
            <input type="file" accept="image/*" onChange={handleIconChange} />
          </label>
          {iconPreview && <img src={iconPreview} alt="Preview" style={{maxWidth:100}} />}

          <label>
            Tür
            <select name="item_type" value={form.item_type} onChange={handleChange}>
              <option value="">—</option>
              {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label>
            Alt Tür
            <select name="subtype" value={form.subtype} onChange={handleChange}>
              <option value="">—</option>
              {SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          <label>
            Rarity
            <select name="rarity" value={form.rarity} onChange={handleChange}>
              <option value="">—</option>
              {RARITY_CHOICES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label>
            Slot
            <select name="equip_slot" value={form.equip_slot} onChange={handleChange}>
              <option value="">—</option>
              {EQUIP_SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          <label>
            İki Elli
            <input
              type="checkbox"
              name="two_handed"
              checked={form.two_handed}
              onChange={handleChange}
            />
          </label>

          <label>
            Hasar (örn. 1d8)
            <input name="damage_dice" value={form.damage_dice} onChange={handleChange} />
          </label>

          <label>
            Hasar Modifikatörü
            <input
              type="number"
              name="damage_modifier"
              value={form.damage_modifier}
              onChange={handleChange}
            />
          </label>

          <label>
            AC Bonusu
            <input
              type="number"
              name="ac_bonus"
              value={form.ac_bonus}
              onChange={handleChange}
            />
          </label>

          <fieldset>
            <legend>Ek Bonuslar</legend>
            <div className="bonus-inputs">
              <select
                value={newBonus.stat}
                onChange={e => setNewBonus(b => ({ ...b, stat:e.target.value }))}
              >
                <option value="">Stat seçin</option>
                {BONUS_STATS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                value={newBonus.type}
                onChange={e => setNewBonus(b => ({ ...b, type:e.target.value }))}
              >
                <option value="add">Ekle</option>
                <option value="mul">Çarp</option>
              </select>

              <input
                type="number"
                value={newBonus.value}
                onChange={e => setNewBonus(b => ({ ...b, value:+e.target.value }))}
                placeholder="Değer"
              />
              <button type="button" onClick={addBonus}>Add</button>
            </div>

            {bonuses.map((b,i) => (
              <div key={i} className="bonus-item">
                {b.stat} {b.type} {b.value}
                <button type="button" onClick={() => removeBonus(i)}>Remove</button>
              </div>
            ))}
          </fieldset>

          <label>
            Büyüler
            <select
              multiple
              value={selectedSpells}
              onChange={e => setSelectedSpells(
                Array.from(e.target.selectedOptions, o=>o.value)
              )}
            >
              {allSpells.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </label>
        </>
      )}

      <button type="submit">Eşyayı Oluştur</button>
    </form>
  );
}
