// src/components/ItemCreate.js
import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import "./ItemCreate.css";

/* ---------- Sabit listeler ---------- */
const ITEM_TYPES = ["Weapon", "Shield", "Armor", "Consumable", "Misc"];

const SUBTYPES_BY_TYPE = {
  Weapon: [
    { value: "sword", label: "Sword" },
    { value: "axe",   label: "Axe" },
    { value: "bow",   label: "Bow" }
  ],
  Shield: [
    { value: "buckler", label: "Buckler" },
    { value: "round",   label: "Round Shield" },
    { value: "tower",   label: "Tower Shield" }
  ],
  Armor: [
    { value: "light",  label: "Light Armor" },
    { value: "medium", label: "Medium Armor" },
    { value: "heavy",  label: "Heavy Armor" }
  ],
  Consumable: [
    { value: "potion", label: "Potion" },
    { value: "scroll", label: "Scroll" }
  ],
  Misc: [
    { value: "mundane", label: "Mundane" },
    { value: "magical", label: "Magical" },
    { value: "quest",   label: "Quest Item" }
  ]
};

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

const EQUIP_SLOTS = [
  "HEAD",
  "CHEST",
  "LEGS",
  "HAND",
  "SHIELD",
  "MELEE_WEAPON",
  "RANGED_WEAPON",
  "OFF_HAND",
  "NECKLACE",
  "EARRING",
  "RING"
];

