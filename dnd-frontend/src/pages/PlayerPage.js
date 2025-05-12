// src/pages/PlayerPage.js
import React, { useEffect, useState }    from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend }                  from 'react-dnd-html5-backend';
import api                               from '../services/api';
import './PlayerPage.css';

///////////////////////////
// Slot ↔ DB alanı eşlemesi
///////////////////////////
const SLOT_FIELD_MAP = {
  HEAD:       'head_armor_id',
  EAR1:       'ear1_id',
  EAR2:       'ear2_id',
  NECKLACE:   'necklace_id',
  CHEST:      'chest_armor_id',
  HAND_ARMOR: 'hand_armor_id',
  MAIN_HAND:  'main_hand_id',
  OFF_HAND:   'off_hand_id',
  RING1:      'ring1_id',
  RING2:      'ring2_id',
  LEGS:       'legs_armor_id',
};

// ■■ Aşağıyı eski SLOT_POSITIONS ile değiştirin ■■
const SLOT_POSITIONS = {
  HEAD:       { top:  5,  left: 50 },  // kafa
  EAR1:       { top: 5,  left: 25 },  // sol kulak
  EAR2:       { top: 5,  left: 75 },  // sağ kulak
  NECKLACE:   { top: 20,  left: 25 },  // kolye
  CHEST:      { top: 20,  left: 50 },  // göğüs
  HAND_ARMOR: { top: 35,  left: 25 },  // el zırhı (orta)
  MAIN_HAND:  { top: 55,  left: 25 },  // ana el
  OFF_HAND:   { top: 55,  left: 75 },  // yan el
  RING1:      { top: 35,  left: 75 },  // sol yüzük
  RING2:      { top: 20,  left: 75 },  // sağ yüzük
  LEGS:       { top: 35,  left: 50 },  // bacak
};

const SLOT_COMPAT = {
  HEAD:       ['HEAD'],
  EAR:        ['EAR1','EAR2'],
  NECKLACE:   ['NECKLACE'],
  CHEST:      ['CHEST'],
  HAND_ARMOR: ['HAND_ARMOR'],
  MAIN_HAND:  ['MAIN_HAND'],
  OFF_HAND:   ['OFF_HAND'],
  RING:       ['RING1','RING2'],
  LEGS:       ['LEGS'],
};

///////////////////////////
// Media URL helper
///////////////////////////
const buildIconUrl = path => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = api.defaults.baseURL.replace(/\/api\/?$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
};

function InventoryItem({ item, onView }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'ITEM',
      item: { id: item.id },
      collect: m => ({ isDragging: !!m.isDragging() })
    }),
    [item.id]
  );
  const url = buildIconUrl(item.icon);
  return (
    <div
      ref={drag}
      className="pp-inv-item"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      onClick={() => onView(item)}
    >
      {url ? <img src={url} alt={item.name} /> : <span>{item.name}</span>}
    </div>
  );
}

function EquipSlot({ slot, equipped, allItems, onEquip, onUnequip, onView }) {
  const [, drop] = useDrop(
    () => ({
      accept: 'ITEM',
      drop: async ({ id }) => {
        const itm = allItems.find(i => i.id === id);
        if (!itm) return;
        const es = itm.equip_slot?.toUpperCase();           // örn. "RING" veya "MAIN_HAND"
        const allowed = SLOT_COMPAT[es] || [];               // izinli slot listesi
        if (!allowed.includes(slot)) return;                 // eşleşmiyorsa geri dön
        if (equipped?.id === id) return;                    // zaten varsa
        await onEquip(slot, id);
      }
    }),
    [slot, equipped, allItems]
  );

  const pos = SLOT_POSITIONS[slot];
  const url = equipped ? buildIconUrl(equipped.icon) : null;

  return (
    <div
      ref={drop}
      className="pp-slot"
      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
    >
      {equipped ? (
        <div className="pp-slot-content">
          <img src={url} alt={equipped.name} onClick={() => onView(equipped)} />
          <button className="pp-unequip-btn" onClick={() => onUnequip(slot)}>×</button>
        </div>
      ) : (
        <div className="pp-slot-label">{slot.toLowerCase().replace('_',' ')}</div>
      )}
    </div>
  );
}

