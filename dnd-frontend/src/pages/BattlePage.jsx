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

const GRID_SIZE   = 20;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

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

  // --- WebSocket battle events ---
  useEffect(() => {
    if (!lobbyId) return;
    const handler = e => {
      try {
        const d = JSON.parse(e.data);
        if (String(d.lobbyId) !== String(lobbyId)) return;
        switch (d.event) {

          case 'battleStart':
            setBattleStarted(true);
            // Tur başında seçili değilse movementMode kapat
            setMovementMode(false);
            setAttackMode(false);
            setSpellMode(false);
            // Eğer sırası sizde ise haklarınızı setleyin
            const turn0 = d.initiativeOrder?.[0];
            if (turn0?.character_id === selectedAttacker?.id) {
              const dexMod = Math.floor((selectedAttacker.dexterity - 10)/2) || 0;
              setMovementRemaining(2 + dexMod);
              setActionUsed(false);
            }
            break;

          case 'battleEnd':
            setBattleStarted(false);
            break;

          case 'battleUpdate':
            if (d.placements)      setPlacements(d.placements);
            if (d.initiativeOrder) setInitiativeOrder(d.initiativeOrder);

            // Eğer yeni tur gelmişse
            if (d.current_turn_index !== undefined && d.current_turn_index !== currentTurnIndex) {
              setCurrentTurnIndex(d.current_turn_index);
              // Tüm modları kapat
              setMovementMode(false);
              setAttackMode(false);
              setSpellMode(false);
              // Eğer yeni kişinin sırası sizde ise hakları setle
              const entry = d.initiativeOrder[d.current_turn_index];
              if (entry?.character_id === selectedAttacker?.id) {
                const dexMod = Math.floor((selectedAttacker.dexterity - 10)/2) || 0;
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
      } catch(err) {
        console.error("Socket mesaj işleme hata:", err);
      }
    };
    const sock = createBattleSocket(lobbyId, handler);
    return () => {
      sock.removeEventListener('message', handler);
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


  // --- Savaş başlat (GM) ---
  const handleStartBattle = async () => {
    if (!isGM) return;
    try {
      const res = await api.post('combat/initiate/', {
        lobby_id: lobbyId,
        character_ids: allCharacters.map(c => c.id),
        placements,
        available_characters: availableCharacters.map(c => c.id)
      });
      const init = res.data.initiative_order;
      getBattleSocket().send(JSON.stringify({
        event: 'battleStart',
        lobbyId,
        placements,
        initiativeOrder: init
      }));
      setInitiativeOrder(init);
      setCurrentTurnIndex(0);
      setBattleStarted(true);
    } catch(err) {
      console.error("Savaş başlatma hata:", err);
    }
  };

  // --- Drag & Drop ---
  const handleDragStart = (e, character, source, sourceIndex) => {
    e.dataTransfer.setData('text/plain',
      JSON.stringify({ character, source, sourceIndex }));
  };
  const handleDragOver = e => e.preventDefault();
  const handleDrop = (e, cellIndex) => {
    e.preventDefault();
    const { character, source, sourceIndex } = JSON.parse(
      e.dataTransfer.getData('text/plain')
    );
    const next = { ...placements };
    if (source === 'grid') next[sourceIndex] = undefined;
    if (next[cellIndex]) {
      setAvailableCharacters(prev => [...prev, next[cellIndex]]);
    }
    next[cellIndex] = character;
    setPlacements(next);
    getBattleSocket().send(JSON.stringify({
      event: 'battleUpdate',
      lobbyId,
      placements: next
    }));
  };

  // --- Hücre tıklama: önce saldırı/büyü then hareket ---
  const handleCellClick = (cellIndex, cellCharacter) => {
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

  // --- Melee Attack ---
   // --- Melee Attack ---
  const handleMeleeAttack = async targetCharacter => {
    if (!selectedAttacker || !targetCharacter) return;

    try {
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

      // Mesajı zenginleştir
      const weapon = selectedAttacker.main_hand || selectedAttacker.off_hand;
      const strMod = Math.floor((selectedAttacker.strength - 10) / 2);
      const isCrit = apiMsg.includes('Kritik');
      const diceTotal = isCrit
        ? (dmg / 2 - strMod)
        : (dmg - strMod);

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
        console.log('[BattlePage] Yakın dövüş hatası:', err.response.data.error);
      } else {
        console.error('Yakın dövüş hata:', err);
      }
    }

    // Modları sıfırla, yeniden saldırıya izin versin
    setAttackMode(false);
    setAttackType(null);
    setSelectedAttacker(null);
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
      .find(([_,c])=>c?.id===selectedAttacker.id);
    if (!entry) { setReachableCells(new Set()); return; }
    const originIdx = Number(entry[0]);
    const row = Math.floor(originIdx/GRID_SIZE), col = originIdx%GRID_SIZE;
    const range = movementRemaining;
    const cells = new Set();
    for (let i=0; i<TOTAL_CELLS; i++){
      if (placements[i]) continue;
      const r=Math.floor(i/GRID_SIZE), c=i%GRID_SIZE;
      if (Math.abs(r-row)+Math.abs(c-col) <= range) cells.add(i);
    }
    setReachableCells(cells);
  }, [movementMode, selectedAttacker, placements, movementRemaining]);

  if (!lobbyData) {
    return <div className="battle-container">Lobi bilgileri yükleniyor…</div>;
  }
  if (!battleStarted) {
    return (
      <div className="battle-container">
        {isGM ? (
          <BattleSetup
            isGM={isGM}
            characters={allCharacters}
            placements={placements}
            availableCharacters={availableCharacters}
            gridSize={GRID_SIZE}
            totalCells={TOTAL_CELLS}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onStartBattle={handleStartBattle}
          />
        ) : (
          <div className="waiting">GM karakterleri yerleştiriyor, lütfen bekleyin…</div>
        )}
      </div>
    );
  }
  return (
    <div className="battle-container">
      <BattleMap
        placements={placements}
        reachableCells={reachableCells}
        rangedReachableCells={rangedReachableCells}  // ← bu satırı ekleyin
        gridSize={GRID_SIZE}
        totalCells={TOTAL_CELLS}
        moving={moving}
        currentUserId={currentUserId}
        onCellClick={handleCellClick}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      <BattleActions
        selectedAttacker={selectedAttacker}
        attackMode={attackMode}
        attackType={attackType}
        spellMode={spellMode}
        selectedSpell={selectedSpell}
        availableSpells={selectedAttacker?.prepared_spells}
        movementRemaining={movementRemaining}
        actionUsed={actionUsed}
        onChooseMelee={() => { setAttackMode(true); setAttackType('melee'); setSpellMode(false); setMovementMode(false); }}
        onChooseRanged={() => { setAttackMode(true); setAttackType('ranged'); setSpellMode(false); setMovementMode(false); }}
        onChooseSpell={() => { setSpellMode(true); setAttackMode(false); setAttackType(null); setMovementMode(false); }}
        onChooseMove={() => { setMovementMode(true); setAttackMode(false); setSpellMode(false); setAttackType(null); }}
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
          setChatLog(prev => [...prev, msg]);
          getBattleSocket().send(JSON.stringify({
            event:'battleUpdate',
            lobbyId,
            chatLog: [...chatLog, msg]
          }));
        }}
      />
    </div>
  );
}