function ItemCreate() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: null,
    item_type: "",
    subtype: "",
    rarity: "",
    equip_slot: "",
    weapon_kind: "",     // <-- melee or ranged
    damage_dice: "",
    damage_modifier: "",
    ac_bonus: ""
  });

  const [iconPreview, setIconPreview] = useState(null);
  const [handed, setHanded] = useState("one");
  const [bonuses, setBonuses] = useState([]);
  const [newBonus, setNewBonus] = useState({ stat: "", type: "+", value: 0 });
  const [allSpells, setAllSpells] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);

  // Decide which extra fields to show based on item_type
  const showWeaponOptions = form.item_type === "Weapon";
  const showDamage        = form.item_type === "Weapon";
  const showTwoHand       = form.item_type === "Weapon";
  const showAC            = form.item_type === "Armor" || form.item_type === "Shield";

  useEffect(() => {
    async function fetchSpells() {
      try {
        const res = await api.get("spells/");
        setAllSpells(res.data.results ?? res.data);
      } catch (err) {
        console.error("Spells alınamadı:", err);
      }
    }
    fetchSpells();
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleIconChange = e => {
    const file = e.target.files[0] || null;
    setForm(f => ({ ...f, icon: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIconPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setIconPreview(null);
    }
  };

  const subtypes = useMemo(
    () => SUBTYPES_BY_TYPE[form.item_type] || [],
    [form.item_type]
  );

  const addBonus = () => {
    if (!newBonus.stat) return;
    setBonuses(b => [...b, newBonus]);
    setNewBonus({ stat: "", type: "+", value: 0 });
  };
  const removeBonus = idx => {
    setBonuses(b => b.filter((_, i) => i !== idx));
  };

  const handleSpellChange = e => {
    const opts = Array.from(e.target.selectedOptions).map(o => o.value);
    if (opts.length <= 2) {
      setSelectedSpells(opts);
    } else {
      alert("En fazla 2 büyü seçebilirsiniz");
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.item_type || !form.equip_slot) {
      return alert("Name, Type ve Equip Slot zorunlu!");
    }
    const data = new FormData();
    if (form.icon) data.append("icon", form.icon);
    Object.entries(form).forEach(([k, v]) => {
      if (k === "icon") return;
      if (v !== "" && v != null) data.append(k, v);
    });
    if (showTwoHand) data.append("two_handed", handed === "two");
    if (bonuses.length) data.append("bonuses", JSON.stringify(bonuses));
    selectedSpells.forEach(id => data.append("spells", id));

    try {
      await api.post("items/items/", data);
      alert("Eşya oluşturuldu!");
      setForm({
        name: "", description: "", icon: null,
        item_type: "", subtype: "", rarity: "",
        equip_slot: "", weapon_kind: "",
        damage_dice: "", damage_modifier: "", ac_bonus: ""
      });
      setHanded("one");
      setBonuses([]);
      setSelectedSpells([]);
      setIconPreview(null);
    } catch (err) {
      console.error("Validation errors:", err.response?.data);
      alert(JSON.stringify(err.response?.data, null, 2));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="item-create-form">
      <label>
        Name
        <input
          required
          name="name"
          value={form.name}
          onChange={handleChange}
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </label>

      <label>
        Icon
        <input
          name="icon"
          type="file"
          accept="image/*"
          onChange={handleIconChange}
        />
      </label>
      {iconPreview && (
        <img src={iconPreview} alt="Preview" style={{ maxWidth: 100 }} />
      )}

      <label>
        Item Type
        <select
          required
          name="item_type"
          value={form.item_type}
          onChange={handleChange}
        >
          <option value="">—</option>
          {ITEM_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      {subtypes.length > 0 && (
        <label>
          Subtype
          <select
            required
            name="subtype"
            value={form.subtype}
            onChange={handleChange}
          >
            <option value="">—</option>
            {subtypes.map(st => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Rarity
        <select
          name="rarity"
          value={form.rarity}
          onChange={handleChange}
        >
          <option value="">—</option>
          {RARITIES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <label>
        Equip Slot
        <select
          required
          name="equip_slot"
          value={form.equip_slot}
          onChange={handleChange}
        >
          <option value="">—</option>
          {EQUIP_SLOTS.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </label>

      {showWeaponOptions && (
        <label>
          Weapon Kind
          <select
            required
            name="weapon_kind"
            value={form.weapon_kind}
            onChange={handleChange}
          >
            <option value="">—</option>
            <option value="melee">Melee</option>
            <option value="ranged">Ranged</option>
          </select>
        </label>
      )}

      {showDamage && (
        <>
          {showTwoHand && (
            <label>
              Two-Handed
              <select
                value={handed}
                onChange={e => setHanded(e.target.value)}
              >
                <option value="one">One-Handed</option>
                <option value="two">Two-Handed</option>
              </select>
            </label>
          )}
          <label>
            Damage Dice
            <input
              name="damage_dice"
              value={form.damage_dice}
              onChange={handleChange}
              placeholder="e.g. 1d6"
            />
          </label>
          <label>
            Damage Modifier
            <input
              name="damage_modifier"
              type="number"
              value={form.damage_modifier}
              onChange={handleChange}
            />
          </label>
        </>
      )}

      {showAC && (
        <label>
          AC Bonus
          <input
            name="ac_bonus"
            type="number"
            value={form.ac_bonus}
            onChange={handleChange}
          />
        </label>
      )}

      {bonuses.length > 0 && (
        <div>
          <h4>Bonuses</h4>
          <ul>
            {bonuses.map((b, idx) => (
              <li key={idx}>
                {b.stat} {b.type}{b.value}
                <button type="button" onClick={() => removeBonus(idx)}>
                  x
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="new-bonus">
        <select
          value={newBonus.stat}
          onChange={e => setNewBonus(b => ({ ...b, stat: e.target.value }))}
        >
          <option value="">Stat</option>
          <option value="strength">Strength</option>
          <option value="dexterity">Dexterity</option>
          <option value="constitution">Constitution</option>
          <option value="intelligence">Intelligence</option>
          <option value="wisdom">Wisdom</option>
          <option value="charisma">Charisma</option>
          <option value="ac">AC</option>
          <option value="damage">Damage</option>
        </select>
        <select
          value={newBonus.type}
          onChange={e => setNewBonus(b => ({ ...b, type: e.target.value }))}
        >
          <option value="+">+</option>
          <option value="-">-</option>
        </select>
        <input
          type="number"
          value={newBonus.value}
          onChange={e => setNewBonus(b => ({ ...b, value: +e.target.value }))}
        />
        <button type="button" onClick={addBonus}>Add Bonus</button>
      </div>

      <label>
        Spells (max 2)
        <select
          multiple
          value={selectedSpells}
          onChange={handleSpellChange}
        >
          {allSpells.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
      </label>

      <button type="submit" className="submit-button">
        Eşyayı Oluştur
      </button>
    </form>
  );
}

export default ItemCreate;
