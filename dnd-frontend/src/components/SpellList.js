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
          const { type, dice = {} } = spell.effect || {};
          const diceExpr = dice.num && dice.size
            ? `${dice.num}d${dice.size}${dice.modifier >= 0 ? '+'+dice.modifier : dice.modifier}`
            : null;

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
                  : '—'}
              </p>
              <hr />
              <p><strong>Effect Type:</strong> {type || '—'}</p>
              {(type === 'damage' || type === 'heal') && diceExpr && (
                <p>
                  <strong>
                    {type === 'damage' ? 'Damage' : 'Heal'}:
                  </strong>{' '}
                  {diceExpr}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpellList;
