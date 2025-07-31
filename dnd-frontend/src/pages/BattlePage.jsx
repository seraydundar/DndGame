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
import { useNavigate } from "react-router-dom";
import DiceRollModal               from '../components/DiceRollModal';
import forestPng  from '../assets/backgrounds/forest.png';
import dungeonJpg from '../assets/backgrounds/dungeon.jpg';
import castleJpg  from '../assets/backgrounds/castle.jpg';
import GMPanel                      from './GMPanel';


const GRID_SIZE   = 20;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const BG_MAP = { forest: forestPng, dungeon: dungeonJpg, castle: castleJpg };
const bgNameFromPath = p => {
  switch (p) {
    case forestPng:  return 'forest';
    case dungeonJpg: return 'dungeon';
    case castleJpg:  return 'castle';
    default:         return 'forest';
  }
};
const resolveBg = b => BG_MAP[b] || b;

// Basit Bresenham algoritması ile görüş hattı kontrolü
const hasLineOfSight = (startIdx, endIdx, obstacles, size) => {
  let x0 = startIdx % size;
  let y0 = Math.floor(startIdx / size);
  const x1 = endIdx % size;
  const y1 = Math.floor(endIdx / size);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (!(x0 === x1 && y0 === y1)) {
    const idx = y0 * size + x0;
    if (idx !== startIdx && idx !== endIdx && obstacles[idx]) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return true;
};


export default function BattlePage() {
  const { id } = useParams();
  const currentUserId = +localStorage.getItem('user_id') || 0;

  // --- State’ler ---
  const navigate = useNavigate();
  const [lobbyId, setLobbyId]                     = useState(null);
  const [lobbyData, setLobbyData]                 = useState(null);
  const [isGM, setIsGM]                           = useState(false);
  const [allCharacters, setAllCharacters]         = useState([]);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [placements, setPlacements]               = useState({});
  const [obstacles, setObstacles]                 = useState({});
  const [battleStarted, setBattleStarted]         = useState(false);
  const [initiativeOrder, setInitiativeOrder]     = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex]   = useState(0);
  const [selectedAttacker, setSelectedAttacker]   = useState(null);
  const [attackMode, setAttackMode]               = useState(false);
  const [attackType, setAttackType]               = useState(null);
  const [spellMode, setSpellMode]                 = useState(false);
  const [selectedSpell, setSelectedSpell]         = useState(null);
  const [rollRequestMode, setRollRequestMode]     = useState(false);
  const [availableCreatures, setAvailableCreatures] = useState([]);
  const [aoeHoverCell,  setAoeHoverCell]  = useState(null);

  // Sağdan kayan chat için aç/kapa durumu
  const [chatOpen, setChatOpen] = useState(false);
  // Chat kapalıyken gelen mesajları saymak için
  const [unreadCount, setUnreadCount] = useState(0);

  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [movementMode, setMovementMode]           = useState(false);  // ← Yeni
  const [reachableCells, setReachableCells]       = useState(new Set());
  const [moving, setMoving]                       = useState(false);
  const [chatLog, setChatLog]                     = useState([]);
  const [actionUsed, setActionUsed]               = useState(false);
  const [movementRemaining, setMovementRemaining] = useState(3);
  const [actionPointsRemaining, setActionPointsRemaining] = useState(1);
  const [rangedReachableCells, setRangedReachableCells] = useState(new Set());

  const [selectedBg, setSelectedBg] = useState(forestPng);

  const [diceVisible, setDiceVisible] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceRequester, setDiceRequester] = useState(null);

 const currentEntry = initiativeOrder[currentTurnIndex] || {};

 // placements bir obje, bu yüzden önce değerleri diziye dönüştürüp find ile arayalım:
 const currentChar = Object.values(placements).find(
   unit => unit?.id === currentEntry.character_id
 );
 // Şimdi gerçekten sıramızın bizde olup olmadığını kontrol edebiliriz:
 const isMyTurn = currentChar?.player_id === currentUserId;
  

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

  useEffect(() => {
  // BattlePage açılırken body'nin önceki before/after'ını temizle
  document.body.className = ''; // varsa EndBattle'dan kalan class'ları temizler
  document.body.style.background = `url(${selectedBg}) center / cover no-repeat fixed`;
  document.body.style.minHeight = '100vh';
  document.body.style.margin = '0';

  // CSS ::before ve ::after’ı override edecek inline stil ekleyebilirsin:
  document.body.style.setProperty('--body-before-bg', 'none');
  document.body.style.setProperty('--body-after-bg', 'none');

  return () => {
    document.body.style.background = '';
  };
}, [selectedBg]);

  // GM arkaplan değişimini diğer oyunculara iletsin
  useEffect(() => {
    if (!isGM || battleStarted) return;
    const sock = getBattleSocket();
    if (sock?.readyState === WebSocket.OPEN) {
      sock.send(JSON.stringify({
        event: 'battleUpdate',
        lobbyId,
        background: selectedBg,
      }));
    }
  }, [selectedBg, isGM, battleStarted, lobbyId]);


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
          setObstacles(d.obstacles || {});
          setCurrentTurnIndex(d.current_turn_index || 0);
          if (d.background) setSelectedBg(resolveBg(d.background));
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
        // 1-a) Eski log ve event’leri temizle
        setChatLog([]);
        // eğer eventLog diye bir state’iniz varsa:
        // setEventLog([]);
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

        if (d.background) setSelectedBg(d.background);

        // 4) İnisiyatif sırasını sıraya koy
        setInitiativeOrder(d.turnQueue || []);
        setCurrentTurnIndex(0);
        break;

      case 'battleEnd':
        // Savaş bittiğinde
        setBattleStarted(false);
        navigate(`/endbattle/${d.lobbyId}`, {
          state: { summary: d.summary || null },   // özet geldiyse taşı
          replace: true                            // geri tuşunda eski sayfaya dönmesin
        });
        break;

      case 'diceRollRequest':
        if (Number(d.playerId) === Number(currentUserId)) {
          alert('GM sizden zar atmanızı istedi!');
        }
        break;  
      
      


      case 'battleUpdate':
        // hem root-level hem de data altında gelebilen payload’ı çıkaralım
    const payload = d.data ?? d;

    // 1) placements / creatures
    if (payload.placements) {
      setPlacements(payload.placements);
    } else if (payload.creatures) {
      setPlacements(prev => {
        /* aynı eski creatures logic’iniz */
      });
    }
     if (payload.obstacles) {
      setObstacles(payload.obstacles);
    }

    // 2) initiative sırası
    const newOrder = payload.initiative_order ?? payload.initiativeOrder;
    if (newOrder) setInitiativeOrder(newOrder);

    // 3) tur index’i
    const newIdx = payload.current_turn_index;
    if (newIdx !== undefined && newIdx !== currentTurnIndex) {
      setCurrentTurnIndex(newIdx);
      /* hareket/aksiyon modlarını reset’leyin */
    }
     if (payload.background) {
      setSelectedBg(resolveBg(payload.background));
    }


    // 4) chat log
    const msgs = payload.chat_log || payload.chatLog;
    if (Array.isArray(msgs)) {
      setChatLog(prev => {
        const news = msgs.filter(m => !prev.includes(m));
        return prev.concat(news);
      });
    }

     if (payload.background) {
      setSelectedBg(payload.background);
    }
     break;

      case 'diceRollRequest': {
        const targetId = Number(d.playerId);
        if (targetId === Number(currentUserId) || isGM) {
          setDiceVisible(true);
          setDiceResult(null);
          setDiceRolling(isGM && targetId !== Number(currentUserId));
          setDiceRequester(targetId);
        }
        break;
      }

      case 'diceRoll':
        setChatLog(prev => prev.concat(`Oyuncu ${d.playerId} zar attı: ${d.result}`));
        if (Number(d.playerId) === diceRequester) {
          setDiceResult(d.result);
          setDiceRolling(false);
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
const handleStartBattle = async (childPlacements, childObstacles = {}) => {
  if (!isGM) return;

  try {
    // 1) Yerleşimleri al
    //    → artık childPlacements üzerinden okuyacağız
    setPlacements(childPlacements);            // parent state’i de güncelle (opsiyonel)
    const placedIds = Object.values(childPlacements)
      .map(u => u?.id)
      .filter(id => id != null);
    if (placedIds.length === 0) {
      return alert("Haritaya en az bir birim yerleştirmelisiniz.");
    }

    // 2) REST çağrısı
    await api.post('combat/initiate/', {
      lobby_id:             lobbyId,
      character_ids:        placedIds,
      placements:           childPlacements,
      obstacles:            childObstacles,
      available_characters: availableCharacters.map(c => c.id),
      background:           bgNameFromPath(selectedBg),
    });

    // 3) Setup’ı kapat, savaş moduna geç
    setBattleStarted(true);
    setChatLog([]);                // eski log’u temizle
    setMovementMode(false);        // modları sıfırla
    setAttackMode(false);
    setSpellMode(false);

    // 4) İlk battle-state’i çekip yükle
    const res = await api.get(`battle-state/${lobbyId}/`);
    setInitiativeOrder(res.data.initiative_order);
    setPlacements(res.data.placements);
    setObstacles(res.data.obstacles || {});
    setCurrentTurnIndex(res.data.current_turn_index || 0);
    if (res.data.background) setSelectedBg(res.data.background);

  } catch (err) {
    console.error("Savaş başlatma hata:", err);
  }
};

  // --- Hücre tıklama: önce saldırı/büyü, sonra hareket ---
const handleCellClick = (cellIndex, cellCharacter) => {
   if (rollRequestMode && cellCharacter) {
    const sock = getBattleSocket();
    if (sock?.readyState === WebSocket.OPEN) {
      sock.send(
        JSON.stringify({
          event: 'diceRollRequest',
          playerId: cellCharacter.player_id,
          lobbyId,
        })
      );
    }
    setRollRequestMode(false);
    return;
  }
  /* ---------- GM kontrollü yaratıklar ---------- */
  // 1) GM yaratığı için hareket
  if (
    selectedAttacker?.type === 'creature' &&
    movementMode &&
    reachableCells.has(cellIndex)
  ) {
    handleMoveCreature(cellIndex);
    return;
  }

  // 2) GM yaratığı için saldırı
  if (
    selectedAttacker?.type === 'creature' &&
    attackMode &&
    cellCharacter
  ) {
    if (attackType === 'ranged') {
      handleRangedAttack(cellCharacter);
    } else {
      handleCreatureAttack(cellCharacter);
    }
    return;
  }

  /* ---------- Oyuncu karakterinin hamleleri ---------- */
  // 3) Yakın dövüş
  if (
    attackMode &&
    attackType === 'melee' &&
    selectedAttacker &&
    cellCharacter
  ) {
    handleMeleeAttack(cellCharacter);
    return;
  }

  // 4) Menzilli saldırı
  if (
    attackMode &&
    attackType === 'ranged' &&
    selectedAttacker &&
    cellCharacter
  ) {
    handleRangedAttack(cellCharacter);
    return;
  }

  // 5) Büyü (tek hedef veya alan)
  if (spellMode && selectedAttacker && selectedSpell) {
    if (selectedSpell.scope === 'area') {
      /* Alan etkili büyü:
         - Hedefte karakter olsun veya olmasın
         - Merkez olarak tıklanan hücreyi kullan.
      */
      handleSpellCast(selectedSpell.id, [], { centerIndex: cellIndex });
    } else if (cellCharacter) {
      // Tek hedefli büyü
      handleSpellCast(selectedSpell.id, [cellCharacter.id]);
    }
    return;
  }

  /* ---------- Hareket ---------- */
  if (
    movementMode &&
    selectedAttacker &&
    reachableCells.has(cellIndex)
  ) {
    handleMoveCharacter(cellIndex);
    return;
  }

  /* ---------- Karakter seçimi ---------- */
  if (cellCharacter?.player_id === currentUserId) {
      if (!isMyTurn) {
        alert('Sıra sizde değil!');
        return;
      }
      setSelectedAttacker(cellCharacter);
      setActionPointsRemaining(cellCharacter.action_points ?? 1);
    }
  };

  // --- Karakteri hareket ettir ---
  const handleMoveCharacter = async targetCell => {
  const entry = Object.entries(placements)
    .find(([_, ch]) => ch?.id === selectedAttacker.id);
  if (!entry) return;
  if (obstacles[targetCell]) {
    alert('Bu hücrede bir engel var.');
    return;
  }
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
  if (obstacles[targetCell]) {
    alert('Bu hücrede bir engel var.');
    return;
  }
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

  const attackerEntry = Object.entries(placements)
    .find(([_, u]) => u?.id === selectedAttacker.id);
  const targetEntry = Object.entries(placements)
    .find(([_, u]) => u?.id === targetCharacter.id);
  if (!attackerEntry || !targetEntry) return;
  const attackerIdx = Number(attackerEntry[0]);
  const targetIdx = Number(targetEntry[0]);
  if (!hasLineOfSight(attackerIdx, targetIdx, obstacles, GRID_SIZE)) {
    alert('Hedef engel arkasında!');
    return;
  }

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
      const weapon = selectedAttacker.melee_weapon;
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
  setObstacles(state.data.obstacles || {});
  setCurrentTurnIndex(state.data.current_turn_index || 0);
  if (state.data.background) setSelectedBg(state.data.background);


  setActionPointsRemaining(p => Math.max(0, p - 1));

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

    const attackerEntry = Object.entries(placements)
      .find(([_, u]) => u?.id === selectedAttacker.id);
    const targetEntry = Object.entries(placements)
      .find(([_, u]) => u?.id === targetCharacter.id);
    if (!attackerEntry || !targetEntry) return;
    const attackerIdx = Number(attackerEntry[0]);
    const targetIdx = Number(targetEntry[0]);
    if (!hasLineOfSight(attackerIdx, targetIdx, obstacles, GRID_SIZE)) {
      alert('Hedef engel arkasında!');
      return;
    }

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
      const weapon = selectedAttacker.ranged_weapon;
      const dexMod = Math.floor((selectedAttacker.dexterity - 10) / 2);
      const isCrit = apiMsg.includes('Kritik');
      const diceTotal = isCrit
        ? (dmg / 2 - dexMod)
        : (dmg - dexMod);

      let enrichedMsg;
      if (weapon) {
        enrichedMsg =
          `${apiMsg} (Silah: ${weapon.name}, Zar Dice: ${weapon.damage_dice}, Zar Toplamı: ${diceTotal}) (Kalan HP: ${leftHp})`;
      } else {
        const dice = selectedAttacker.ranged_dice || '1d4';
        enrichedMsg =
          `${apiMsg} (Zar Dice: ${dice}, Zar Toplamı: ${diceTotal}) (Kalan HP: ${leftHp})`;
      }

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
      setObstacles(state.data.obstacles || {});
      setCurrentTurnIndex(state.data.current_turn_index || 0);
      if (state.data.background) setSelectedBg(state.data.background);

      setActionPointsRemaining(p => Math.max(0, p - 1));

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

  // --- Spell Cast (tek hedef + alan) ---
const handleSpellCast = async (spellId, targetIds = [], extra = {}) => {
  if (!selectedAttacker) return;

   if (targetIds.length === 1) {
    const attackerEntry = Object.entries(placements)
      .find(([_, u]) => u?.id === selectedAttacker.id);
    const targetEntry = Object.entries(placements)
      .find(([_, u]) => u?.id === targetIds[0]);
    if (attackerEntry && targetEntry) {
      const attackerIdx = Number(attackerEntry[0]);
      const targetIdx = Number(targetEntry[0]);
      if (!hasLineOfSight(attackerIdx, targetIdx, obstacles, GRID_SIZE)) {
        alert('Hedef engel arkasında!');
        return;
      }
    }
  }

  try {
    /* ---------- 1) Alan etkili (“area”) büyü ---------- */
    if (selectedSpell?.scope === 'area' && typeof extra.centerIndex === 'number') {
      const centerIdx       = extra.centerIndex;
      const centerX         = centerIdx % GRID_SIZE;
      const centerY         = Math.floor(centerIdx / GRID_SIZE);

      // 3×3 hücredeki karakterleri bul
      const targetsInArea = Object.entries(placements)
        .filter(([idx, unit]) => {
          if (!unit) return false;           // hücre boşsa geç
          const index = +idx;                // string → number
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          return Math.abs(x - centerX) <= 1 && Math.abs(y - centerY) <= 1;
        })
        .map(([_, unit]) => unit);

      // Hedef yoksa boşa harcama yapma
      if (targetsInArea.length === 0) {
        alert('Bu alanda hedef yok.');
        return;
      }

      // Her hedefe tek tek POST /cast
      for (const tgt of targetsInArea) {
        const res = await api.post(`spells/${spellId}/cast/`, {
          attacker_id: selectedAttacker.id,
          targets:     [tgt.id],
          lobby_id:    lobbyId,
          spell_id:    spellId,
          spell_level: selectedSpell.level
        });

        const { message, results } = res.data;

        // Chat log’a ekle ve WS yayınla
        setChatLog(prev => {
          const next = [...prev, message];
          getBattleSocket()?.send(JSON.stringify({
            event:  'battleUpdate',
            lobbyId,
            chatLog: next
          }));
          return next;
        });

        // Placement HP güncelle
        if (results) {
          setPlacements(prev => {
            const next = { ...prev };
            Object.entries(results).forEach(([cid, hp]) => {
              const entry = Object.entries(prev).find(([_, c]) => c?.id === +cid);
              if (entry) next[entry[0]] = { ...entry[1], current_hp: hp };
            });
            return next;
          });
        }
      }
    }

    /* ---------- 2) Tek hedefli büyü ---------- */
    else if (targetIds.length) {
      const res = await api.post(`spells/${spellId}/cast/`, {
        attacker_id: selectedAttacker.id,
        targets:     targetIds,
        lobby_id:    lobbyId,
        spell_id:    spellId,
        spell_level: selectedSpell.level,
        ...extra
      });

      const { message, results } = res.data;

      setChatLog(prev => {
        const next = [...prev, message];
        getBattleSocket()?.send(JSON.stringify({
          event: 'battleUpdate',
          lobbyId,
          chatLog: next
        }));
        return next;
      });

      if (results) {
        setPlacements(prev => {
          const next = { ...prev };
          Object.entries(results).forEach(([cid, hp]) => {
            const entry = Object.entries(prev).find(([_, c]) => c?.id === +cid);
            if (entry) next[entry[0]] = { ...entry[1], current_hp: hp };
          });
          return next;
        });
      }
    }

    /* ---------- 3) Durum tazele ---------- */
    const state = await api.get(`battle-state/${lobbyId}/`);
  setInitiativeOrder(state.data.initiative_order);
  setPlacements(state.data.placements);
  setObstacles(state.data.obstacles || {});
  setCurrentTurnIndex(state.data.current_turn_index || 0);
  if (state.data.background) setSelectedBg(state.data.background);
  setActionPointsRemaining(p => Math.max(0, p - 1));
  setActionUsed(true);
  } catch (err) {
    console.error('Büyü kullanım hata:', err);
  }

  setSpellMode(false);
  setSelectedSpell(null);
  setSelectedAttacker(null);
};

// --- Spell seçimi ---
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
    if (typeof res.data.next_action_points === 'number') {
      setActionPointsRemaining(res.data.next_action_points);
    } else {
      setActionPointsRemaining(1);
    }
    

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

// --- Request dice roll from player ---
const handleRequestRoll = () => {
  setRollRequestMode(true);
};


  
  // --- End battle (GM) ---
const handleEndBattle = async () => {
  if (!isGM) return;                 // sadece GM

  // 1) Yerel UI: savaş modu kapansın
  setBattleStarted(false);

  

  // 3) (ops.) REST – sunucuya final bildirimi
  try {
    const res = await api.post("combat/end-battle/", { lobby_id: lobbyId });
    navigate(`/endbattle/${lobbyId}`, {
      state: { summary: res.data || null },
      replace: true,
    });
  } catch (err) {
    console.warn("REST combat/end-battle/ başarısız:", err);
  }

  
};
  
// Yeni mesaj sayısını güncelle
  useEffect(() => {
    if (!chatOpen) {
      setUnreadCount(c => c + 1);
    }
  }, [chatLog]);

  // Chat paneli açıldığında uyarıyı temizle
  const toggleChat = () => {
    setChatOpen(o => {
      if (!o) setUnreadCount(0);
      return !o;
    });
  };


  // --- Reachable hesapla ---
  useEffect(() => {
  if (!movementMode || !selectedAttacker || movementRemaining <= 0) {
      setReachableCells(new Set());
      return;
    }

  const entry = Object.entries(placements).find(
      ([_, c]) => c?.id === selectedAttacker.id,
    );
    if (!entry) {
      setReachableCells(new Set());
      return;
    }

  const origin = Number(entry[0]);
    const cells = new Set();

    const visited = new Set([origin]);
    const queue = [{ idx: origin, dist: 0 }];
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (queue.length > 0) {
      const { idx, dist } = queue.shift();
      if (dist === movementRemaining) continue;
      const x = idx % GRID_SIZE;
      const y = Math.floor(idx / GRID_SIZE);

      for (const { dx, dy } of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nIdx = ny * GRID_SIZE + nx;
        if (visited.has(nIdx)) continue;
        if (placements[nIdx]) continue; // occupied
        if (obstacles[nIdx]) continue;  // obstacle
        visited.add(nIdx);
        cells.add(nIdx);
        queue.push({ idx: nIdx, dist: dist + 1 });
      }
    }

    setReachableCells(cells);
  }, [movementMode, selectedAttacker, placements, obstacles, movementRemaining]);

/* ---------------------- RENDER ---------------------- */
if (!lobbyData) {
  return <div className="battle-container">Lobi bilgileri yükleniyor…</div>;
}
 if (!battleStarted) {
    if (isGM) {
      return (
        <BattleSetup
          isGM={isGM}
          lobbyId={lobbyId}
          characters={allCharacters}
          placements={placements}
          obstacles={obstacles}
          setObstacles={setObstacles}
          availableCharacters={availableCharacters}
          availableCreatures={availableCreatures}
          gridSize={GRID_SIZE}
          totalCells={TOTAL_CELLS}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onStartBattle={handleStartBattle}
          setSelectedBg={setSelectedBg}
          selectedBg={selectedBg}
  
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
          obstacles={obstacles}
          reachableCells={reachableCells}
          rangedReachableCells={rangedReachableCells}
          gridSize={GRID_SIZE}
          totalCells={TOTAL_CELLS}
          moving={moving}
          currentUserId={currentUserId}
          onCellClick={handleCellClick}
          spellMode={spellMode}
          selectedSpell={selectedSpell}
          aoeHoverCell={aoeHoverCell}
          onCellHover={setAoeHoverCell}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          backgroundImage={selectedBg} 
          
          
        />
        {/* ---------- Sol Olay/Aksiyon Paneli ---------- */}
      <div className="left-panel">
        {/* — Sıra Gösterimi — */}
        <div className="turn-order">
          <strong>Sıra:</strong>
          {initiativeOrder.map((entry, idx) => (
            <span
              key={entry.character_id}
              className={idx === currentTurnIndex ? 'current-turn' : ''}
            >
              {entry.name}
            </span>
          ))}
        </div>

         {/* —— Olay Log’u —— */}
        <h3 className="left-panel-header">Olaylar</h3>
        <div className="event-log">
          {chatLog.map((msg, i) => (
            <div key={i} className="event-item">{msg}</div>
          ))}
        </div>

   {/* —— Aksiyon Butonları (sıra sizdeyse) —— */}
       {isMyTurn && (
          <div className="actions-container">
            <BattleActions
              selectedAttacker={selectedAttacker}
              attackMode={attackMode}
              attackType={attackType}
              spellMode={spellMode}
              selectedSpell={selectedSpell}
              availableSpells={selectedAttacker?.prepared_spells}
              movementRemaining={movementRemaining}
              actionUsed={actionUsed}
              actionPointsRemaining={actionPointsRemaining}

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
              
            />
          </div>
        )}
        {isGM && (
          <GMPanel
            onEndBattle={handleEndBattle}
            onRequestRoll={handleRequestRoll}
            requestRollMode={rollRequestMode}
          />
        )}
      </div>

      </div>
      {/* — Chat Toggle Butonu — */}
      <button className="chat-toggle" onClick={toggleChat}>
   {/* kapalıyken “Chat” yaz, açıkken çarpı göster */}
   {chatOpen ? '✖' : 'Chat'}
   {/* yalnızca kapalıyken ve okunmamış var ise badge */}
   {!chatOpen && unreadCount > 0 && (
     <span className="chat-badge">{unreadCount}</span>
   )}
 </button>
      <div className={`chat-panel ${chatOpen ? 'open' : 'closed'}`}>
        <BattleChat
        // Event log satırlarını (→ içeren) sondan ele
        chatLog={chatLog.filter(m => !m.includes('→'))}
        onSendMessage={msg => {
          const updatedLog = [...chatLog, msg];
          setChatLog(updatedLog);
          // yine tamamını gönderiyorsunuz, ama BattleChat’e
          // sadece filtrelenmişini iletmiş olacağız
          getBattleSocket().send(JSON.stringify({
            event: "battleUpdate",
            lobbyId,
            chatLog: updatedLog,
          }));
        }}
      />
      </div>
    
      
    </div>
    <DiceRollModal
      visible={diceVisible}
      onRoll={() => {
        setDiceRolling(true);
        getBattleSocket().send(JSON.stringify({
          event: 'diceRoll',
          playerId: currentUserId,
        }));
      }}
      onClose={() => { setDiceVisible(false); setDiceResult(null); setDiceRequester(null); }}
      isRolling={diceRolling}
      result={diceResult}
      canRoll={diceRequester === Number(currentUserId)}
    />
    {/* ---------- Karakter Detay Paneli ---------- */}
     {selectedCharacter && (
       <div className="char-detail-panel">
         <button
           className="close-btn"
           onClick={() => setSelectedCharacter(null)}
         >✖</button>

         <h2>{selectedCharacter.name}</h2>
         <p><strong>HP:</strong> {selectedCharacter.hp} / {selectedCharacter.maxHp}</p>
         <p><strong>AC:</strong> {selectedCharacter.ac}</p>
         <p>
           <strong>Str:</strong> {selectedCharacter.strength}&nbsp;
           <strong>Dex:</strong> {selectedCharacter.dexterity}&nbsp;
           <strong>Con:</strong> {selectedCharacter.constitution}
         </p>
         {/* İstersen buraya daha fazla stat ekleyebilirsin */}
       </div>
     )}
  </>
);
}
