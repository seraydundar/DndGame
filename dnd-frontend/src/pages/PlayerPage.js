// src/pages/PlayerPage.js
import React, { useEffect, useState }    from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend }                  from 'react-dnd-html5-backend';
import { useNavigate }                   from 'react-router-dom';
import api                               from '../services/api';
import socket                            from '../services/socket';
import DiceRollModal                     from '../components/DiceRollModal';
import './PlayerPage.css';

/*------------------------------------------------------------
  Slot alanı ↔ DB alanı eşlemesi
------------------------------------------------------------*/
const SLOT_FIELD_MAP = {
  HEAD:       'head_armor_id',
  EAR1:       'ear1_id',
  EAR2:       'ear2_id',
  NECKLACE:   'necklace_id',
  CHEST:      'chest_armor_id',
  HAND_ARMOR: 'hand_armor_id',
  MELEE_WEAPON:  'melee_weapon_id',
  RANGED_WEAPON: 'ranged_weapon_id',
  OFF_HAND:   'off_hand_id',
  RING1:      'ring1_id',
  RING2:      'ring2_id',
  LEGS:       'legs_armor_id',
};

/*------------------------------------------------------------
  Ekipman slotlarının ekranda konumu (yüzde cinsinden)
------------------------------------------------------------*/
const SLOT_POSITIONS = {
  HEAD:       { top:  5,  left: 50 },
  EAR1:       { top:  5,  left: 25 },
  EAR2:       { top:  5,  left: 75 },
  NECKLACE:   { top: 20,  left: 25 },
  CHEST:      { top: 20,  left: 50 },
  HAND_ARMOR:    { top: 35,  left: 25 },
  MELEE_WEAPON:  { top: 55,  left: 25 },
  RANGED_WEAPON: { top: 55,  left: 75 },
  OFF_HAND:      { top: 45,  left: 75 },
  RING1:      { top: 35,  left: 75 },
  RING2:      { top: 20,  left: 75 },
  LEGS:       { top: 35,  left: 50 },
};

/*------------------------------------------------------------
  Eşya slot uyumluluk tablosu
------------------------------------------------------------*/
const SLOT_COMPAT = {
  HEAD:       ['HEAD'],
  EAR:        ['EAR1', 'EAR2'],
  NECKLACE:   ['NECKLACE'],
  CHEST:      ['CHEST'],
  HAND_ARMOR:    ['HAND_ARMOR'],
  MELEE_WEAPON:  ['MELEE_WEAPON'],
  RANGED_WEAPON: ['RANGED_WEAPON'],
  OFF_HAND:      ['OFF_HAND'],
  RING:       ['RING1', 'RING2'],
  LEGS:       ['LEGS'],
};

/*------------------------------------------------------------
  Medya URL yardımcı fonksiyonu
------------------------------------------------------------*/
const buildIconUrl = path => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = api.defaults.baseURL.replace(/\/api\/?$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
};

