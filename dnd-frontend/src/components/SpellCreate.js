// src/components/SpellCreate.js

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './SpellCreate.css';

const SpellCreate = () => {
  // 1️⃣ Form verisi
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconFile: null,       // Dosya yükleme için
    spell_level: 0,
    school: '',
    classes: [],

    casting_time: '',
    range: '',
    components: { verbal: false, somatic: false, material: false },
    material_detail: '',
    duration: '',
    concentration: false,
    ritual: false,

    effect: {
      type: 'damage',           // damage | heal | buff | debuff | utility
      dice: { num: 1, size: 6, modifier: 0 },
      target: 'enemy',          // enemy | ally | self | all
      // optional:
      damage_type: 'fire',
      area: { shape: 'sphere', radius: 20 },
      save: { ability: 'Dex', on_success: 'half' },
    },
  })

  // 2️⃣ Yardımcı seçenekler
  const schoolOptions = [
    'Evocation','Necromancy','Abjuration','Conjuration',
    'Divination','Enchantment','Illusion','Transmutation'
  ]
  const classOptions = [
    'Wizard','Sorcerer','Cleric','Druid','Warlock','Bard'
  ]
  const effectTypes  = ['damage','heal','buff','debuff','utility']
  const targetOptions = ['self','ally','enemy','all']
  const saveAbilities = ['Str','Dex','Con','Int','Wis','Cha']
  const saveOutcomes  = ['none','half','negates']

  // 3️⃣ Raw JSON modu
  const [rawMode, setRawMode] = useState(false)
  const [rawJson, setRawJson] = useState(JSON.stringify(formData, null, 2))
  useEffect(() => {
    if (!rawMode) setRawJson(JSON.stringify(formData, null, 2))
  }, [formData, rawMode])

  // 4️⃣ Genel input değişim yöneticisi
  const handleChange = e => {
    const { name, value, type, checked } = e.target
    if (name.includes('components.')) {
      const key = name.split('.')[1]
      setFormData(fd => ({
        ...fd,
        components: { ...fd.components, [key]: checked }
      }))
    } else if (name.includes('effect.')) {
      const parts = name.split('.')
      setFormData(fd => {
        const newEffect = { ...fd.effect }
        if (parts[1] === 'dice') {
          newEffect.dice = { ...newEffect.dice, [parts[2]]: Number(value) }
        } else if (parts[1] === 'area') {
          newEffect.area = { ...newEffect.area, [parts[2]]: Number(value) }
        } else if (parts[1] === 'save') {
          newEffect.save = { ...newEffect.save, [parts[2]]: value }
        } else {
          newEffect[parts[1]] = type === 'checkbox' ? checked : value
        }
        return { ...fd, effect: newEffect }
      })
    } else if (type === 'checkbox') {
      setFormData(fd => ({ ...fd, [name]: checked }))
    } else if (type === 'select-multiple') {
      const selected = Array.from(e.target.selectedOptions).map(o => o.value)
      setFormData(fd => ({ ...fd, [name]: selected }))
    } else {
      setFormData(fd => ({ ...fd, [name]: value }))
    }
  }

  // 🔹 Dosya seçimi
  const handleFileChange = e => {
    const file = e.target.files[0] || null
    setFormData(fd => ({ ...fd, iconFile: file }))
  }

  // 5️⃣ Form gönderimi
  const handleSubmit = async e => {
    e.preventDefault()

    if (!rawMode) {
      // Multipart form data ile gönder
      const data = new FormData()
      data.append('name', formData.name)
      data.append('description', formData.description)
      if (formData.iconFile) data.append('icon', formData.iconFile)
      data.append('spell_level', formData.spell_level)
      data.append('school', formData.school)
      data.append('classes', JSON.stringify(formData.classes))
      data.append('casting_time', formData.casting_time)
      data.append('range', formData.range)
      data.append('components', JSON.stringify(formData.components))
      data.append('material_detail', formData.material_detail)
      data.append('duration', formData.duration)
      data.append('concentration', formData.concentration)
      data.append('ritual', formData.ritual)
      data.append('effect', JSON.stringify(formData.effect))

      try {
        await axios.post(
          'http://localhost:8000/api/spells/',
          data,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        alert('Spell başarıyla oluşturuldu!')
        // Formu sıfırla
        setFormData({
          name: '', description: '', iconFile: null,
          spell_level: 0, school: '', classes: [],
          casting_time: '', range: '',
          components: { verbal: false, somatic: false, material: false },
          material_detail: '', duration: '',
          concentration: false, ritual: false,
          effect: {
            type: 'damage', dice: { num:1, size:6, modifier:0 },
            target:'enemy', damage_type:'fire',
            area:{ shape:'sphere', radius:20 },
            save:{ ability:'Dex', on_success:'half' },
          }
        })
      } catch (err) {
        console.error(err)
        alert('Sunucu hatası: ' + (err.response?.data || err.message))
      }
      return
    }

    // Raw JSON modu
    let payload
    try {
      payload = JSON.parse(rawJson)
    } catch {
      return alert('Raw JSON hatalı, lütfen düzeltin.')
    }
    try {
      await axios.post('http://localhost:8000/api/spells/', payload)
      alert('Spell başarıyla oluşturuldu!')
    } catch (err) {
      console.error(err)
      alert('Sunucu hatası: ' + (err.response?.data || err.message))
    }
  }

  return (
    <form className="spell-create-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Create New Spell</h2>
      <button
        type="button"
        className="toggle-button"
        onClick={() => setRawMode(r => !r)}
      >
        {rawMode ? 'Switch to Builder' : 'Switch to Raw JSON'}
      </button>

      {rawMode ? (
        <textarea
          className="raw-json-area"
          value={rawJson}
          onChange={e => setRawJson(e.target.value)}
          style={{ width: '100%', height: 300, fontFamily: 'monospace' }}
        />
      ) : (
        <>
          {/* — Temel Bilgiler — */}
          <fieldset className="form-section">
            <legend>General Info</legend>
            <div className="form-row">
              <label>
                Name
                <input name="name" value={formData.name} onChange={handleChange} required />
              </label>
              <label>
                Description
                <textarea name="description" value={formData.description} onChange={handleChange} />
              </label>
              <label>
                Spell Icon (PNG/JPG)
                <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFileChange} />
              </label>
              <label>
                Spell Level
                <input
                  type="number" name="spell_level"
                  min={0} max={9}
                  value={formData.spell_level}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                School
                <select name="school" value={formData.school} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                Classes
                <select name="classes" multiple value={formData.classes} onChange={handleChange}>
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          {/* — Mekanik Bilgiler — */}
          <fieldset className="form-section">
            <legend>Mechanics</legend>
            <div className="form-row">
              <label>
                Casting Time
                <input name="casting_time" value={formData.casting_time} onChange={handleChange} />
              </label>
              <label>
                Range
                <input name="range" value={formData.range} onChange={handleChange} />
              </label>
              <label>
                Duration
                <input name="duration" value={formData.duration} onChange={handleChange} />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="concentration"
                  checked={formData.concentration}
                  onChange={handleChange}
                />
                Requires Concentration
              </label>
              <label>
                <input
                  type="checkbox"
                  name="ritual"
                  checked={formData.ritual}
                  onChange={handleChange}
                />
                Ritual
              </label>
            </div>
            <fieldset>
              <legend>Components</legend>
              <div className="form-row">
                {['verbal','somatic','material'].map(key => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      name={`components.${key}`}
                      checked={formData.components[key]}
                      onChange={handleChange}
                    />
                    {key}
                  </label>
                ))}
                {formData.components.material && (
                  <label>
                    Material Detail
                    <input
                      name="material_detail"
                      value={formData.material_detail}
                      onChange={handleChange}
                    />
                  </label>
                )}
              </div>
            </fieldset>
          </fieldset>

          {/* — Effect Builder — */}
          <fieldset className="form-section">
            <legend>Effect</legend>
            <div className="form-row">
              <label>
                Type
                <select name="effect.type" value={formData.effect.type} onChange={handleChange}>
                  {effectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label>
                Target
                <select name="effect.target" value={formData.effect.target} onChange={handleChange}>
                  {targetOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {['damage','heal','buff','debuff'].includes(formData.effect.type) && (
                <label>
                  Dice (A d B + C)
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      name="effect.dice.num"
                      value={formData.effect.dice.num}
                      onChange={handleChange}
                      style={{ width: 50 }}
                    /> d
                    <input
                      type="number"
                      name="effect.dice.size"
                      value={formData.effect.dice.size}
                      onChange={handleChange}
                      style={{ width: 50 }}
                    /> +
                    <input
                      type="number"
                      name="effect.dice.modifier"
                      value={formData.effect.dice.modifier}
                      onChange={handleChange}
                      style={{ width: 50 }}
                    />
                  </div>
                </label>
              )}
              {formData.effect.type === 'damage' && (
                <label>
                  Damage Type
                  <input name="effect.damage_type" value={formData.effect.damage_type} onChange={handleChange} />
                </label>
              )}
              <label>
                Area Shape
                <input name="effect.area.shape" value={formData.effect.area?.shape || ''} onChange={handleChange} />
              </label>
              <label>
                Area Radius
                <input
                  type="number"
                  name="effect.area.radius"
                  value={formData.effect.area?.radius || 0}
                  onChange={handleChange}
                />
              </label>
              <label>
                Save Ability
                <select name="effect.save.ability" value={formData.effect.save?.ability || ''} onChange={handleChange}>
                  {saveAbilities.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label>
                On Success
                <select name="effect.save.on_success" value={formData.effect.save?.on_success || ''} onChange={handleChange}>
                  {saveOutcomes.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>
          </fieldset>
        </>
      )}

      <button type="submit">Save Spell</button>
    </form>
  )
}

export default SpellCreate
