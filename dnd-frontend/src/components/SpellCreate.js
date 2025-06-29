// src/components/SpellCreate.js

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import parchmentBg from '../assets/parchment1.jpg';
import './SpellCreate.css'

export default function SpellCreate() {
  // 1️⃣ Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconFile: null,
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

    effect_type: 'damage',     // damage | heal | buff | debuff | utility
    scope: 'single',           // single | area | self
    damage_type: 'fire',       // fire | glacier | poison | lightning | earth | power | sonic
    dice_num: 1,
    dice_size: 6,
    dice_modifier: 0,
  })

  // 2️⃣ Helper options
  const schoolOptions   = ['Evocation','Necromancy','Abjuration','Conjuration','Divination','Enchantment','Illusion','Transmutation']
  const classOptions    = ['Wizard','Sorcerer','Cleric','Druid','Warlock','Bard']
  const effectTypes     = ['damage','heal','buff','debuff','utility']
  const scopes          = ['single','area','self']
  const damageTypes     = ['fire','glacier','poison','lightning','earth','power','sonic']

  // 3️⃣ Raw JSON mode
  const [rawMode, setRawMode] = useState(false)
  const [rawJson, setRawJson] = useState(JSON.stringify(formData, null, 2))
  useEffect(() => {
    if (!rawMode) {
      // reflect builder into raw JSON
      setRawJson(JSON.stringify({
        ...formData,
        iconFile: undefined // omit file
      }, null, 2))
    }
  }, [formData, rawMode])

  // 4️⃣ Unified change handler
  function handleChange(e) {
    const { name, value, type, checked } = e.target

    // nested for components
    if (name.startsWith('components.')) {
      const key = name.split('.')[1]
      setFormData(fd => ({
        ...fd,
        components: { ...fd.components, [key]: checked }
      }))
      return
    }

    // simple fields
    if (type === 'checkbox') {
      setFormData(fd => ({ ...fd, [name]: checked }))
    } else if (type === 'select-multiple') {
      const selected = Array.from(e.target.selectedOptions).map(o => o.value)
      setFormData(fd => ({ ...fd, [name]: selected }))
    } else {
      // number inputs
      setFormData(fd => ({
        ...fd,
        [name]: (type === 'number' ? Number(value) : value)
      }))
    }
  }

  //  🔹 file input
  function handleFileChange(e) {
    const file = e.target.files[0] || null
    setFormData(fd => ({ ...fd, iconFile: file }))
  }

  // 5️⃣ Submit
  async function handleSubmit(e) {
    e.preventDefault()

    if (rawMode) {
      // send JSON
      let payload
      try {
        payload = JSON.parse(rawJson)
      } catch {
        return alert('Raw JSON geçersiz.')
      }
      try {
        await axios.post('http://localhost:8000/api/spells/', payload, {
          headers: { 'Content-Type': 'application/json' }
        })
        alert('Spell başarıyla oluşturuldu!')
      } catch (err) {
        console.error(err)
        alert('Hata: ' + (err.response?.data || err.message))
      }
      return
    }

    // builder mode -> multipart
    const fd = new FormData()
    fd.append('name', formData.name)
    fd.append('description', formData.description)
    if (formData.iconFile) fd.append('icon', formData.iconFile)
    fd.append('spell_level', formData.spell_level)
    fd.append('school', formData.school)
    fd.append('classes', JSON.stringify(formData.classes))

    fd.append('casting_time', formData.casting_time)
    fd.append('range', formData.range)
    fd.append('components', JSON.stringify(formData.components))
    fd.append('material_detail', formData.material_detail)
    fd.append('duration', formData.duration)
    fd.append('concentration', formData.concentration)
    fd.append('ritual', formData.ritual)

    // new fields
    fd.append('effect_type', formData.effect_type)
    fd.append('scope', formData.scope)
    if (formData.effect_type === 'damage') {
      fd.append('damage_type', formData.damage_type)
    }
    fd.append('dice_num', formData.dice_num)
    fd.append('dice_size', formData.dice_size)
    fd.append('dice_modifier', formData.dice_modifier)

    try {
      await axios.post('http://localhost:8000/api/spells/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Spell başarıyla oluşturuldu!')
      // reset form
      setFormData({
        name: '',
        description: '',
        iconFile: null,
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
        effect_type: 'damage',
        scope: 'single',
        damage_type: 'fire',
        dice_num: 1,
        dice_size: 6,
        dice_modifier: 0,
      })
    } catch (err) {
      console.error(err)
      alert('Hata: ' + (err.response?.data || err.message))
    }
  }

  return (
    
      <form
    className="spell-create-form"
    onSubmit={handleSubmit}
    style={{
      backgroundImage: `url(${parchmentBg})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed'
    }}
  >
      <h2>Create New Spell</h2>
      <button
        type="button"
        className="toggle-button"
        onClick={() => setRawMode(m => !m)}
      >
        {rawMode ? 'Builder Mode' : 'Raw JSON Mode'}
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
          {/* — General Info — */}
          <fieldset className="form-section">
            <legend>General Info</legend>
            <div className="form-row">
              <label>Name
                <input name="name" value={formData.name} onChange={handleChange} required />
              </label>
              <label>Description
                <textarea name="description" value={formData.description} onChange={handleChange} />
              </label>
              <label>Icon
                <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFileChange} />
              </label>
              <label>Level
                <input
                  type="number" name="spell_level"
                  min={0} max={9}
                  value={formData.spell_level}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>School
                <select name="school" value={formData.school} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>Classes
                <select
                  name="classes"
                  multiple
                  value={formData.classes}
                  onChange={handleChange}
                >
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          {/* — Mechanics — */}
          <fieldset className="form-section">
            <legend>Mechanics</legend>
            <div className="form-row">
              <label>Casting Time
                <input name="casting_time" value={formData.casting_time} onChange={handleChange} />
              </label>
              <label>Range
                <input name="range" value={formData.range} onChange={handleChange} />
              </label>
              <label>Duration
                <input name="duration" value={formData.duration} onChange={handleChange} />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="concentration"
                  checked={formData.concentration}
                  onChange={handleChange}
                />
                Concentration
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
                  <label>Material Detail
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

          {/* — Effect — */}
          <fieldset className="form-section">
            <legend>Effect</legend>
            <div className="form-row">
              <label>Type
                <select name="effect_type" value={formData.effect_type} onChange={handleChange}>
                  {effectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label>Scope
                <select name="scope" value={formData.scope} onChange={handleChange}>
                  {scopes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              {formData.effect_type === 'damage' && (
                <label>Damage Type
                  <select name="damage_type" value={formData.damage_type} onChange={handleChange}>
                    {damageTypes.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                  </select>
                </label>
              )}
              <label>Dice (A d B + C)
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    name="dice_num"
                    value={formData.dice_num}
                    onChange={handleChange}
                    style={{ width: 50 }}
                  /> d
                  <input
                    type="number"
                    name="dice_size"
                    value={formData.dice_size}
                    onChange={handleChange}
                    style={{ width: 50 }}
                  /> +
                  <input
                    type="number"
                    name="dice_modifier"
                    value={formData.dice_modifier}
                    onChange={handleChange}
                    style={{ width: 50 }}
                  />
                </div>
              </label>
            </div>
          </fieldset>
        </>
      )}

      <button type="submit" className="submit-button">Save Spell</button>
    </form>
  )
}
