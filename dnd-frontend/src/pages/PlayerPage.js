// src/components/PlayerPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

const SLOT_FIELD_MAP = {
  HEAD:       'head_armor_id',
  CHEST:      'chest_armor_id',
  LEGS:       'legs_armor_id',
  HAND:       'hand_armor_id',
  MAIN_HAND:  'main_hand_id',
  OFF_HAND:   'off_hand_id',
  NECKLACE:   'necklace_id',
  EARRING:    'ear1_id',
  RING:       'ring1_id',
  SHIELD:     'hand_armor_id'  // or map to chest_armor_id if you prefer
};

const EQUIP_SLOTS = Object.keys(SLOT_FIELD_MAP);

const slotLabel = slot => slot.replace(/_/g, ' ').toLowerCase();

const PlayerPage = () => {
  const [character, setCharacter] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const currentUserId = +localStorage.getItem("user_id") || 0;
  const navigate = useNavigate();
  const lobbyId = sessionStorage.getItem('lobby_id');

  // fetch character
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('characters/');
        const mine = res.data.find(c => c.player_id === currentUserId);
        if (mine) setCharacter(mine);
      } catch (e) { console.error(e) }
    })();
  }, [currentUserId]);

  // subscribe websocket for character updates
  useEffect(() => {
    const handler = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.event === 'characterUpdate' && msg.character.player_id === currentUserId) {
        setCharacter(msg.character);
      }
    };
    socket.addEventListener('message', handler);
    return () => void socket.removeEventListener('message', handler);
  }, [currentUserId]);

  // fetch inventory item details whenever character.inventory changes
  useEffect(() => {
    if (!character?.inventory?.length) {
      setInventoryItems([]);
      return;
    }
    (async () => {
      try {
        const details = await Promise.all(
          character.inventory.map(id =>
            api.get(`items/items/${id}/`).then(r => r.data)
          )
        );
        setInventoryItems(details);
      } catch (e) {
        console.error("Envanter itemleri alınamadı", e);
      }
    })();
  }, [character?.inventory]);

  // drag handlers
  const onDragStart = (e, itemId) => {
    e.dataTransfer.setData('text/plain', itemId);
  };
  const onDragOver = e => e.preventDefault();

  // equip handler
  const handleDrop = useCallback(async (e, slot) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const field = SLOT_FIELD_MAP[slot];
    try {
      // PATCH character
      await api.patch(`characters/${character.id}/`, { [field]: itemId });
      // update locally
      setCharacter(ch => {
        const prevEquippedId = ch[field.replace(/_id$/,'')];
        return {
          ...ch,
          [field.replace(/_id$/,'')]: Number(itemId),
          inventory: prevEquippedId
            ? [...ch.inventory.filter(i=>i!==Number(itemId)), prevEquippedId]
            : ch.inventory.filter(i=>i!==Number(itemId))
        };
      });
    } catch (err) {
      console.error("Equip hatası", err);
    }
  }, [character]);

  if (!character) return <div>Karakter yükleniyor…</div>;

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24 }}>
      {/* Left: Character card */}
      <div style={{
        flex: '0 0 300px',
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>{character.name}</h2>
        <p><strong>Level:</strong> {character.level}</p>
        <p><strong>HP:</strong> {character.hp}</p>
        <p><strong>XP:</strong> {character.xp} / {character.xp_for_next_level}</p>
        <section>
          <h4>Stats</h4>
          <ul>
            <li>STR: {character.strength}</li>
            <li>DEX: {character.dexterity}</li>
            <li>CON: {character.constitution}</li>
            <li>INT: {character.intelligence}</li>
            <li>WIS: {character.wisdom}</li>
            <li>CHA: {character.charisma}</li>
          </ul>
        </section>
      </div>

      {/* Right: Inventory & Equip */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Equip Slots */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          padding: 8,
          background: '#f0f0f0',
          borderRadius: 8
        }}>
          {EQUIP_SLOTS.map(slot => {
            const field = SLOT_FIELD_MAP[slot].replace(/_id$/,'');
            const equippedItem = character[field] || null;
            return (
              <div key={slot}
                   onDragOver={onDragOver}
                   onDrop={e => handleDrop(e, slot)}
                   style={{
                     width: 64,
                     height: 64,
                     background: '#fff',
                     border: '2px dashed #ccc',
                     borderRadius: 4,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}>
                {equippedItem
                  ? <img
                      src={equippedItem.icon}
                      alt={equippedItem.name}
                      style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                  : <span style={{ fontSize:12, color:'#888', textAlign:'center' }}>
                      {slotLabel(slot)}
                    </span>
                }
              </div>
            );
          })}
        </div>

        {/* Inventory */}
        <div style={{
          flex: 1,
          padding: 8,
          background: '#fafafa',
          border: '1px solid #ddd',
          borderRadius: 8,
          overflowY: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8
        }}>
          {inventoryItems.map(item => (
            <div key={item.id}
                 draggable
                 onDragStart={e => onDragStart(e, item.id)}
                 style={{ width:64, height:64, cursor:'grab' }}>
              <img
                src={item.icon}
                alt={item.name}
                title={item.name}
                style={{ maxWidth:'100%', maxHeight:'100%' }}
              />
            </div>
          ))}
          {inventoryItems.length === 0 && <p>Envanter boş.</p>}
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;
