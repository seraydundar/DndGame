import React, { useState, useEffect } from 'react';
import { useParams }                  from 'react-router-dom';
import api                            from '../services/api';
import { createBattleSocket,
         getBattleSocket }           from '../services/battleSocket';
import BattleSetup                   from './BattleSetup';
import BattleMap                     from './BattleMap';
import BattleActions                 from './BattleActions';
import BattleChat                    from './BattleChat';
import './BattlePage.css';
import bannerPng     from '../assets/ui/banner.png';
import eyeBadge   from '../assets/ui/eye_badge.png';
import shieldBadge from '../assets/ui/shield_badge.png';

const GRID_SIZE   = 20;
const TOTAL_CELLS = GRID_SIZE * 15;

export default function BattlePage() {
  const { id } = useParams();
  const currentUserId = +localStorage.getItem('user_id') || 0;

  // --- State’ler ---
  const [lobbyId, setLobbyId]                     = useState(null);
  const [lobbyData, setLobbyData]                 = useState(null);
  const [isGM, setIsGM]                           = useState(false);
  const [allCharacters, setAllCharacters]         = useState([]);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [placements, setPlacements]               = useState({});
  const [battleStarted, setBattleStarted]         = useState(false);
  const [initiativeOrder, setInitiativeOrder]     = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex]   = useState(0);
  const [selectedAttacker, setSelectedAttacker]   = useState(null);
  const [attackMode, setAttackMode]               = useState(false);
  const [attackType, setAttackType]               = useState(null);
  const [spellMode, setSpellMode]                 = useState(false);
  const [selectedSpell, setSelectedSpell]         = useState(null);
  const [availableCreatures, setAvailableCreatures] = useState([]);

  const [movementMode, setMovementMode]           = useState(false);  // ← Yeni
  const [reachableCells, setReachableCells]       = useState(new Set());
  const [moving, setMoving]                       = useState(false);
  const [chatLog, setChatLog]                     = useState([]);
  const [actionUsed, setActionUsed]               = useState(false);
  const [movementRemaining, setMovementRemaining] = useState(3);
  const [rangedReachableCells, setRangedReachableCells] = useState(new Set());

  // --- lobbyId’yi belirle / sakla ---
  useEffect(() => {
    const stored = sessionStorage.getItem('lobby_id')
                || localStorage.getItem('lobby_id')
                || id;
    if (stored) {
      sessionStorage.setItem('lobby_id', stored);
      localStorage.setItem('lobby_id', stored);
      setLobbyId(stored);
    }
  }, [id]);

  // --- Lobi verisini çek ---
  useEffect(() => {
    if (!lobbyId) return;
    api.get(`lobbies/${lobbyId}/`)
      .then(res => {
        setLobbyData(res.data);
        setIsGM(res.data.gm_player === currentUserId);
      })
      .catch(err => console.error("Lobi verisi hata:", err));
  }, [lobbyId, currentUserId]);

  // --- Karakterleri çek ---
  useEffect(() => {
    if (!lobbyId) return;
    api.get(`lobbies/${lobbyId}/characters/`)
      .then(res => setAllCharacters(res.data))
      .catch(err => console.error("Karakterler çekme hata:", err));
  }, [lobbyId]);

  useEffect(() => {
    if (!lobbyId) return;  // istersen kaldırabilirsiniz, global de çekebilir
    api.get('creatures/')
      .then(res => {
        const data = res.data.results ?? res.data;
        setAvailableCreatures(data);
      })
      .catch(err => console.error("Yaratıklar çekme hata:", err));
  }, [lobbyId]);

  // --- Available hesapla ---
  useEffect(() => {
    const placedIds = Object.values(placements).filter(Boolean).map(c => c.id);
    setAvailableCharacters(allCharacters.filter(c => !placedIds.includes(c.id)));
  }, [allCharacters, placements]);

  // --- joinLobby listener ---
  useEffect(() => {
    const sock = getBattleSocket();
    if (!sock) return;
    const onMsg = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'joinLobby' && data.lobbyId) {
          sessionStorage.setItem('lobby_id', data.lobbyId);
          localStorage.setItem('lobby_id', data.lobbyId);
          setLobbyId(data.lobbyId);
        }
      } catch {}
    };
    sock.addEventListener('message', onMsg);
    return () => sock.removeEventListener('message', onMsg);
  }, []);

  // --- Polling battle-state ---
  useEffect(() => {
    if (!battleStarted) return;
    const iv = setInterval(() => {
      api.get(`battle-state/${lobbyId}/`)
        .then(res => {
          const d = res.data;
          setInitiativeOrder(d.initiative_order);
          setPlacements(d.placements);
          setCurrentTurnIndex(d.current_turn_index || 0);
          if (Array.isArray(d.chat_log)) {
            setChatLog(prev => {
              const news = d.chat_log.filter(m => !prev.includes(m));
              return prev.concat(news);
            });
          }
        })
        .catch(err => console.error("Battle state fetch hata:", err));
    }, 3000);
    return () => clearInterval(iv);
  }, [lobbyId, battleStarted]);

