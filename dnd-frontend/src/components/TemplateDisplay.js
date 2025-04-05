import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TemplateDisplay = ({ selectedClass }) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!selectedClass) {
        setTemplate(null);
        return;
      }
      setLoading(true);
      try {
        const queryParam = encodeURIComponent(selectedClass.trim());
        const response = await api.get(`character-templates/?class=${queryParam}`);
        console.log("Template fetch response:", response.data);
        if (response.data && response.data.length > 0) {
          setTemplate(response.data[0]);
        } else {
          setTemplate(null);
        }
      } catch (error) {
        console.error('Template fetch error:', error);
        setTemplate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [selectedClass]);

  if (!selectedClass) {
    return <div>Lütfen bir sınıf seçin.</div>;
  }

  if (loading) {
    return <div>Şablon yükleniyor...</div>;
  }

  if (!template) {
    return <div>Hazır şablon bulunamadı, varsayılan statlar kullanılacak.</div>;
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
      <h3>{template.name}</h3>
      <p><strong>Class:</strong> {template.class}</p>
      <p><strong>Race:</strong> {template.race}</p>
      <p><strong>Level:</strong> {template.level}</p>
      <p><strong>HP:</strong> {template.hp}</p>
      <p><strong>Strength:</strong> {template.strength}</p>
      <p><strong>Dexterity:</strong> {template.dexterity}</p>
      <p><strong>Constitution:</strong> {template.constitution}</p>
      <p><strong>Intelligence:</strong> {template.intelligence}</p>
      <p><strong>Wisdom:</strong> {template.wisdom}</p>
      <p><strong>Charisma:</strong> {template.charisma}</p>
      <p>
        <strong>Equipment:</strong> {JSON.stringify(template.equipment)}
      </p>
      <p>
        <strong>Spells:</strong> {JSON.stringify(template.spells)}
      </p>
      <p><strong>Gold:</strong> {template.gold}</p>
    </div>
  );
};

export default TemplateDisplay;