export default function PlayerPage() {
  const [char, setChar]           = useState(null);
  const [inventory, setInventory] = useState([]);
  const [equipped, setEquipped]   = useState({});
  const [allItems, setAllItems]   = useState([]);
  const [viewItem, setViewItem]   = useState(null);

  useEffect(() => {
  // 1) Karakteri çek ve inventory + equipped state’ini doğru kur
  api.get('characters/')
    .then(res => {
      const list = res.data.results || res.data;
      if (!list.length) return;
      const c = list[0];
      setChar(c);
      setInventory(c.inventory || []);

      // Equipped haritasını hem write-only _id’lerden hem nested objelerden inşa et
      const eq = {};
      Object.entries(SLOT_FIELD_MAP).forEach(([slot, field]) => {
        // örn. field = 'head_armor_id'
        const idFromField   = c[field];                         // çoğunlukla null
        const nestedName    = field.replace(/_id$/, '');        // örn. 'head_armor'
        const idFromNested  = c[nestedName]?.id;                // nested objenin id’si
        const finalId       = idFromField ?? idFromNested;      // biri varsa al
        if (finalId) eq[slot] = finalId;
      });
      setEquipped(eq);
    })
    .catch(console.error);

  // 2) Tüm eşyaları yükle
  api.get('items/items/')
    .then(r => setAllItems(r.data.results || r.data))
    .catch(console.error);
}, []);

  const handleEquip = async (slot, id) => {
    const patch = { [SLOT_FIELD_MAP[slot]]: id };
    const res   = await api.patch(`characters/${char.id}/`, patch);
    setChar(res.data);
    setEquipped(e => ({ ...e, [slot]: id }));
    setInventory(inv => inv.filter(x => x !== id));
  };
  const handleUnequip = async slot => {
  // 1) figure out which item is being removed
  const removedId = equipped[slot];
  // 2) build the new inventory list
  const newInventory = [...inventory, removedId];

  // 3) send BOTH the cleared slot *and* the updated inventory
  const payload = {
    [SLOT_FIELD_MAP[slot]]: null,
    inventory: newInventory
  };

  try {
    const res = await api.patch(`characters/${char.id}/`, payload);
    // server should now respond with updated character
    setChar(res.data);
    // update local equipped & inventory
    setEquipped(e => {
      const copy = { ...e };
      delete copy[slot];
      return copy;
    });
    setInventory(newInventory);
  } catch (err) {
    console.error('unequip error:', err.response?.data || err);
    alert('Eşyayı çıkarırken bir sorun oluştu:\n' + JSON.stringify(err.response?.data));
  }
};

  const handleView = item => setViewItem(item);
  const closeView = ()   => setViewItem(null);

  if (!char) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="player-page">
        <div className="pp-sidebar">
          <h3>{char.name}</h3>
          <p><strong>Level:</strong> {char.level}</p>
          <p><strong>HP:</strong>    {char.hp}</p>
          <p><strong>XP:</strong>    {char.xp}</p>
          <h5>Stats</h5>
          <ul>
            <li>STR: {char.strength}</li>
            <li>DEX: {char.dexterity}</li>
            <li>CON: {char.constitution}</li>
            <li>INT: {char.intelligence}</li>
            <li>WIS: {char.wisdom}</li>
            <li>CHA: {char.charisma}</li>
          </ul>
        </div>

        <div className="pp-body-container">
          {Object.keys(SLOT_FIELD_MAP).map(slot => (
            <EquipSlot
              key={slot}
              slot={slot}
              equipped={allItems.find(i => i.id === equipped[slot])}
              allItems={allItems}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              onView={handleView}
            />
          ))}
        </div>

         <div className="pp-inventory-panel">
            {inventory.length > 0 ? (
            inventory
              .map(id => allItems.find(i => i.id === id)) // önce tümItems’dan eşleşeni al
              .filter(it => it)                          // undefined’ları at
              .map(it => (
                <InventoryItem
                  key={it.id}
                  item={it}
                  onView={handleView}
                />
              ))
          ) : (
            <p>Envanter boş.</p>
          )}
        </div>

        {viewItem && (
          <div className="pp-modal-overlay" onClick={closeView}>
            <div className="pp-modal" onClick={e => e.stopPropagation()}>
              <h3>{viewItem.name}</h3>
              <p><strong>Equip Slot:</strong> {viewItem.equip_slot}</p>
              <p><strong>Tür:</strong>         {viewItem.item_type}</p>
              <p><strong>Alt Tür:</strong>     {viewItem.subtype}</p>
              <p><strong>Rarity:</strong>       {viewItem.rarity}</p>
              <p><strong>Değer:</strong>        {viewItem.value}</p>
              <p><strong>Ağırlık:</strong>      {viewItem.weight}</p>
              {viewItem.damage_dice && (
                <p><strong>Damage:</strong>     {viewItem.damage_dice} + {viewItem.damage_modifier}</p>
              )}
              {viewItem.ac_bonus > 0 && (
                <p><strong>AC Bonus:</strong>   {viewItem.ac_bonus}</p>
              )}
              <p><strong>Açıklama:</strong>     {viewItem.description}</p>
              <button onClick={closeView}>Kapat</button>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}