// --- WebSocket handler ---

  useEffect(() => {
  if (!lobbyId) return;

  // handler’a artık doğrudan parse edilmiş mesaj objesi geliyor
  const handler = d => {
    if (String(d.lobbyId) !== String(lobbyId)) return;

    switch (d.event) {

      case 'battleStart':
        // 1) Savaş başladı
        setBattleStarted(true);
        setMovementMode(false);
        setAttackMode(false);
        setSpellMode(false);

        // 2) Gelen oyuncu ve yaratıkları state’e yükle
        const players   = (d.players   || []).map(p => ({ ...p, type: 'player'  }));
        const creatures = (d.creatures || []).map(c => ({ ...c, type: 'creature' }));

        // 3) placements objesini oluştur
        const allUnits = {};
        players.concat(creatures).forEach(unit => {
          const idx = unit.grid_y * GRID_SIZE + unit.grid_x;
          allUnits[idx] = unit;
        });
        setPlacements(allUnits);

        // 4) İnisiyatif sırasını sıraya koy
        setInitiativeOrder(d.turnQueue || []);
        setCurrentTurnIndex(0);
        break;

      case 'battleEnd':
        setBattleStarted(false);
        break;

      case 'battleUpdate':
        if (d.placements) {
          setPlacements(d.placements);
        } else if (d.creatures) {
          setPlacements(prev => {
            const next = { ...prev };
            d.creatures.forEach(c => {
              const oldEntry = Object.entries(prev)
                .find(([_, u]) => u?.type === 'creature' && u.id === c.id);
              if (oldEntry) delete next[oldEntry[0]];
              const idx = c.grid_y * GRID_SIZE + c.grid_x;
              next[idx] = { ...c, type: 'creature' };
            });
            return next;
          });
        }
        if (d.initiativeOrder) setInitiativeOrder(d.initiativeOrder);

        // Yeni tur kontrolü
        if (d.current_turn_index !== undefined && d.current_turn_index !== currentTurnIndex) {
          setCurrentTurnIndex(d.current_turn_index);
          setMovementMode(false);
          setAttackMode(false);
          setSpellMode(false);

          const entry = d.initiativeOrder[d.current_turn_index];
          if (entry?.character_id === selectedAttacker?.id) {
            const dexMod = Math.floor((selectedAttacker.dexterity - 10) / 2) || 0;
            setMovementRemaining(2 + dexMod);
            setActionUsed(false);
          } else {
            setMovementRemaining(0);
          }
        }

        // chatLog merge
        const msgs = d.chatLog || d.chat_log;
        if (Array.isArray(msgs)) {
          setChatLog(prev => {
            const news = msgs.filter(m => !prev.includes(m));
            return prev.concat(news);
          });
        }
        break;
    }
  };

  // WebSocket’i aç ve handler’ı ata
  const sock = createBattleSocket(lobbyId, handler);

  // cleanup: sadece socket.close()
  return () => {
    sock.close();
  };
}, [lobbyId, selectedAttacker, currentTurnIndex]);

  // --- Ranged saldırı menzil hesaplama ---
