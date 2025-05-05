// src/components/Battle.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { createBattleSocket, getBattleSocket } from '../services/battleSocket.js';

const gridSize = 20; // 20x20 grid
const totalCells = gridSize * gridSize;

const Battle = () => {
  // --- LOBBY ID YÖNETİMİ BAŞLANGIÇ ---
  const { id } = useParams();
  // Tarayıcıda 'lobby_id' olarak saklanan değeri (veya URL parametresini) al
  const [lobbyId, setLobbyId] = useState(() =>
    sessionStorage.getItem('lobby_id') ||
    localStorage.getItem('lobby_id') ||
    id ||
    null
  );

  // URL’deki id değiştiğinde hem state’e hem de depolamaya yaz
  useEffect(() => {
    if (id && id !== lobbyId) {
      sessionStorage.setItem('lobby_id', id);
      localStorage.setItem('lobby_id', id);
      setLobbyId(id);
    }
  }, [id, lobbyId]);

  // -------------- 2. YÖNTEM: NULL-GUARD İLE joinLobby HANDLER --------------
  useEffect(() => {
    const socket = getBattleSocket();
    if (!socket) {
      console.warn('Socket henüz hazır değil, joinLobby handler eklenemedi.');
      return;
    }

    const joinLobbyHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'joinLobby' && data.lobbyId) {
          sessionStorage.setItem('lobby_id', data.lobbyId);
          localStorage.setItem('lobby_id', data.lobbyId);
          setLobbyId(data.lobbyId);
        }
      } catch (e) {
        console.error('joinLobby mesajı işlenirken hata:', e);
      }
    };

    socket.addEventListener('message', joinLobbyHandler);
    return () => {
      socket.removeEventListener('message', joinLobbyHandler);
    };
  }, []); // boş bağımlılık, sadece mount/unmount

  console.log("Battle.js - lobbyId:", lobbyId);

  // --- LOBBY VERİLERİNİ ÇEKME ---
  const [lobbyData, setLobbyData] = useState(null);
  const [isGM, setIsGM] = useState(false);
  const [allCharacters, setAllCharacters] = useState([]);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [placements, setPlacements] = useState({});
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleActive, setBattleActive] = useState(false);

  // Initiative ve tur bilgisi
  const [initiativeOrder, setInitiativeOrder] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Aksiyon seçimi
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [attackMode, setAttackMode] = useState(false);
  const [spellMode, setSpellMode]   = useState(false);
  const [selectedSpell, setSelectedSpell] = useState(null);

  // Hareket menzili
  const [reachableCells, setReachableCells] = useState(new Set());
  const [moving, setMoving] = useState(false);

  // Chat log
  const [chatLog, setChatLog] = useState([]);

  const currentUserId = parseInt(localStorage.getItem("user_id") || '0', 10);

  // --- Melee attack ve spell fonksiyonları ---
  const handleMeleeAttack = async (targetCharacter) => {
    if (!selectedAttacker || !targetCharacter) return;
    try {
      const response = await api.post('combat/melee-attack/', {
        attacker_id: selectedAttacker.id,
        target_id: targetCharacter.id,
        lobby_id: lobbyId
      });
      const damage = response.data.damage;
      const targetRemainingHp = response.data.target_remaining_hp;
      const newMessage = `${selectedAttacker.name} ${targetCharacter.name}'e yakın dövüş saldırısı yaptı ve ${damage} hasar verdi (Kalan HP: ${targetRemainingHp}).`;
      const updatedChatLog = [...chatLog, newMessage];
      setChatLog(updatedChatLog);
      getBattleSocket().send(JSON.stringify({
        event: "battleUpdate",
        lobbyId,
        chatLog: updatedChatLog
      }));
      const stateResponse = await api.get(`battle-state/${lobbyId}/`);
      if (stateResponse.data) {
        setInitiativeOrder(stateResponse.data.initiative_order);
        setPlacements(stateResponse.data.placements);
        setAvailableCharacters(stateResponse.data.available_characters);
        setCurrentTurnIndex(stateResponse.data.current_turn_index || 0);
      }
      setSelectedAttacker(null);
      setAttackMode(false);
      setReachableCells(new Set());
    } catch (error) {
      console.error("Yakın dövüş saldırısı işlemi sırasında hata:", error);
    }
  };

  const handleSpellCast = async (spellKey, targetIds, extraData = {}) => {
    if (!selectedAttacker || !targetIds?.length) return;
    try {
      const response = await api.post(`spells/${spellKey}/cast/`, {
        attacker_id: selectedAttacker.id,
        targets: targetIds,
        lobby_id: lobbyId,
        ...extraData
      });
      const { message, results } = response.data;
      setChatLog(prev => [...prev, message]);
      if (results) {
        setPlacements(prev => {
          const next = { ...prev };
          Object.entries(results).forEach(([charId, hp]) => {
            const cellIndex = Object.entries(prev)
              .find(([_, ch]) => ch?.id === Number(charId))?.[0];
            if (cellIndex != null) {
              next[cellIndex] = {
                ...prev[cellIndex],
                hp
              };
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Spell cast error:", err);
    }
  };

  // Spell handler’ları
  const handleMagicMissile = (t) => handleSpellCast('magic-missile', t);
  const handleFireball     = (t) => handleSpellCast('fireball', t);
  // … diğer handle* fonksiyonları …

  // --- Polling, start/end battle, socket event listener’lar vs. ---
  useEffect(() => {
    if (!battleStarted) return;
    const interval = setInterval(() => {
      api.get(`battle-state/${lobbyId}/`)
         .then(res => {
           if (res.data) {
             setInitiativeOrder(res.data.initiative_order);
             setPlacements(res.data.placements);
             setAvailableCharacters(res.data.available_characters);
             setCurrentTurnIndex(res.data.current_turn_index || 0);
             if (res.data.chat_log) setChatLog(res.data.chat_log);
           }
         })
         .catch(err => console.error("Battle state fetch error:", err));
    }, 3000);
    return () => clearInterval(interval);
  }, [lobbyId, battleStarted]);

  const handleStartBattle = async () => {
    if (!isGM) return;
    try {
      const res = await api.post('combat/initiate/', {
        lobby_id: lobbyId,
        character_ids: allCharacters.map(ch => ch.id),
        placements,
        available_characters: availableCharacters
      });
      const initOrder = res.data.initiative_order;
      getBattleSocket().send(JSON.stringify({
        event: "battleStart",
        lobbyId,
        placements,
        availableCharacters,
        initiativeOrder: initOrder
      }));
      setInitiativeOrder(initOrder);
      setCurrentTurnIndex(0);
      setBattleStarted(true);
    } catch (err) {
      console.error("Battle start hatası:", err);
    }
  };

  const handleEndBattle = () => {
    getBattleSocket().send(JSON.stringify({ event: "battleEnd", lobbyId }));
  };

  // Socket battleEvent listener
  useEffect(() => {
    if (!lobbyId) {
      console.warn("lobbyId yok, socket başlatılamıyor.");
      return;
    }

    const handleSocketMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Number(data.lobbyId) !== Number(lobbyId)) return;
        switch (data.event) {
          case "battleStart":
            setBattleStarted(true);
            setBattleActive(true);
            break;
          // … diğer event’ler …
          default:
            break;
        }
      } catch (err) {
        console.error("Socket mesajı çözümlenemedi:", err);
      }
    };

    const socket = createBattleSocket(lobbyId, handleSocketMessage);
    if (!socket) {
      console.warn("createBattleSocket null döndü.");
      return;
    }

    return () => {
      try {
        socket.removeEventListener('message', handleSocketMessage);
        socket.close();
      } catch (err) {
        console.warn("Event listener kaldırılamadı:", err);
      }
    };
  }, [lobbyId]);

  // Lobi verisini çekme
  useEffect(() => {
    const fetchLobbyData = async () => {
      try {
        const res = await api.get(`lobbies/${lobbyId}/`);
        setLobbyData(res.data);
        setIsGM(res.data.gm_player === currentUserId);
      } catch (err) {
        console.error("Lobi verileri alınırken hata:", err);
      }
    };
    if (lobbyId) fetchLobbyData();
  }, [lobbyId, currentUserId]);

  // Karakterleri çekme
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const res = await api.get(`lobbies/${lobbyId}/characters/`);
        setAllCharacters(res.data);
      } catch (err) {
        console.error("Karakterler alınırken hata:", err);
      }
    };
    if (lobbyId) fetchCharacters();
  }, [lobbyId]);

  // availableCharacters filtresi
  useEffect(() => {
    const placedIds = Object.values(placements)
      .filter(Boolean)
      .map(ch => ch.id);
    const notPlaced = allCharacters.filter(ch => !placedIds.includes(ch.id));
    setAvailableCharacters(notPlaced);
  }, [allCharacters, placements]);

  // Seçilen saldıran değişince reachableCells hesapla
  useEffect(() => {
    if (selectedAttacker) {
      let attackerIndex = null;
      Object.entries(placements).forEach(([key, ch]) => {
        if (ch && ch.id === selectedAttacker.id) {
          attackerIndex = Number(key);
        }
      });
      if (attackerIndex === null) return;
      const row = Math.floor(attackerIndex / gridSize);
      const col = attackerIndex % gridSize;
      const dex = selectedAttacker.dexterity || 10;
      const moveRange = 2 + Math.floor((dex - 10) / 2);
      const newReachable = new Set();
      for (let i = 0; i < totalCells; i++) {
        const r = Math.floor(i / gridSize);
        const c = i % gridSize;
        if (Math.abs(r - row) + Math.abs(c - col) <= moveRange) {
          newReachable.add(i);
        }
      }
      setReachableCells(newReachable);
    } else {
      setReachableCells(new Set());
    }
  }, [selectedAttacker, placements]);

  // Hareket fonksiyonu
  const handleMoveCharacter = async (targetCell) => {
    const newPlacements = { ...placements };
    const currentCell = Object.entries(placements)
      .find(([_, ch]) => ch?.id === selectedAttacker.id)?.[0];
    if (currentCell != null) newPlacements[currentCell] = undefined;
    newPlacements[targetCell] = selectedAttacker;
    setPlacements(newPlacements);
    setMoving(true);
    try {
      await api.post('combat/move/', {
        lobby_id: lobbyId,
        placements: newPlacements
      });
    } catch (err) {
      console.error("Move update error:", err);
    }
    setTimeout(() => {
      setMoving(false);
      setSelectedAttacker(null);
      setAttackMode(false);
    }, 500);
  };

  // Drag & drop
  const handleDragStart = (e, character, source, sourceIndex) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ character, source, sourceIndex }));
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, cellIndex) => {
    e.preventDefault();
    const { character, source, sourceIndex } =
      JSON.parse(e.dataTransfer.getData("text/plain"));
    const newPlacements = { ...placements };
    if (source === "grid") {
      newPlacements[sourceIndex] = undefined;
    }
    if (newPlacements[cellIndex]) {
      setAvailableCharacters(prev => [...prev, newPlacements[cellIndex]]);
    }
    newPlacements[cellIndex] = character;
    setPlacements(newPlacements);
    if (source === "available") {
      setAvailableCharacters(prev =>
        prev.filter(ch => ch.id !== character.id)
      );
    }
    getBattleSocket().send(JSON.stringify({
      event: "battleUpdate",
      lobbyId,
      placements: newPlacements,
      availableCharacters: availableCharacters.filter(ch => ch.id !== character.id)
    }));
  };

  // Hücreleri oluştur
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const cellCharacter = placements[i];
    return (
      <div
        key={i}
        onDragOver={handleDragOver}
        onDrop={e => handleDrop(e, i)}
        style={{
          border: '1px solid #ccc',
          width: '35px',
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: cellCharacter ? '#90ee90' : '#fff',
          cursor: cellCharacter ? 'pointer' : 'default',
          boxShadow: reachableCells.has(i) ? '0 0 0 2px green' : 'none'
        }}
        onClick={() => {
          // 1) Hareket modu
          if (
            selectedAttacker &&
            !attackMode &&
            !spellMode &&
            !cellCharacter &&
            reachableCells.has(i)
          ) {
            handleMoveCharacter(i);
            return;
          }
  
          // 2) Melee saldırı modu
          if (
            attackMode &&
            selectedAttacker &&
            cellCharacter &&
            cellCharacter.id !== selectedAttacker.id
          ) {
            handleMeleeAttack(cellCharacter);
            return;
          }
  
          // 3) Büyü hedef seçimi modu
          if (
            spellMode &&
            selectedSpell &&
            cellCharacter
          ) {
            handleSpellCast(selectedSpell.id, [cellCharacter.id]);
            return;
          }
  
          // 4) Karakter seçimi (initiative sırası)
          if (
            cellCharacter &&
            initiativeOrder.length > 0
          ) {
            const current = initiativeOrder[currentTurnIndex];
            if (cellCharacter.player_id !== currentUserId) return;
            if (cellCharacter.id === current.character_id) {
              setSelectedAttacker(cellCharacter);
            } else {
              alert('Sıra sizde değil!');
            }
          }
        }}
      >
        {cellCharacter && (
          <div
            draggable={isGM}
            onDragStart={e => handleDragStart(e, cellCharacter, 'grid', i)}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              textAlign: 'center',
              padding: '2px',
              border:
                cellCharacter.player_id === currentUserId
                  ? '2px solid blue'
                  : 'none',
              transition: moving ? 'transform 0.5s ease' : 'none',
              transform: moving ? 'translateY(-10px)' : 'none'
            }}
          >
            {cellCharacter.name}
          </div>
        )}
      </div>
    );
  });

  const handleEndTurn = async () => {
    try {
      const res = await api.post('combat/end-turn/', { lobby_id: lobbyId });
      const newOrder = res.data.initiative_order;
      getBattleSocket().send(JSON.stringify({
        event: "battleUpdate",
        lobbyId,
        initiativeOrder: newOrder,
        placements: res.data.placements
      }));
      setInitiativeOrder(newOrder);
    } catch (err) {
      console.error("Turn end error:", err);
    }
  };

  const availableList = availableCharacters.map(ch => (
    <div key={ch.id}
         onClick={() => {
           if (attackMode && selectedAttacker) {
             handleMeleeAttack(ch);
             return;
           }
           if (ch.player_id !== currentUserId) return;
           if (initiativeOrder.length > 0 && ch.id === initiativeOrder[currentTurnIndex].character_id) {
             setSelectedAttacker(ch);
           } else {
             alert("Sıra sizde değil!");
           }
         }}
         draggable={isGM}
         onDragStart={(e) => handleDragStart(e, ch, "available")}
         style={{
           width: '40px',
           height: '40px',
           borderRadius: '50%',
           backgroundColor: '#2196F3',
           color: '#fff',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           margin: '5px',
           cursor: 'grab',
           fontSize: '10px',
           textAlign: 'center',
           padding: '2px',
           border: ch.player_id === currentUserId ? '2px solid blue' : 'none'
         }}>
      {ch.name}
    </div>
  ));

  const renderTurnEndButton = () => (
    <button onClick={handleEndTurn}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
      Turn End
    </button>
  );

  const renderActionPanel = () => {
    if (!selectedAttacker) return null;
  
    return (
      <div style={{
        margin: '20px 0',
        padding: '10px',
        border: '1px solid #4CAF50',
        borderRadius: '4px',
        backgroundColor: '#e8f5e9'
      }}>
        <h3>{selectedAttacker.name} - Aksiyon Seçimi</h3>
  
        {/* ➊ Başlangıç modu: melee veya büyü */}
        {!attackMode && !spellMode && (
          <>
            <button
              onClick={() => { setAttackMode(true); setSpellMode(false); }}
              style={{ marginRight: 8 }}
            >
              Yakın Dövüş Saldırı Seç
            </button>
            <button
              onClick={() => { setSpellMode(true); setAttackMode(false); }}
              style={{ marginRight: 8 }}
            >
              Büyü Kullan
            </button>
            <button
              onClick={() => {
                setSelectedAttacker(null);
                setAttackMode(false);
                setSpellMode(false);
                setSelectedSpell(null);
              }}
            >
              İptal
            </button>
          </>
        )}
  
        {/* ➋ Melee modu: hedef seçme */}
        {attackMode && !spellMode && (
          <p>Hareket menzili vurgulandı; lütfen hedefi seçin.</p>
        )}
  
        {/* ➌ Büyü modu – büyü seçimi */}
        {spellMode && !attackMode && !selectedSpell && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {selectedAttacker.prepared_spells && selectedAttacker.prepared_spells.length > 0 ? (
              selectedAttacker.prepared_spells.map(spell => (
                <button
                  key={spell.id}
                  onClick={() => setSelectedSpell(spell)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: '#4A90E2',
                    color: '#fff',
                  }}
                >
                  {spell.name}
                </button>
              ))
            ) : (
              <p>Hazırlı büyü yok.</p>
            )}
            <button
              onClick={() => setSpellMode(false)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Geri
            </button>
          </div>
        )}
  
        {/* ➍ Büyü modu – hedef seçimi */}
        {spellMode && selectedSpell && (
          <div style={{ marginTop: '8px' }}>
            <p>“{selectedSpell.name}” için hedef seçin.</p>
            <button onClick={() => setSelectedSpell(null)}>
              Büyü Seçimini İptal
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderInitiativeOrder = () => {
    if (initiativeOrder.length === 0) return null;
    return (
      <div style={{
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#ddd',
        borderRadius: '4px'
      }}>
        <strong>Initiative Order:</strong>
        {initiativeOrder.map((e, idx) => (
          <span key={e.character_id}
                style={{
                  marginRight: '10px',
                  fontWeight: idx === currentTurnIndex ? 'bold' : 'normal'
                }}>
            {e.name} ({e.initiative})
          </span>
        ))}
      </div>
    );
  };

  const renderChatLog = () => (
    <div style={{
      marginTop: '20px',
      padding: '10px',
      border: '1px solid #aaa',
      borderRadius: '4px',
      backgroundColor: '#f0f0f0',
      maxHeight: '150px',
      overflowY: 'auto'
    }}>
      <h4>Chat Log</h4>
      {chatLog.map((msg, idx) => (
        <p key={idx} style={{ margin: '5px 0' }}>{msg}</p>
      ))}
    </div>
  );

  const containerStyle = {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f4f4f4',
    minHeight: '100vh'
  };
  const gridContainerStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridSize}, 35px)`,
    gridTemplateRows: `repeat(${gridSize}, 35px)`,
    gap: '2px',
    marginBottom: '20px',
    border: '2px solid #333',
    backgroundColor: '#fff',
    padding: '5px'
  };
  const availableContainerStyle = { display: 'flex', flexWrap: 'wrap', marginBottom: '20px' };

  if (!lobbyData) {
    return <div style={{ padding: '20px' }}>Lobi bilgileri yükleniyor...</div>;
  }

  return (
    <div style={containerStyle}>
      <h2>Battle Area</h2>
      {renderInitiativeOrder()}
      {battleStarted ? (
        <div style={gridContainerStyle}>{cells}</div>
      ) : (
        <>
          {isGM ? (
            <>
              <div style={gridContainerStyle}>{cells}</div>
              <div>
                <h3>Yerleştirilmeyi Bekleyen Karakterler</h3>
                <div style={availableContainerStyle}>{availableList}</div>
              </div>
              <button onClick={handleStartBattle}
                      style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}>
                Savaşı Başlat
              </button>
            </>
          ) : (
            <p style={{ fontSize: '20px', color: '#555' }}>
              Savaş alanı hazırlanıyor, lütfen bekleyiniz...
            </p>
          )}
        </>
      )}

      {isGM && battleStarted && (
        <button onClick={handleEndBattle}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#673AB7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
          Savaşı Sonlandır
        </button>
      )}

      {renderActionPanel()}
      {renderTurnEndButton()}
      {renderChatLog()}
    </div>
  );
};

export default Battle;