/* === Envanter kutusu bileşeni === */
function InventoryItem({ item, onView }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'ITEM',
      item: { id: item.id },
      collect: m => ({ isDragging: !!m.isDragging() }),
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

/* === Ekipman slotu bileşeni === */
function EquipSlot({ slot, equipped, allItems, onEquip, onUnequip, onView }) {
  const [, drop] = useDrop(
    () => ({
      accept: 'ITEM',
      drop: async ({ id }) => {
        const itm = allItems.find(i => i.id === id);
        if (!itm) return;
        const es       = itm.equip_slot?.toUpperCase();
        const allowed  = SLOT_COMPAT[es] || [];
        if (!allowed.includes(slot)) return;
        if (equipped?.id === id)      return;
        await onEquip(slot, id);
      },
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
          <button className="pp-unequip-btn" onClick={() => onUnequip(slot)}>
            ×
          </button>
        </div>
      ) : (
        <div className="pp-slot-label">{slot.toLowerCase().replace('_', ' ')}</div>
      )}
    </div>
  );
}

/*------------------------------------------------------------
  Ana sayfa bileşeni
------------------------------------------------------------*/
export default function PlayerPage() {
  const [char,           setChar]           = useState(null);
  const [inventory,      setInventory]      = useState([]);
  const [equipped,       setEquipped]       = useState({});
  const [allItems,       setAllItems]       = useState([]);
  const [viewItem,       setViewItem]       = useState(null);
  const [preparedSpells, setPreparedSpells] = useState([]); // Karakterin sahip olduğu büyüler
  const navigate = useNavigate();
  const currentUserId = Number(localStorage.getItem('user_id') || 0);
  const [diceVisible, setDiceVisible] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);


   useEffect(() => {
    const handler = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'redirect' && data.target === 'battle') {
          const lobbyId = sessionStorage.getItem('lobby_id');
          navigate(`/battle/${lobbyId}`);
        }
      } catch {}
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [navigate]);


  /* ---------- İlk yükleme: karakter + item listesi ---------- */
  useEffect(() => {
    // Karakter verisini çek
    api.get('characters/')
      .then(res => {
        const list = res.data.results || res.data;
        if (!list.length) return;
        const c = list[0];
        setChar(c);
        setInventory(c.inventory || []);

        // Equipped haritasını hem *_id hem nested objelerden oluştur
        const eq = {};
        Object.entries(SLOT_FIELD_MAP).forEach(([slot, field]) => {
          const idFromField  = c[field];
          const nestedName   = field.replace(/_id$/, '');
          const idFromNested = c[nestedName]?.id;
          const finalId      = idFromField ?? idFromNested;
          if (finalId) eq[slot] = finalId;
        });
        setEquipped(eq);

        // Eğer karakter prepared_spells içeriyorsa, ID listesi oluştur ve bunları çek
        if (c.prepared_spells) {
          const ps = c.prepared_spells;
          let ids = [];

          // prepared_spells farklı formatlarda gelebilir: dict, dizi, nesne-dizisi
          if (Array.isArray(ps) && ps.length && typeof ps[0] === 'object' && ps[0].id !== undefined) {
            // [{id:3,...}, {id:7,...}]
            ids = ps.map(x => Number(x.id));
          } else if (Array.isArray(ps)) {
            // ["3","7"] veya [3,7]
            ids = ps.map(x => Number(x));
          } else if (typeof ps === 'object') {
            // {"3": true, "7": true}
            ids = Object.keys(ps).map(k => Number(k));
          }

          // Her bir spell ID'si için API'den detayları alalım
          Promise.all(
            ids.map(spellId => api.get(`spells/${spellId}/`).then(r => r.data).catch(() => null))
          ).then(results => {
            // null olmayanları filtrele
            setPreparedSpells(results.filter(r => r));
          }).catch(console.error);
        }
      })
      .catch(console.error);

    // Eşya kataloğu
    api.get('items/items/')
      .then(r => setAllItems(r.data.results || r.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handler = evt => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'diceRollRequest' && Number(msg.playerId) === currentUserId) {
          setDiceVisible(true);
          setDiceResult(null);
          setDiceRolling(false);
        }
        if (msg.event === 'diceRoll' && Number(msg.playerId) === currentUserId) {
          setDiceResult(msg.result);
          setDiceRolling(false);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [currentUserId]);


  /* ---------- Slot ekip / çıkar işlemleri ---------- */
  const handleEquip = async (slot, id) => {
    const patch = { [SLOT_FIELD_MAP[slot]]: id };
    const res   = await api.patch(`characters/${char.id}/`, patch);
    setChar(res.data);
    setEquipped(e => ({ ...e, [slot]: id }));
    setInventory(inv => inv.filter(x => x !== id));
  };

  const handleUnequip = async slot => {
    const removedId    = equipped[slot];
    const newInventory = [...inventory, removedId];
    const payload      = { [SLOT_FIELD_MAP[slot]]: null, inventory: newInventory };

    try {
      const res = await api.patch(`characters/${char.id}/`, payload);
      setChar(res.data);
      setEquipped(e => {
        const copy = { ...e };
        delete copy[slot];
        return copy;
      });
      setInventory(newInventory);
    } catch (err) {
      console.error('unequip error:', err.response?.data || err);
      alert('Eşyayı çıkarırken sorun oluştu:\n' + JSON.stringify(err.response?.data));
    }
  };

  /* ---------- Modal aç / kapat ---------- */
  const handleView = item => setViewItem(item);
  const closeView  = ()   => setViewItem(null);

  /* ---------- Yeterli XP? ---------- */
  if (!char) return null;
  const xpNeeded = 100 * 2 ** (char.level - 1);
  const canLevel = char.xp >= xpNeeded && char.level < 20;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="player-page">

        {/* --------- Sol panel --------- */}
        <div className="pp-sidebar">
          <h3>{char.name}</h3>
          <p><strong>Level:</strong> {char.level}</p>
          <p><strong>HP:</strong>    {char.hp}</p>
          <p><strong>XP:</strong>    {char.xp} / {xpNeeded}</p>

          {canLevel && (
            <button
              className="pp-levelup-btn"
              onClick={() => navigate(`/level-up/${char.id}`)}
            >
              ▲ Level Up!
            </button>
          )}

          <h5>Stats</h5>
          <ul>
            <li>STR: {char.strength}</li>
            <li>DEX: {char.dexterity}</li>
            <li>CON: {char.constitution}</li>
            <li>INT: {char.intelligence}</li>
            <li>WIS: {char.wisdom}</li>
            <li>CHA: {char.charisma}</li>
          </ul>

          {/* ---------- Hazır Büyüler Bölümü ---------- */}
          {preparedSpells.length > 0 && (
            <>
              <h5>Hazır Büyüler</h5>
              <ul className="pp-spell-list">
                {preparedSpells.map(sp => (
                  <li key={sp.id} className="pp-spell-item">
                    {sp.name || sp.spell_name || sp.title}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* --------- Gövde: ekipman silueti --------- */}
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

        {/* --------- Envanter paneli --------- */}
        <div className="pp-inventory-panel">
          {inventory.length ? (
            inventory
              .map(id => allItems.find(i => i.id === id))
              .filter(Boolean)
              .map(it => (
                <InventoryItem key={it.id} item={it} onView={handleView} />
              ))
          ) : (
            <p>Envanter boş.</p>
          )}
        </div>

        {/* --------- Eşya bilgi modali --------- */}
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
                <p><strong>Damage:</strong> {viewItem.damage_dice} + {viewItem.damage_modifier}</p>
              )}
              {viewItem.ac_bonus > 0 && (
                <p><strong>AC Bonus:</strong> {viewItem.ac_bonus}</p>
              )}
              <p><strong>Açıklama:</strong> {viewItem.description}</p>
              <button onClick={closeView}>Kapat</button>
            </div>
          </div>
         )}

          <DiceRollModal
            visible={diceVisible}
            onRoll={() => {
              setDiceRolling(true);
              socket.send(
                JSON.stringify({ event: 'diceRoll', playerId: currentUserId })
              );
            }}
            onClose={() => { setDiceVisible(false); setDiceResult(null); }}
            isRolling={diceRolling}
            result={diceResult}
            canRoll={true}
          />
        </div>
      </DndProvider>
    );
  }