useEffect(() => {
  if (!attackMode || attackType !== 'ranged' || !selectedAttacker) {
    setRangedReachableCells(new Set());
    return;
  }
  const entry = Object.entries(placements)
    .find(([_, c]) => c?.id === selectedAttacker.id);
  if (!entry) {
    setRangedReachableCells(new Set());
    return;
  }
  const origin   = Number(entry[0]);
  const row      = Math.floor(origin / GRID_SIZE);
  const col      = origin % GRID_SIZE;
  const baseRange= 2;
  const dexMod   = Math.floor((selectedAttacker.dexterity - 10) / 2) || 0;
  const range    = baseRange + dexMod;

  const cells = new Set();
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const r = Math.floor(i / GRID_SIZE), c = i % GRID_SIZE;
    if (Math.abs(r - row) + Math.abs(c - col) <= range) {
      cells.add(i);
    }
  }
  setRangedReachableCells(cells);
}, [attackMode, attackType, selectedAttacker, placements]);


  

// --- Drag & Drop ---
const handleDragStart = (e, unit, source, sourceIndex) => {
  e.dataTransfer.setData(
    'text/plain',
    JSON.stringify({ unit, source, sourceIndex })
  );
};

const handleDragOver = e => {
  e.preventDefault();
};

const handleDrop = async (e, cellIndex) => {
  e.preventDefault();
  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return;
  const { unit, source, sourceIndex } = JSON.parse(raw);

  // Kopya state
  const nextPlacements = { ...placements };

  if (source === 'creature') {
    // 1) Monster spawn
    const gridY = Math.floor(cellIndex / GRID_SIZE);
    const gridX = cellIndex % GRID_SIZE;
    try {
      const res = await api.post('characters/spawn-monster/', {
        monster_id: unit.id,
        lobby_id:   lobbyId,
        position:   { x: gridX, y: gridY }
      });
      // Yeni Character objesini yerleştir
      nextPlacements[cellIndex] = { ...res.data, type: 'creature' };
      // availableCreatures listesinden kaldır
      setAvailableCreatures(prev =>
        prev.filter(c => c.id !== unit.id)
      );
    } catch (err) {
      console.error('Monster spawn hatası:', err);
      return;
    }
  } else {
    // 2) Oyuncu karakterini grid’den veya available’den taşı
    if (source === 'grid') {
      nextPlacements[sourceIndex] = undefined;
    }
    if (nextPlacements[cellIndex]) {
      setAvailableCharacters(prev => [
        ...prev,
        nextPlacements[cellIndex]
      ]);
    }
    nextPlacements[cellIndex] = {
      ...unit,
      type: unit.type || 'player'
    };
  }

  // State’i güncelle
  setPlacements(nextPlacements);

  // 3) WebSocket ile diğer oyunculara bildir
  const sock = getBattleSocket();
  if (sock?.readyState === WebSocket.OPEN) {
    sock.send(JSON.stringify({
      event:      'battleUpdate',
      lobbyId,
      placements: nextPlacements
    }));
  }
};

