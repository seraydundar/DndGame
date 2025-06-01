// src/pages/LevelUp.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate }              from 'react-router-dom';
import api                                     from '../services/api';
import './LevelUp.css';

const STAT_KEYS      = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
const CASTER_CLASSES = ['wizard','sorcerer','warlock','druid','paladin','cleric'];

export default function LevelUp() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [info,         setInfo]         = useState(null);
  const [char,         setChar]         = useState(null);
  const [inc,          setInc]          = useState({});
  const [spells,       setSpells]       = useState([]);   // sınıfa uygun tüm büyüler
  const [selSpell,     setSelSpell]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [err,          setErr]          = useState(null);
  const [preparedData, setPreparedData] = useState([]);   // karakterin zaten sahip olduğu tam nesne listesi

  /* --------------------------------------------------------------------------
     useMemo HOOKLARI
     – costSpent: 1 veya 2 puan kuralları
     – ownedSpellIds: mevcut prepared_spells ID’leri (dizi/nesne/sözlük dönüşümü)
     – availableSpells: ekranda gösterilecek büyüler (sahip olmayanlar)
  -------------------------------------------------------------------------- */
  const costSpent = useMemo(() => {
    if (!char) return 0;
    return STAT_KEYS.reduce((sum, key) => {
      const base = char[key] || 0;
      const plus = inc[key]  || 0;
      for (let i = 1; i <= plus; i++) {
        sum += (base + i) > 13 ? 2 : 1;
      }
      return sum;
    }, 0);
  }, [inc, char]);

  const pointsTotal = 2;
  const remaining   = pointsTotal - costSpent;

  // Karakterin sahip olduğu hazır büyü ID’leri
  const ownedSpellIds = useMemo(() => {
    if (!char?.prepared_spells) return [];
    const ps = char.prepared_spells;

    // 1) Eğer nesne-dizisi formatındaysa: [{id:3,...},…]
    if (Array.isArray(ps) && ps.length && typeof ps[0] === 'object' && ps[0].id !== undefined) {
      return ps.map(x => Number(x.id));
    }
    // 2) Eğer dizi olarak ID listesi geldiyse: ["3","7"] veya [3,7]
    if (Array.isArray(ps)) {
      return ps.map(x => Number(x));
    }
    // 3) Eğer dictionary formatındaysa: {"3": true, "7": true}
    if (typeof ps === 'object') {
      return Object.keys(ps).map(k => Number(k));
    }
    return [];
  }, [char]);

  // Bu sınıfa uygun büyülerden, karakterin henüz sahip olmadığılar
  const availableSpells = useMemo(() => {
    return spells.filter(sp => !ownedSpellIds.includes(sp.id));
  }, [spells, ownedSpellIds]);

  /* --------------------------------------------------------------------------
     GET: level-up-info + karakter + bu sınıfa uygun büyü listesi
  -------------------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        // 1) level-up-info
        const lvlRes = await api.get(`characters/${id}/level-up-info/`);
        setInfo(lvlRes.data);

        // 2) karakter verisi
        const charRes = await api.get(`characters/${id}/`);
        setChar(charRes.data);

        // 3) caster mı? (string veya nested objeden bak)
        const rawClass = typeof charRes.data.character_class === 'string'
          ? charRes.data.character_class
          : charRes.data.character_class?.class_name;
        const cls = (rawClass || '').trim().toLowerCase();

        // 4) eğer caster ise, sınıfa uygun listeyi çek
        if (CASTER_CLASSES.includes(cls)) {
          const spellRes = await api.get(`spells/?class=${cls}`);
          const list = spellRes.data.results || spellRes.data;
          setSpells(list);
        }

        setLoading(false);
      } catch (e) {
        console.error('Üst seviye GET işleminde hata:', e);
        setErr(e);
        setLoading(false);
      }
    })();
  }, [id]);

  /* --------------------------------------------------------------------------
     “Hazır Büyüler” detaylarını hazırla: spells içinde varsa filtrele,
     değilse API’den tek tek fetch et
  -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!char?.prepared_spells) {
      setPreparedData([]);
      return;
    }

    const ps = char.prepared_spells;
    let currentArray = [];

    // 1) Eğer nesne-dizisi formatındaysa (örneğin [{id:6,...}, {id:5,...}])
    if (Array.isArray(ps) && ps.length && typeof ps[0] === 'object' && ps[0].id !== undefined) {
      currentArray = ps.map(x => ({ id: Number(x.id) }));
    }
    // 2) Eğer dizi olarak ID listesi geldiyse (["6","5"] veya [6,5])
    else if (Array.isArray(ps)) {
      currentArray = ps.map(x => ({ id: Number(x) }));
    }
    // 3) Eğer sözlük ({"6":true,"5":true}) formatındaysa
    else if (typeof ps === 'object') {
      currentArray = Object.keys(ps).map(k => ({ id: Number(k) }));
    }

    // spells listesinde varsa, tam nesneye dönüştürelim:
    const inClass = spells.filter(sp => currentArray.some(obj => obj.id === sp.id));

    // Geriye kalan ID’ler için API’den tek tek fetch:
    const missingIds = currentArray
      .map(obj => obj.id)
      .filter(spellId => !inClass.some(sp => sp.id === spellId));

    if (!missingIds.length) {
      setPreparedData(inClass);
      return;
    }

    Promise.all(
      missingIds.map(spellId =>
        api.get(`spells/${spellId}/`)
           .then(r => r.data)
           .catch(() => null)
      )
    ).then(results => {
      const fetched = results.filter(r => r);
      setPreparedData([...inClass, ...fetched]);
    }).catch(console.error);
  }, [char, spells]);

  /* --------------------------------------------------------------------------
     Stat değişiklik butonları
  -------------------------------------------------------------------------- */
  const handleChange = (key, delta) => {
    setInc(prev => {
      const next = { ...prev, [key]: (prev[key] || 0) + delta };
      if (next[key] <= 0) delete next[key];
      return next;
    });
  };

  /* --------------------------------------------------------------------------
     Onayla & Level Up İşlemi
     — Burası kritik kısım:
       prepared_spells yerine prepared_spells_input olarak gönderiyoruz.
  -------------------------------------------------------------------------- */
  const confirm = async () => {
    try {
      // 1) Karakteri seviye atlat (HP+level artışı gerçekleşiyor)
      await api.post(`characters/${id}/confirm-level-up/`);

      // 2) En güncel karakter verisini çek
      const charRes2    = await api.get(`characters/${id}/`);
      const updatedChar = charRes2.data;

      // 3) Mevcut prepared_spells’i “tam nesne formatında” elde et
      let existingArray = [];
      if (preparedData.length) {
        existingArray = preparedData.map(sp => ({ id: sp.id }));
      } else {
        const prevRaw = updatedChar.prepared_spells || [];
        if (Array.isArray(prevRaw) && prevRaw.length && typeof prevRaw[0] === 'object' && prevRaw[0].id !== undefined) {
          existingArray = prevRaw.map(x => ({ id: Number(x.id) }));
        } else if (Array.isArray(prevRaw)) {
          existingArray = prevRaw.map(x => ({ id: Number(x) }));
        } else if (typeof prevRaw === 'object') {
          existingArray = Object.keys(prevRaw).map(k => ({ id: Number(k) }));
        }
      }

      // 4) Eğer bir büyü seçildiyse, onun ID’sini ekle
      if (selSpell) {
        const already = existingArray.some(o => o.id === selSpell.id);
        if (!already) {
          existingArray = [...existingArray, { id: selSpell.id }];
        }
      }

      console.log('❗ Yeni hazırlanmış prepared_spells (PATCH için):', existingArray);

      // 5) Stat artışlarını ve prepared_spells_input dizisini patch objesinde hazırla
      const patch = {};
      STAT_KEYS.forEach(key => {
        if (inc[key]) {
          patch[key] = (updatedChar[key] || 0) + inc[key];
        }
      });
      if (selSpell) {
        // Burada “prepared_spells_input” kullanıyoruz
        patch.prepared_spells_input = existingArray;
      }

      console.log('❗ Gönderilecek PATCH payload’u:', patch);

      // 6) Eğer patch objesi boş değilse PATCH isteğini yap
      if (Object.keys(patch).length) {
        const patchRes = await api.patch(`characters/${id}/`, patch);
        console.log('❗ PATCH cevabı:', patchRes.data);
      }

      alert('Seviye atlama işlemi başarılı!');
      navigate('/playerpage');
    } catch (e) {
      console.error('Level up sırasında hata:', e.response?.data || e.message);
      alert('Level up hatası: ' + JSON.stringify(e.response?.data || e.message));
    }
  };

  /* --------------------------------------------------------------------------
     EKRAN RENDER
  -------------------------------------------------------------------------- */
  if (loading) {
    return <p className="lvlup-center">Yükleniyor…</p>;
  }
  if (err) {
    return (
      <div className="lvlup-center">
        <h3>Seviye Atlama Hatası</h3>
        <p>{err.response?.data?.error || err.message}</p>
        <button onClick={() => navigate(-1)}>Geri Dön</button>
      </div>
    );
  }

  const nextLvl   = info.current_level + 1;
  const hpGain    = info.level_up_info.hp_increase;
  const rawClass  = typeof char.character_class === 'string'
    ? char.character_class
    : char.character_class?.class_name;
  const cls       = (rawClass || '').trim().toLowerCase();
  const isCaster  = CASTER_CLASSES.includes(cls);
  const canSubmit = remaining === 0 && (!isCaster || Boolean(selSpell));

  return (
    <div className="lvlup-wrapper">
      <h2>{char.name} – Seviye {nextLvl}</h2>

      {/* ---------- Stat Dağıtımı ---------- */}
      <div className="lvlup-grid">
        {STAT_KEYS.map(key => (
          <div key={key} className="stat-row">
            <span className="stat-label">{key.slice(0, 3).toUpperCase()}</span>
            <span className="stat-value">{(char[key] || 0) + (inc[key] || 0)}</span>
            <div className="stat-btns">
              <button
                onClick={() => handleChange(key, +1)}
                disabled={remaining <= 0}
              >+</button>
              <button
                onClick={() => handleChange(key, -1)}
                disabled={!inc[key]}
              >−</button>
            </div>
          </div>
        ))}
      </div>
      <p className="points-info">Kalan Puan: <strong>{remaining}</strong> / {pointsTotal}</p>

      {/* ---------- Mevcut “Hazır Büyüler” Bölümü ---------- */}
      {isCaster && preparedData.length > 0 && (
        <div className="current-spells-section">
          <h4>Mevcut Hazır Büyüler</h4>
          <ul className="current-spells-list">
            {preparedData.map(sp => (
              <li key={sp.id} className="current-spell-item">
                {sp.name || sp.spell_name || sp.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Yeni Büyü Seçimi (sadece caster için) ---------- */}
      {isCaster && (
        <>
          <h4>Yeni Büyü Seç</h4>
          {availableSpells.length > 0 ? (
            <div className="spell-grid">
              {availableSpells.map(sp => (
                <div
                  key={sp.id}
                  className={selSpell?.id === sp.id ? 'spell-card selected' : 'spell-card'}
                  onClick={() => setSelSpell(sp)}
                >
                  {sp.name || sp.spell_name || sp.title}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-spells">Seçilebilecek büyü kalmadı.</p>
          )}
          {selSpell && (
            <p>Seçilen Büyü: <strong>{selSpell.name || selSpell.spell_name || selSpell.title}</strong></p>
          )}
        </>
      )}

      <p className="hp-info">Max HP +{hpGain}</p>

      <button
        className="lvlup-confirm"
        onClick={confirm}
        disabled={!canSubmit}
      >
        Onayla & Seviye Atla
      </button>
      <button
        className="lvlup-cancel"
        onClick={() => navigate(-1)}
      >
        Vazgeç
      </button>
    </div>
  );
}
