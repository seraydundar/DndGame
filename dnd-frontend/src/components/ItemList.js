// src/components/ItemList.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ItemList.css';

const BACKEND_URL = 'http://localhost:8000';

const getIconURL = icon => {
  if (!icon) return null;
  if (icon.startsWith('http')) return icon;
  if (icon.startsWith('/')) return `${BACKEND_URL}${icon}`;
  return `${BACKEND_URL}/${icon}`;
};

const ItemList = () => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/items/`)
      .then(res => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="item-list-container">
        <p>Loading items...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="item-list-container">
        <p>Error loading items: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="item-list-container">
      <h2>All Items</h2>
      <div className="item-grid">
        {items.map(item => {
          const {
            id, name, icon, subtype, item_type, rarity,
            value, weight, damage_dice, damage_modifier,
            ac_bonus, equip_slot
          } = item;
          const iconUrl = getIconURL(icon);
          const damageExpr = damage_dice
            ? `${damage_dice}${damage_modifier >= 0 ? '+' + damage_modifier : damage_modifier}`
            : null;

          return (
            <div key={id} className="item-card">
              {iconUrl
                ? <img src={iconUrl} alt={name} />
                : <div className="item-icon-placeholder" />}
              <h3>{name}</h3>
              <p><strong>Type:</strong> {item_type}</p>
              <p><strong>Subtype:</strong> {subtype}</p>
              <p><strong>Rarity:</strong> {rarity}</p>
              <p><strong>Value:</strong> {value} gp</p>
              <p><strong>Weight:</strong> {weight}</p>
              {damageExpr && (
                <p><strong>Damage:</strong> {damageExpr}</p>
              )}
              {ac_bonus > 0 && (
                <p><strong>AC Bonus:</strong> +{ac_bonus}</p>
              )}
              <p><strong>Slot:</strong> {equip_slot}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItemList;