// --- Savaş başlat (GM) ---
const handleStartBattle = async () => {
  if (!isGM) return;

  try {
    // 1) Grid’deki tüm birimlerin ID’lerini al
    const placedIds = Object.values(placements)
      .map(unit => unit?.id)
      .filter(id => id != null);

    if (placedIds.length === 0) {
      return alert("Haritaya en az bir birim yerleştirmelisiniz.");
    }

    // 2) REST ile inisiyatif sırasını oluştur
    await api.post('combat/initiate/', {
      lobby_id:             lobbyId,
      character_ids:        placedIds,
      placements,
      available_characters: availableCharacters.map(c => c.id),
    });

    // 2a) Server’ın WS broadcast hazırlığı için kısa bir gecikme
    await new Promise(resolve => setTimeout(resolve, 2000));

    // (BattleStart mesajı server’dan WS üzerinden geleceği için
    // burada hiçbir şey yapmaya gerek yok.)

  } catch (err) {
    console.error("Savaş başlatma hata:", err);
  }
};

  // --- Hücre tıklama: önce saldırı/büyü then hareket ---
  const handleCellClick = (cellIndex, cellCharacter) => {

          // --- GM yaratık kontrolü (movement) ---
      if (selectedAttacker?.type === 'creature' && movementMode && reachableCells.has(cellIndex)) {
        // tıpkı karakter gibi hareket ettir
      handleMoveCreature(cellIndex);
        return;
      }
      // --- GM yaratık kontrolü (attack) ---
      if (selectedAttacker?.type === 'creature' && attackMode && cellCharacter) {
        handleCreatureAttack(cellCharacter);
        return;
      }
    // 1) Melee
    if (attackMode && attackType === 'melee' && selectedAttacker && cellCharacter) {
      handleMeleeAttack(cellCharacter);
      return;
    }
    // 2) Ranged
    if (attackMode && attackType === 'ranged' && selectedAttacker && cellCharacter) {
      handleRangedAttack(cellCharacter);
      return;
    }
    // 3) Spell
    if (spellMode && selectedAttacker && selectedSpell && cellCharacter) {
      handleSpellCast(selectedSpell.id, [cellCharacter.id]);
      return;
    }
    // 4) Move
    if (movementMode && selectedAttacker && reachableCells.has(cellIndex)) {
      handleMoveCharacter(cellIndex);
      return;
    }
    // 5) Select character (sira kontrolu)
    if (cellCharacter?.player_id === currentUserId) {
      const turn = initiativeOrder[currentTurnIndex];
      if (!turn || cellCharacter.id !== turn.character_id) {
        alert('Sıra sizde değil!');
        return;
      }
      // sadece seçimi yap, modları bozmadan
      setSelectedAttacker(cellCharacter);
    }
  };

  // --- Karakteri hareket ettir ---
  const handleMoveCharacter = async targetCell => {
    const entry = Object.entries(placements)
      .find(([_, ch]) => ch?.id === selectedAttacker.id);
    if (!entry) return;
    const origin = Number(entry[0]);
    const or = Math.floor(origin/GRID_SIZE), oc = origin%GRID_SIZE;
    const tr = Math.floor(targetCell/GRID_SIZE), tc = targetCell%GRID_SIZE;
    const dist = Math.abs(or - tr) + Math.abs(oc - tc);
    if (dist > movementRemaining) {
      alert(`En fazla ${movementRemaining} kare gidebilirsin.`);
      return;
    }
    // kalan azalt
    setMovementRemaining(prev => prev - dist);

    // yerleştir
    const next = { ...placements };
    next[origin] = undefined;
    next[targetCell] = selectedAttacker;
    setPlacements(next);
    setMoving(true);
    try {
      await api.post('combat/move/', { lobby_id: lobbyId, placements: next });
      getBattleSocket().send(JSON.stringify({
        event: 'battleUpdate',
        lobbyId,
        placements: next
      }));
    } catch(err) {
      console.error("Hareket güncelleme hata:", err);
    } finally {
      setMoving(false);
    }
    // seçimi koru, böylece useEffect vurguyu günceller
  };

  // --- Canavarı hareket ettir ---
const handleMoveCreature = async targetCell => {
  if (!selectedAttacker) return;
  // distance hesabı (handleMoveCharacter ile aynı)
  const entry = Object.entries(placements)
    .find(([_, u]) => u?.id === selectedAttacker.id && u?.type === 'creature');
  if (!entry) return;
  const origin = Number(entry[0]);
  const or = Math.floor(origin / GRID_SIZE), oc = origin % GRID_SIZE;
  const tr = Math.floor(targetCell / GRID_SIZE), tc = targetCell % GRID_SIZE;
  const dist = Math.abs(or - tr) + Math.abs(oc - tc);
  if (dist > movementRemaining) {
    alert(`Canavar en fazla ${movementRemaining} kare gidebilir.`);
    return;
  }

  setMovementRemaining(prev => prev - dist);
  const next = { ...placements };
  delete next[origin];
  next[targetCell] = selectedAttacker;
  setPlacements(next);
  setMoving(true);

  try {
    // creature hareket endpoint’inizi çağırın
    await api.post('combat/move/', {
      lobby_id: lobbyId,
      creature_id: selectedAttacker.id,
      grid_x:  Math.floor(targetCell / GRID_SIZE),
      grid_y:  targetCell % GRID_SIZE,
    });
    getBattleSocket().send(JSON.stringify({
      event: 'battleUpdate',
      lobbyId,
      creatures: [ {
        ...selectedAttacker,
        grid_x: Math.floor(targetCell / GRID_SIZE),
        grid_y: targetCell % GRID_SIZE
      }]
    }));
  } catch (err) {
    console.error("Canavar hareket hatası:", err);
  } finally {
    setMoving(false);
  }
};

  // --- Melee Attack ---
