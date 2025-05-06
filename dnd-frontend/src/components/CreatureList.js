// CreatureList.js
import React, { useState, useEffect } from 'react';
import api from "../services/api";
import './Creature.css';

const CreatureList = () => {
  const [creatures, setCreatures] = useState([]);

  useEffect(() => {
    api.get('creatures/')
      .then(res => {
        const data = res.data.results ?? res.data;
        setCreatures(data);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="creature-list">
      {creatures.map(c => (
        <div key={c.id} className="creature-card">
          {c.icon && (
            <img
              src={c.icon}
              alt={c.name}
              className="creature-icon"
            />
          )}
          <h3>{c.name}</h3>
          <p>HP: {c.hit_points} | AC: {c.armor_class}</p>
          <p>CR: {c.challenge_rating}</p>
          {c.melee_attack_dice && <p>Melee: {c.melee_attack_dice}</p>}
          {c.ranged_attack_dice && <p>Ranged: {c.ranged_attack_dice}</p>}
          {c.spells.length > 0 && (
            <p>
              Spells: {c.spells.map(id => id).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default CreatureList;
