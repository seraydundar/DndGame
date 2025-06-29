// src/pages/GodPanel.js
import React, { useEffect, useState }    from 'react';
import { useNavigate }                   from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend }                  from 'react-dnd-html5-backend';
import socket                            from '../services/socket';
import api                               from '../services/api';
import './GodPanel.css';

// Helper: Base URL’den '/api' kısmını kırpıp yolu birleştirir; eğer path tam URL ise direkt döner
const buildIconUrl = path => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = api.defaults.baseURL.replace(/\/api\/?$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
};

//////////////////////////////////////
// DraggableItem: "Tüm Eşyalar" listesinde sürüklenebilir ve tıklanınca önizleme açılır
//////////////////////////////////////
function DraggableItem({ item, onView }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'ITEM',
      item: { id: item.id },
      collect: m => ({ isDragging: !!m.isDragging() })
    }),
    [item.id]
  );

  const iconUrl = buildIconUrl(item.icon);

  return (
    <div
      ref={drag}
      className="gp-item-card"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={() => onView(item)}
    >
      {iconUrl
        ? <img src={iconUrl} alt={item.name} />
        : <span>{item.name}</span>}
    </div>
  );
}

//////////////////////////////////////
// CharCard: Karakter kartı, sürükle-bırak envanter ve tıklayınca önizleme
//////////////////////////////////////
function CharCard({ char, allItems, onInventoryUpdate, onView }) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'ITEM',
      drop: async ({ id }) => {
        if (char.inventory?.includes(id)) return;
        const newInv = [...(char.inventory || []), id];
        await api.patch(`characters/${char.id}/`, { inventory: newInv });
        onInventoryUpdate(char.id, newInv);
      },
      collect: m => ({ isOver: !!m.isOver() })
    }),
    [char, allItems]
  );

  // ■■■ Burada güncelleme: undefined item’ları atıyoruz ■■■
  const inventoryItems = (char.inventory || [])
    .map(itemId => allItems.find(i => i.id === itemId))
    .filter(it => it);

  return (
    <div ref={drop} className={`gp-char-card ${isOver ? 'gp-char-card-over' : ''}`}>
      <h4>{char.name}</h4>
      <p><strong>Level:</strong> {char.level}</p>
      <p><strong>HP:</strong>    {char.hp}</p>
      <p><strong>XP:</strong>    {char.xp}</p>
      <p><strong>Gold:</strong>  {char.gold}</p>

      <section className="gp-stats">
        <h5>Stats</h5>
        <ul>
          <li>STR: {char.strength}</li>
          <li>DEX: {char.dexterity}</li>
          <li>CON: {char.constitution}</li>
          <li>INT: {char.intelligence}</li>
          <li>WIS: {char.wisdom}</li>
          <li>CHA: {char.charisma}</li>
        </ul>
      </section>

      <section className="gp-inventory">
        <h5>Envanter</h5>
        <ul>
          {inventoryItems.map(it => {
            const url = buildIconUrl(it.icon);
            const handleRemove = async () => {
              const newInv = (char.inventory || []).filter(id => id !== it.id);
              await api.patch(`characters/${char.id}/`, { inventory: newInv });
              onInventoryUpdate(char.id, newInv);
            };
            return (
              <li key={it.id} className="gp-inventory-item">
                <div onClick={() => onView(it)} className="gp-inv-thumb">
                  {url
                    ? <img src={url} alt={it.name} />
                    : <span>{it.name}</span>}
                </div>
                <button className="gp-inventory-remove" onClick={handleRemove}>×</button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

//////////////////////////////////////
// Main GodPanel Component
//////////////////////////////////////
export default function GodPanel() {
  const navigate    = useNavigate();
  const lobbyId     = sessionStorage.getItem('lobby_id');
  const [chars, setChars]           = useState([]);
  const [allItems, setAllItems]     = useState([]);
  const [viewItem, setViewItem]     = useState(null);
  const [editItem, setEditItem]     = useState(null);
  const [formValues, setFormValues] = useState({});

  // Başlangıçta karakterleri ve eşyaları yükle
  useEffect(() => {
    api.get('characters/')
      .then(r => setChars(r.data.filter(c => String(c.lobby_id) === String(lobbyId))))
      .catch(console.error);
    api.get('items/items/')
      .then(r => setAllItems(r.data.results || r.data))
      .catch(console.error);
  }, [lobbyId]);

  // Envanter güncelleme callback
  const updateInv = (charId, inv) =>
    setChars(cs => cs.map(c => c.id === charId ? { ...c, inventory: inv } : c));

  // Modal: Önizleme aç/kapa
  const openView = item => { setViewItem(item); setEditItem(null); };
  const closeView = ()   => setViewItem(null);

  // Önizlemeden Düzenle'ye geçiş
  const openEdit = () => {
    const i = viewItem;
    setFormValues({
      item_type:       i.item_type || '',
      subtype:         i.subtype   || '',
      rarity:          i.rarity    || 'common',
      value:           i.value     || 0,
      weight:          i.weight    || 0,
      equip_slot:      i.equip_slot|| '',
      description:     i.description|| '',
      properties:      JSON.stringify(i.properties || {}, null, 2),
      bonuses:         JSON.stringify(i.bonuses    || [], null, 2),
      damage_dice:     i.damage_dice     || '',
      damage_modifier: i.damage_modifier || 0,
      ac_bonus:        i.ac_bonus        || 0
    });
    setEditItem(i);
    setViewItem(null);
  };

  // Form değişiklikleri
  const onChange = e => {
    const { name, value } = e.target;
    setFormValues(f => ({ ...f, [name]: value }));
  };

  // Kaydet
  const saveEdit = async () => {
    const p = { ...formValues };
    // sayısal alanları dönüştür
    ['value','weight','damage_modifier','ac_bonus'].forEach(k => {
      if (p[k] !== undefined) p[k] = Number(p[k]);
    });
    // JSON alanları parse et
    try {
      p.properties = JSON.parse(p.properties);
      p.bonuses    = JSON.parse(p.bonuses);
    } catch {
      alert('Properties veya Bonuses geçerli JSON değil!');
      return;
    }
    const res = await api.patch(`items/items/${editItem.id}/`, p);
    setAllItems(items => items.map(i => i.id === res.data.id ? res.data : i));
    setEditItem(null);
  };

  // GM "Savaşa Geç"
  const handleBattle = () => {
    socket.send(JSON.stringify({ event: 'redirect', target: 'battle' }));
    navigate(`/battle/${lobbyId}`);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="god-panel">
        <h2>GM Panel</h2>
        <button className="gp-button" onClick={handleBattle}>
          Savaş Ekranına Geç
        </button>
        <hr className="gp-divider" />

        <div className="gp-content">
          {/* Sol: Tüm Eşyalar */}
          <div className="gp-items-list">
            <h3>Tüm Eşyalar</h3>
            <div className="gp-items-container">
              {allItems.map(item => (
                <DraggableItem key={item.id} item={item} onView={openView} />
              ))}
            </div>
          </div>

          {/* Sağ: Karakter Kartları */}
          <div className="gp-chars-list">
            <h3>Lobi Karakterleri</h3>
            <div className="gp-chars-container">
              {chars.map(c => (
                <CharCard
                  key={c.id}
                  char={c}
                  allItems={allItems}
                  onInventoryUpdate={updateInv}
                  onView={openView}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Önizleme Modal */}
        {viewItem && (
          <div className="gp-modal-overlay">
            <div className="gp-modal">
              <h3>{viewItem.name}</h3>
              <p><strong>Tür:</strong>        {viewItem.item_type}</p>
              <p><strong>Alt Tür:</strong>    {viewItem.subtype}</p>
              <p><strong>Rarity:</strong>      {viewItem.rarity}</p>
              <p><strong>Değer:</strong>       {viewItem.value}</p>
              <p><strong>Ağırlık:</strong>     {viewItem.weight}</p>
              <p><strong>Equip Slot:</strong>  {viewItem.equip_slot}</p>
              <p><strong>Açıklama:</strong>    {viewItem.description}</p>
              <p><strong>Properties:</strong>
                <pre>{JSON.stringify(viewItem.properties,null,2)}</pre>
              </p>
              <p><strong>Bonuses:</strong>
                <pre>{JSON.stringify(viewItem.bonuses,null,2)}</pre>
              </p>
              {viewItem.damage_dice && viewItem.damage_dice !== '0' && (
                <>
                  <p><strong>Damage Dice:</strong>     {viewItem.damage_dice}</p>
                  <p><strong>Damage Modifier:</strong> {viewItem.damage_modifier}</p>
                </>
              )}
              {viewItem.ac_bonus != null && viewItem.ac_bonus !== 0 && (
                <p><strong>AC Bonus:</strong> {viewItem.ac_bonus}</p>
              )}
              <div className="gp-modal-actions">
                <button onClick={openEdit}>Düzenle</button>
                <button onClick={closeView}>Kapat</button>
              </div>
            </div>
          </div>
        )}

        {/* Düzenleme Modal */}
        {editItem && (
          <div className="gp-modal-overlay">
            <div className="gp-modal">
              <h3>Eşyayı Düzenle</h3>
              <label>Tür<input name="item_type" value={formValues.item_type} disabled/></label>
              <label>Alt Tür<input name="subtype" value={formValues.subtype} onChange={onChange}/></label>
              <label>Rarity
                <select name="rarity" value={formValues.rarity} onChange={onChange}>
                  <option>common</option><option>uncommon</option>
                  <option>rare</option><option>epic</option><option>legendary</option>
                </select>
              </label>
              <label>Equip Slot<input name="equip_slot" value={formValues.equip_slot} onChange={onChange}/></label>
              <label>Değer<input type="number" name="value" value={formValues.value} onChange={onChange}/></label>
              <label>Ağırlık<input type="number" name="weight" value={formValues.weight} onChange={onChange}/></label>
              <label>Açıklama<textarea name="description" value={formValues.description} onChange={onChange}/></label>
              <label>Properties (JSON)<textarea name="properties" value={formValues.properties} onChange={onChange}/></label>
              <label>Bonuses    (JSON)<textarea name="bonuses"    value={formValues.bonuses}    onChange={onChange}/></label>
              {formValues.item_type==='weapon' && (
                <>
                  <label>Damage Dice<input name="damage_dice" value={formValues.damage_dice} onChange={onChange}/></label>
                  <label>Damage Modifier<input type="number" name="damage_modifier" value={formValues.damage_modifier} onChange={onChange}/></label>
                </>
              )}
              {formValues.item_type==='armor' && (
                <label>AC Bonus<input type="number" name="ac_bonus" value={formValues.ac_bonus} onChange={onChange}/></label>
              )}
              <div className="gp-modal-actions">
                <button onClick={saveEdit}>Kaydet</button>
                <button onClick={()=>setEditItem(null)}>İptal</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DndProvider>
  );
}