const handleMeleeAttack = async targetCharacter => {
  if (!selectedAttacker || !targetCharacter) return;

  try {
    // 1) API çağrısı
    const res = await api.post('combat/melee-attack/', {
      attacker_id: selectedAttacker.id,
      target_id:   targetCharacter.id,
      lobby_id:    lobbyId,
    });
    const {
      message: apiMsg,
      damage: dmg,
      target_remaining_hp: leftHp,
      chat_log: chatLogRes
    } = res.data;

    // 2) Mesajı zenginleştir
    let enrichedMsg = apiMsg;
    if (selectedAttacker.is_temporary) {
      // Monster için kendi melee_dice değerini kullan
      const diceStr = selectedAttacker.melee_dice || "1d4";
      enrichedMsg += ` (Canavar Zar: ${diceStr}) (Kalan HP: ${leftHp})`;
    } else {
      // Normal karakter: silah ve STR mod hesapla
      const weapon = selectedAttacker.main_hand || selectedAttacker.off_hand;
      const strMod = Math.floor((selectedAttacker.strength - 10) / 2);
      const isCrit  = apiMsg.includes('Kritik');
      const diceTotal = isCrit
        ? (dmg / 2 - strMod)
        : (dmg - strMod);

      enrichedMsg += ` (Silah: ${weapon.name}, Zar Dice: ${weapon.damage_dice}, Zar Toplamı: ${diceTotal}) (Kalan HP: ${leftHp})`;
    }

    // 3) Chat log’u güncelle ve yayınla
    setChatLog(prev => {
      const next = [...chatLogRes.slice(0, -1), enrichedMsg];
      getBattleSocket().send(JSON.stringify({
        event:   'battleUpdate',
        lobbyId,
        chatLog: next
      }));
      return next;
    });

    // 4) Son durumu çek ve ekranı güncelle
    const state = await api.get(`battle-state/${lobbyId}/`);
    setInitiativeOrder(state.data.initiative_order);
    setPlacements(state.data.placements);
    setCurrentTurnIndex(state.data.current_turn_index || 0);

  } catch (err) {
    if (err.response?.status === 400 && err.response.data?.error) {
      console.log('[BattlePage] Yakın dövüş hatası:', err.response.data.error);
    } else {
      console.error('Yakın dövüş hata:', err);
    }
  }

  // 5) Modları sıfırla
  setAttackMode(false);
  setAttackType(null);
  setSelectedAttacker(null);
};
  // --- Canavarın yakın dövüş saldırısı ---
