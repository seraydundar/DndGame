// src/components/SpellList.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SpellList.css';

const BACKEND_URL = 'http://localhost:8000';

const SpellList = () => {
  const [spells, setSpells]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/spells/`)
      .then(res => {
        setSpells(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  const getIconURL = icon => {
    if (!icon) return null;
    if (icon.startsWith('http')) return icon;
    if (icon.startsWith('/')) return `${BACKEND_URL}${icon}`;
    return `${BACKEND_URL}/${icon}`;
  };

  if (loading) return <p>Loading spells...</p>;
  if (error)   return <p>Error loading spells: {error.message}</p>;

  return (
    <div className="spell-list-container">
      <h2>All Spells</h2>
      <div className="spell-grid">
        {spells.map(spell => {
          const iconUrl = getIconURL(spell.icon);
          const {
            effect_type,
            scope,
            damage_type,
            dice_num,
            dice_size,
            dice_modifier
          } = spell;
          const diceExpr = `${dice_num}d${dice_size}${dice_modifier >= 0 ? '+' + dice_modifier : dice_modifier}`;

          return (
            <div key={spell.id} className="spell-card">
              {iconUrl
                ? <img src={iconUrl} alt={spell.name} />
                : <div className="spell-icon-placeholder" />
              }
              <h3>{spell.name}</h3>
              <p><strong>Level:</strong> {spell.spell_level}</p>
              <p><strong>School:</strong> {spell.school}</p>
              <p>
                <strong>Classes:</strong>{' '}
                {spell.classes && spell.classes.length
                  ? spell.classes.join(', ')
                  : '—'
                }
              </p>
              <hr />
              <p><strong>Effect Type:</strong> {effect_type}</p>
              <p><strong>Scope:</strong> {scope}</p>
              {effect_type === 'damage' && (
                <>
                  <p><strong>Damage Type:</strong> {damage_type}</p>
                  <p><strong>Dice:</strong> {diceExpr}</p>
                </>
              )}
              {effect_type === 'heal' && (
                <p><strong>Heal Dice:</strong> {diceExpr}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpellList;
