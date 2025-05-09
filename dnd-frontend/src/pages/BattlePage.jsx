// src/pages/BattlePage.jsx
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
  const [lobbyId, setLobbyId]                   = useState(null);
  const [lobbyData, setLobbyData]               = useState(null);
  const [isGM, setIsGM]                         = useState(false);
  const [allCharacters, setAllCharacters]       = useState([]);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [placements, setPlacements]             = useState({});
  const [battleStarted, setBattleStarted]       = useState(false);
  const [initiativeOrder, setInitiativeOrder]   = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [attackMode, setAttackMode]             = useState(false);
  const [spellMode, setSpellMode]               = useState(false);
  const [selectedSpell, setSelectedSpell]       = useState(null);
  const [reachableCells, setReachableCells]     = useState(new Set());
  const [moving, setMoving]                     = useState(false);
  const [chatLog, setChatLog]                   = useState([]);

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

  // --- Karakterleri nested route üzerinden çek ---
  useEffect(() => {
    if (!lobbyId) return;
    api.get(`lobbies/${lobbyId}/characters/`)
      .then(res => setAllCharacters(res.data))
      .catch(err => console.error("Karakterler çekme hata:", err));
  }, [lobbyId]);

  // --- Henüz yerleştirilmemiş karakterleri availableCharacters olarak ayarla ---
  useEffect(() => {
    const placedIds = Object.values(placements).filter(Boolean).map(c => c.id);
    setAvailableCharacters(allCharacters.filter(c => !placedIds.includes(c.id)));
  }, [allCharacters, placements]);

  // --- WebSocket joinLobby listener ---
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

  // --- Battle-state polling her 3s’de bir (chatLog’u merge et) ---
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
              // sadece yeni mesajları ekle
              const news = d.chat_log.filter(m => !prev.includes(m));
              return prev.concat(news);
            });
          }
        })
        .catch(err => console.error("Battle state fetch hata:", err));
    }, 3000);
    return () => clearInterval(iv);
  }, [lobbyId, battleStarted]);

  // --- WebSocket battle event listener (chatLog’u merge et) ---
  useEffect(() => {
    if (!lobbyId) return;
    const handler = e => {
      try {
        const d = JSON.parse(e.data);
        if (String(d.lobbyId) !== String(lobbyId)) return;
        // güncellemeleri işle
        switch (d.event) {
          case 'battleStart':
            setBattleStarted(true);
            break;
          case 'battleEnd':
            setBattleStarted(false);
            break;
          case 'battleUpdate':
            if (d.placements)      setPlacements(d.placements);
            if (d.initiativeOrder) setInitiativeOrder(d.initiativeOrder);
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
      try {
        sock.removeEventListener('message', handler);
        sock.close();
      } catch {}
    };
  }, [lobbyId]);

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

  // --- Hücre tıklama: saldırı/büyü önce, sonra hareket ---
  const handleCellClick = (cellIndex, cellCharacter) => {
    if (attackMode && selectedAttacker && cellCharacter) {
      handleMeleeAttack(cellCharacter);
      return;
    }
    if (spellMode && selectedAttacker && selectedSpell && cellCharacter) {
      handleSpellCast(selectedSpell.id, [cellCharacter.id]);
      return;
    }
    if (selectedAttacker && reachableCells.has(cellIndex)) {
      handleMoveCharacter(cellIndex);
      return;
    }
    if (cellCharacter?.player_id === currentUserId) {
      if (
        initiativeOrder.length > 0 &&
        cellCharacter.id === initiativeOrder[currentTurnIndex]?.character_id
      ) {
        setSelectedAttacker(cellCharacter);
      } else {
        alert('Sıra sizde değil!');
      }
    }
  };

  // --- Karakteri hareket ettir ---
  const handleMoveCharacter = async targetCell => {
    const next = { ...placements };
    const currentEntry = Object.entries(placements)
      .find(([_, ch]) => ch?.id === selectedAttacker.id);
    if (currentEntry) next[currentEntry[0]] = undefined;
    next[targetCell] = selectedAttacker;
    setPlacements(next);
    setMoving(true);
    try {
      await api.post('combat/move/', {
        lobby_id: lobbyId,
        placements: next
      });
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
    setSelectedAttacker(null);
    setReachableCells(new Set());
  };

  // --- Yakın dövüş saldırısı ---
  const handleMeleeAttack = async targetCharacter => {
    if (!selectedAttacker || !targetCharacter) return;
    try {
      const res = await api.post('combat/melee-attack/', {
        attacker_id: selectedAttacker.id,
        target_id: targetCharacter.id,
        lobby_id: lobbyId
      });
      const dmg    = res.data.damage;
      const leftHp = res.data.target_remaining_hp;
      const msg    = `${selectedAttacker.name} yakın dövüşte ${targetCharacter.name}'e ${dmg} hasar verdi (Kalan HP: ${leftHp}).`;
      console.log('[BattlePage] Melee attack:', msg);
      // chatLog’a ekle ve socket’le bildir
      setChatLog(prev => {
        const next = [...prev, msg];
        getBattleSocket().send(JSON.stringify({
          event: 'battleUpdate',
          lobbyId,
          chatLog: next
        }));
        return next;
      });
      // state’i yenile
      const state = await api.get(`battle-state/${lobbyId}/`);
      setInitiativeOrder(state.data.initiative_order);
      setPlacements(state.data.placements);
      setCurrentTurnIndex(state.data.current_turn_index || 0);
    } catch(err) {
      console.error("Yakın dövüş hata:", err);
    }
    setAttackMode(false);
    setSelectedAttacker(null);
  };

  // --- Büyü kullan ---
  const handleSpellCast = async (spellId, targetIds, extra = {}) => {
    if (!selectedAttacker || !targetIds.length) return;
    try {
      const res = await api.post(`spells/${spellId}/cast/`, {
        attacker_id: selectedAttacker.id,
        targets: targetIds,
        lobby_id: lobbyId,
        ...extra
      });
      const message = res.data.message;
      const results = res.data.results;
  
      console.log('[BattlePage] Spell cast:', message);
      setChatLog(prev => {
        const next = [...prev, message];
        getBattleSocket().send(JSON.stringify({
          event: 'battleUpdate',
          lobbyId,
          chatLog: next
        }));
        return next;
      });
  
      // Eğer sonuçlar geldiyse, hücrelerdeki HP değerlerini güncelle
      if (results) {
        setPlacements(prev => {
          const next = { ...prev };
          Object.entries(results).forEach(([charId, hp]) => {
            const entry = Object.entries(prev).find(([_, char]) => char?.id === Number(charId));
            if (entry) {
              const [cellIdx, char] = entry;
              next[cellIdx] = { ...char, current_hp: hp };
            }
          });
          return next;
        });
      }
  
      // Güncel battle-state’i yeniden çek ve state’leri güncelle
      const state = await api.get(`battle-state/${lobbyId}/`);
      setInitiativeOrder(state.data.initiative_order);
      setPlacements(state.data.placements);
      setCurrentTurnIndex(state.data.current_turn_index || 0);
  
    } catch(err) {
      console.error("Büyü kullanım hata:", err);
    }
  
    setSpellMode(false);
    setSelectedSpell(null);
    setSelectedAttacker(null);
  };

  // --- Büyü seç ---
  const handleSelectSpell = spell => {
    setSelectedSpell(spell);
    setAttackMode(false);
  };

  // --- Tur sonlandır ---
  const handleEndTurn = async () => {
    try {
      const res = await api.post('combat/end-turn/', { lobby_id: lobbyId });
      const newOrder     = res.data.initiative_order;
      const newPlacements = res.data.placements;
      getBattleSocket().send(JSON.stringify({
        event: 'battleUpdate',
        lobbyId,
        initiativeOrder: newOrder,
        placements: newPlacements
      }));
      setInitiativeOrder(newOrder);
      setPlacements(newPlacements);
    } catch(err) {
      console.error("Tur sonlandırma hata:", err);
    }
    setAttackMode(false);
    setSpellMode(false);
    setSelectedAttacker(null);
    setSelectedSpell(null);
  };

  // --- Savaşı sonlandır (GM) ---
  const handleEndBattle = () => {
    getBattleSocket().send(JSON.stringify({ event: 'battleEnd', lobbyId }));
  };

  // --- Mesaj gönder ---
  const handleSendMessage = message => {
    const newLog = [...chatLog, message];
    setChatLog(newLog);
    getBattleSocket().send(JSON.stringify({
      event: 'battleUpdate',
      lobbyId,
      chatLog: newLog
    }));
  };

  // --- Reachable hücreleri hesapla (dolu hücreleri eledik) ---
  useEffect(() => {
    if (!selectedAttacker) {
      setReachableCells(new Set());
      return;
    }
    const entry = Object.entries(placements)
      .find(([_, c]) => c?.id === selectedAttacker.id);
    if (!entry) return;
    const originIdx = Number(entry[0]);
    const row = Math.floor(originIdx / GRID_SIZE);
    const col = originIdx % GRID_SIZE;
    const dex = selectedAttacker.dexterity || 10;
    const range = 2 + Math.floor((dex - 10) / 2);
    const cells = new Set();
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const r = Math.floor(i / GRID_SIZE);
      const c = i % GRID_SIZE;
      const manh = Math.abs(r - row) + Math.abs(c - col);
      if (manh <= range && !placements[i]) {
        cells.add(i);
      }
    }
    setReachableCells(cells);
  }, [selectedAttacker, placements]);

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
          <div className="waiting">
            GM karakterleri yerleştiriyor, lütfen bekleyin…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="battle-container">
      <BattleMap
        placements={placements}
        reachableCells={reachableCells}
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
        spellMode={spellMode}
        selectedSpell={selectedSpell}
        availableSpells={selectedAttacker?.prepared_spells}
        onChooseMelee={() => { setAttackMode(true); setSpellMode(false); }}
        onChooseSpell={() => { setSpellMode(true); setAttackMode(false); }}
        onSelectSpell={handleSelectSpell}
        onCancel={() => {
          setSelectedAttacker(null);
          setAttackMode(false);
          setSpellMode(false);
          setSelectedSpell(null);
        }}
        onEndTurn={handleEndTurn}
        onEndBattle={handleEndBattle}
        isGM={isGM}
      />
      <BattleChat
        initiativeOrder={initiativeOrder}
        currentTurnIndex={currentTurnIndex}
        chatLog={chatLog}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