const handleCreatureAttack = async targetCharacter => {
  if (!selectedAttacker || !targetCharacter) return;
  try {
    const res = await api.post('combat/melee-attack/', {
      lobby_id: lobbyId,
      attacker_type: 'creature',
      attacker_id: selectedAttacker.id,
      target_id:   targetCharacter.id,
    });
    // server’dan dönen chat_log / placements vb.
    const { chat_log: chatLogRes, placements: newPlacements } = res.data;
    setChatLog(prev => {
      const merged = [...chatLogRes];
      getBattleSocket().send(JSON.stringify({
        event: 'battleUpdate',
        lobbyId,
        chatLog: merged
      }));
      return merged;
    });
    setPlacements(newPlacements);
  } catch (err) {
    console.error("Canavar saldırı hatası:", err);
  } finally {
    // saldırıyı bitir
    setAttackMode(false);
    setAttackType(null);
    setSelectedAttacker(null);
  }
};


  // --- Ranged Attack ---
  const handleRangedAttack = async targetCharacter => {
    if (!selectedAttacker || !targetCharacter) return;

    try {
      const res = await api.post('combat/ranged-attack/', {
        attacker_id: selectedAttacker.id,
        target_id:   targetCharacter.id,
        lobby_id:    lobbyId,
      });
      const {
        message: apiMsg,
        damage: dmg,
        target_remaining_hp: leftHp,
        chat_log: chatLogRes
      } = res.data;

      // Mesajı zenginleştir
      const weapon = selectedAttacker.main_hand || selectedAttacker.off_hand;
      const dexMod = Math.floor((selectedAttacker.dexterity - 10) / 2);
      const isCrit = apiMsg.includes('Kritik');
      const diceTotal = isCrit
        ? (dmg / 2 - dexMod)
        : (dmg - dexMod);

      const enrichedMsg =
        `${apiMsg} (Silah: ${weapon.name}, Zar Dice: ${weapon.damage_dice}, Zar Toplamı: ${diceTotal}) (Kalan HP: ${leftHp})`;

      // Chat log’u güncelle
      setChatLog(prev => {
        const next = [...chatLogRes.slice(0, -1), enrichedMsg];
        getBattleSocket().send(JSON.stringify({
          event:   'battleUpdate',
          lobbyId,
          chatLog: next
        }));
        return next;
      });

      // Son durumu çek ve render et
      const state = await api.get(`battle-state/${lobbyId}/`);
      setInitiativeOrder(state.data.initiative_order);
      setPlacements(state.data.placements);
      setCurrentTurnIndex(state.data.current_turn_index || 0);

    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.error) {
        console.log('[BattlePage] Menzilli saldırı hatası:', err.response.data.error);
      } else {
        console.error('Menzilli saldırı hata:', err);
      }
    }

    // Modları sıfırla, yeniden saldırıya izin versin
    setAttackMode(false);
    setAttackType(null);
    setSelectedAttacker(null);
  };

  // --- Spell Cast ---
  const handleSpellCast = async (spellId, targetIds, extra={}) => {
    if (!selectedAttacker || !targetIds.length) return;
    try {
      const res = await api.post(`spells/${spellId}/cast/`, {
        attacker_id: selectedAttacker.id,
        targets: targetIds,
        lobby_id: lobbyId,
        spell_id: spellId,
        spell_level: selectedSpell.level,
        ...extra
      });
      const message = res.data.message, results = res.data.results;
      console.log('[BattlePage] Spell cast:', message);
      setChatLog(prev => {
        const next = [...prev, message];
        getBattleSocket().send(JSON.stringify({
          event:'battleUpdate',
          lobbyId,
          chatLog:next
        }));
        return next;
      });
      if (results) {
        setPlacements(prev => {
          const next = {...prev};
          Object.entries(results).forEach(([cid,hp]) => {
            const e = Object.entries(prev).find(([_,c])=>c?.id===+cid);
            if (e) next[e[0]] = {...e[1], current_hp: hp};
          });
          return next;
        });
      }
      const state=await api.get(`battle-state/${lobbyId}/`);
      setInitiativeOrder(state.data.initiative_order);
      setPlacements(state.data.placements);
      setCurrentTurnIndex(state.data.current_turn_index||0);
      setActionUsed(true);
    } catch(err){
      console.error("Büyü kullanım hata:", err);
    }
    setSpellMode(false);
    setSelectedSpell(null);
    setSelectedAttacker(null);
  };

  // --- Spell select ---
  const handleSelectSpell = spell => {
    setSelectedSpell(spell);
    setAttackMode(false);
    setAttackType(null);
  };

  const handleEndTurn = async () => {
  try {
    const res = await api.post('combat/end-turn/', { lobby_id: lobbyId });
    const newOrder = res.data.initiative_order;
    const newPlac  = res.data.placements;
    const newIdx   = res.data.current_turn_index ?? currentTurnIndex + 1;

    // Sunucuya güncellemeyi bildir
    getBattleSocket().send(JSON.stringify({
      event: 'battleUpdate',
      lobbyId,
      initiativeOrder: newOrder,
      placements: newPlac
    }));

    // State’leri güncelle
    setInitiativeOrder(newOrder);
    setPlacements(newPlac);
    setCurrentTurnIndex(newIdx);

    // **YENİ EKLENECEK SATIR:** Hareket haklarını başa döndür
    setMovementRemaining(3);

  } catch (err) {
    console.error("Tur sonlandırma hata:", err);
  } finally {
    // Modları kapat
    setAttackMode(false);
    setAttackType(null);
    setSpellMode(false);
    setMovementMode(false);
    setSelectedAttacker(null);
    setSelectedSpell(null);
  }
};

  // --- End battle ---
  const handleEndBattle = () => {
    getBattleSocket().send(JSON.stringify({ event:'battleEnd', lobbyId }));
  };

  // --- Reachable hesapla ---
  useEffect(() => {
  if (!movementMode || !selectedAttacker || movementRemaining <= 0) {
    setReachableCells(new Set());
    return;
  }
  const entry = Object.entries(placements)
    .find(([_, c]) => c?.id === selectedAttacker.id);
  if (!entry) { setReachableCells(new Set()); return; }

  const originIdx = Number(entry[0]);
  const row = Math.floor(originIdx / GRID_SIZE);
  const col = originIdx % GRID_SIZE;
  const range = movementRemaining;

  const cells = new Set();
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (placements[i]) continue;            // dolu kareler hariç
    const r = Math.floor(i / GRID_SIZE), c = i % GRID_SIZE;
    if (Math.abs(r - row) + Math.abs(c - col) <= range) cells.add(i);
  }
  setReachableCells(cells);
}, [movementMode, selectedAttacker, placements, movementRemaining]);

/* ---------------------- RENDER ---------------------- */
if (!lobbyData) {
  return <div className="battle-container">Lobi bilgileri yükleniyor…</div>;
}
 if (!battleStarted) {
    if (isGM) {
      return (
        <BattleSetup
          isGM={isGM}
          characters={allCharacters}
          placements={placements}
          availableCharacters={availableCharacters}
          availableCreatures={availableCreatures}
          gridSize={GRID_SIZE}
          totalCells={TOTAL_CELLS}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onStartBattle={handleStartBattle}
        />
      );
    } else {
      return (
        <div className="waiting-message">
          <p>Savaş henüz başlamadı. GM’in başlatmasını bekleyin.</p>
        </div>
      );
    }
  }

  // Savaş başladıysa gerçek savaş alanını göster
  return (
  <>
    {/* ---------- Banner (ekranın üstü, bağımsız) ---------- */}
    <img
      src={bannerPng}
      alt="Battle Banner"
      className="combat-banner"
    />

    {/* ---------- Tüm oyun alanını saran flex-wrapper ---------- */}
    <div className="game-wrapper">

      {/* ---------- Pano (grid) + yan rozetler ---------- */}
      <div className="board-wrapper">
        <img
          src={eyeBadge}
          alt="Eye Badge"
          className="badge badge-eye"
        />
        <img
          src={shieldBadge}
          alt="Shield Badge"
          className="badge badge-shield"
        />

        <BattleMap
          placements={placements}
          reachableCells={reachableCells}
          rangedReachableCells={rangedReachableCells}
          gridSize={GRID_SIZE}
          totalCells={TOTAL_CELLS}
          moving={moving}
          currentUserId={currentUserId}
          onCellClick={handleCellClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>

      {/* ---------- Alt parşömen panel (actions + chat) ---------- */}
      <div className="panel">
        <BattleActions
          selectedAttacker={selectedAttacker}
          attackMode={attackMode}
          attackType={attackType}
          spellMode={spellMode}
          selectedSpell={selectedSpell}
          availableSpells={selectedAttacker?.prepared_spells}
          movementRemaining={movementRemaining}
          actionUsed={actionUsed}

          onChooseMelee={() => {
            setAttackMode(true);
            setAttackType('melee');
            setSpellMode(false);
            setMovementMode(false);
          }}
          onChooseRanged={() => {
            setAttackMode(true);
            setAttackType('ranged');
            setSpellMode(false);
            setMovementMode(false);
          }}
          onChooseSpell={() => {
            setSpellMode(true);
            setAttackMode(false);
            setAttackType(null);
            setMovementMode(false);
          }}
          onChooseMove={() => {
            setMovementMode(true);
            setAttackMode(false);
            setSpellMode(false);
            setAttackType(null);
          }}

          onSelectSpell={handleSelectSpell}
          onCancel={() => {
            setSelectedAttacker(null);
            setAttackMode(false);
            setAttackType(null);
            setSpellMode(false);
            setSelectedSpell(null);
            setMovementMode(false);
          }}
          onEndTurn={handleEndTurn}
          onEndBattle={handleEndBattle}

          isGM={isGM}
        />

        <BattleChat
          initiativeOrder={initiativeOrder}
          currentTurnIndex={currentTurnIndex}
          chatLog={chatLog}
          onSendMessage={msg => {
            const updatedLog = [...chatLog, msg];
            setChatLog(updatedLog);
            getBattleSocket().send(JSON.stringify({
              event: 'battleUpdate',
              lobbyId,
              chatLog: updatedLog,
            }));
          }}
        />
      </div>
    </div>
  </>
);
}
