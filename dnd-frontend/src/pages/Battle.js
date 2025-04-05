import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

const gridSize = 20; // 20x20 grid
const totalCells = gridSize * gridSize;

const Battle = () => {
  const { id } = useParams();
  let lobbyId = id || localStorage.getItem('lobbyId') || "6";
  if (!localStorage.getItem('lobbyId')) {
    localStorage.setItem('lobbyId', lobbyId);
  }
  console.log("Battle.js - lobbyId:", lobbyId);

  const [lobbyData, setLobbyData] = useState(null);
  const [isGM, setIsGM] = useState(false);
  const [allCharacters, setAllCharacters] = useState([]);
  const [availableCharacters, setAvailableCharacters] = useState([]);
  const [placements, setPlacements] = useState({});
  const [battleStarted, setBattleStarted] = useState(false);

  // Initiative order (GM tarafından oluşturulan) ve tur bilgileri
  const [initiativeOrder, setInitiativeOrder] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Aksiyon seçimi için state'ler
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [attackMode, setAttackMode] = useState(false);

  // Hareket menzili için reachableCells
  const [reachableCells, setReachableCells] = useState(new Set());

  // Chat log
  const [chatLog, setChatLog] = useState([]);

  // Ek: Hareket animasyonu için state
  const [moving, setMoving] = useState(false);

  const currentUserId = parseInt(localStorage.getItem("user_id") || '0', 10);

  // Yakın dövüş saldırısı işlemini gerçekleştiren fonksiyon.
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
      socket.send(JSON.stringify({
        event: "battleUpdate",
        lobbyId: lobbyId,
        chatLog: updatedChatLog
      }));
      // İşlem sonrası global battle state API'sini çağır ve tüm kullanıcıların ekranını güncelle
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

  // Spell casting fonksiyonları, handleMeleeAttack'den hemen sonra ekleniyor.
  // Genel spell casting fonksiyonu: Seçilen saldırganın prepared_spells sütununda ilgili spell varsa çağrıyı yapar.
  const handleSpellCast = async (spellKey, targetCharacter, extraData = {}) => {
    if (!selectedAttacker || !targetCharacter) return;

    // Eğer karakterin prepared_spells alanı yoksa veya dizi değilse ya da spell listesinde spellKey yoksa uyarı göster
    if (
      !selectedAttacker.prepared_spells ||
      !Array.isArray(selectedAttacker.prepared_spells) ||
      !selectedAttacker.prepared_spells.includes(spellKey)
    ) {
      alert(`${selectedAttacker.name} karakteri ${spellKey} spelline sahip değil!`);
      return;
    }

    try {
      const response = await api.post(`spells/${spellKey}/`, {
        attacker_id: selectedAttacker.id,
        target_id: targetCharacter.id,
        lobby_id: lobbyId,
        ...extraData
      });
      const newMessage = response.data.message;
      const updatedChatLog = [...chatLog, newMessage];
      setChatLog(updatedChatLog);
      socket.send(JSON.stringify({
        event: "battleUpdate",
        lobbyId: lobbyId,
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
      console.error(`Error casting spell ${spellKey}:`, error);
    }
  };

  // Speller için ayrı ayrı sarmalayıcı fonksiyonlar:
  const handleMagicMissile = (target) => handleSpellCast('magic-missile', target);
  const handleFireball = (target) => handleSpellCast('fireball', target);
  const handleLightningBolt = (target) => handleSpellCast('lightning-bolt', target);
  const handleHealingWord = (target) => handleSpellCast('healing-word', target);
  const handleShield = (target) => handleSpellCast('shield', target);
  const handleInvisibility = (target) => handleSpellCast('invisibility', target);
  const handleSleep = (target) => handleSpellCast('sleep', target);
  const handleAcidArrow = (target) => handleSpellCast('acid-arrow', target);
  const handleMagicWeapon = (target) => handleSpellCast('magic-weapon', target);
  const handleFly = (target) => handleSpellCast('fly', target);
  const handleConeOfCold = (target) => handleSpellCast('cone-of-cold', target);
  const handleDominatePerson = (target) => handleSpellCast('dominate-person', target);
  const handleDisintegrate = (target) => handleSpellCast('disintegrate', target);
  const handleEarthquake = (target) => handleSpellCast('earthquake', target);
  const handleHoldPerson = (target) => handleSpellCast('hold-person', target);
  const handleLightningStorm = (target) => handleSpellCast('lightning-storm', target);
  const handlePolymorph = (target) => handleSpellCast('polymorph', target);
  const handleSunbeam = (target) => handleSpellCast('sunbeam', target);
  const handleWallOfFire = (target) => handleSpellCast('wall-of-fire', target);
  const handleTimeStop = (target) => handleSpellCast('time-stop', target);
  const handleBlight = (target) => handleSpellCast('blight', target);
  const handleCharmPerson = (target) => handleSpellCast('charm-person', target);
  const handleDarkness = (target) => handleSpellCast('darkness', target);
  const handleHaste = (target) => handleSpellCast('haste', target);
  const handleSlow = (target) => handleSpellCast('slow', target);
  const handleCounterspell = (target) => handleSpellCast('counterspell', target);
  const handleFireShield = (target) => handleSpellCast('fire-shield', target);
  const handleIceStorm = (target) => handleSpellCast('ice-storm', target);
  const handlePrismaticSpray = (target) => handleSpellCast('prismatic-spray', target);
  const handleDispelMagic = (target) => handleSpellCast('dispel-magic', target);
  const handleAnimateDead = (target) => handleSpellCast('animate-dead', target);
  const handleBanishment = (target) => handleSpellCast('banishment', target);
  const handleCircleOfDeath = (target) => handleSpellCast('circle-of-death', target);
  const handleCloudkill = (target) => handleSpellCast('cloudkill', target);
  const handleConfusion = (target) => handleSpellCast('confusion', target);
  const handleDelayedBlastFireball = (target) => handleSpellCast('delayed-blast-fireball', target);
  const handleDimensionDoor = (target) => handleSpellCast('dimension-door', target);
  const handleDominateMonster = (target) => handleSpellCast('dominate-monster', target);
  const handleFeeblemind = (target) => handleSpellCast('feeblemind', target);
  const handleTrueResurrection = (target) => handleSpellCast('true-resurrection', target);
  const handleForcecage = (target) => handleSpellCast('forcecage', target);
  const handleTelekinesis = (target) => handleSpellCast('telekinesis', target);
  const handleEarthbind = (target) => handleSpellCast('earthbind', target);
  const handleMindBlank = (target) => handleSpellCast('mind-blank', target);
  const handleMaze = (target) => handleSpellCast('maze', target);
  const handlePowerWordKill = (target) => handleSpellCast('power-word-kill', target);
  const handleFingerOfDeath = (target) => handleSpellCast('finger-of-death', target);
  const handleGlobeOfInvulnerability = (target) => handleSpellCast('globe-of-invulnerability', target);
  const handleOttosIrresistibleDance = (target) => handleSpellCast('ottos-irresistible-dance', target);
  const handleSymbol = (target) => handleSpellCast('symbol', target);
  const handleMassHeal = (target) => handleSpellCast('mass-heal', target);
  const handleChainLightning = (target) => handleSpellCast('chain-lightning', target);
  const handleReverseGravity = (target) => handleSpellCast('reverse-gravity', target);
  const handleFleshToStone = (target) => handleSpellCast('flesh-to-stone', target);
  const handleAnimateObjects = (target) => handleSpellCast('animate-objects', target);
  const handleAntimagicField = (target) => handleSpellCast('antimagic-field', target);
  const handleEyebite = (target) => handleSpellCast('eyebite', target);
  const handleControlWeather = (target) => handleSpellCast('control-weather', target);
  const handleHolyAura = (target) => handleSpellCast('holy-aura', target);
  const handleWish = (target) => handleSpellCast('wish', target);

  // 2. GM için battle başlatılmadan polling yapılmasın:
  useEffect(() => {
    if (!battleStarted) return;
    const interval = setInterval(() => {
      api.get(`battle-state/${lobbyId}/`)
         .then(response => {
           if (response.data) {
             console.log("Battle state API'den alındı:", response.data);
             setInitiativeOrder(response.data.initiative_order);
             setPlacements(response.data.placements);
             setAvailableCharacters(response.data.available_characters);
             setCurrentTurnIndex(response.data.current_turn_index || 0);
             if (response.data.chat_log) setChatLog(response.data.chat_log);
           }
         })
         .catch(error => console.error("Battle state fetch error:", error));
    }, 3000);
    return () => clearInterval(interval);
  }, [lobbyId, battleStarted]);

  // GM tarafından battle başlatma işlemi.
  const handleStartBattle = async () => {
    if (!isGM) return;
    try {
      const response = await api.post('combat/initiate/', { 
        lobby_id: lobbyId, 
        character_ids: allCharacters.map(ch => ch.id),
        placements: placements,
        available_characters: availableCharacters
      });
      const initOrder = response.data.initiative_order;
      socket.send(JSON.stringify({
        event: "battleStart",
        lobbyId: lobbyId,
        placements: placements,
        availableCharacters: availableCharacters,
        initiativeOrder: initOrder
      }));
      console.log("Initiative Order gönderildi:", initOrder);
      setInitiativeOrder(initOrder);
      setCurrentTurnIndex(0);
      setBattleStarted(true);
    } catch (error) {
      console.error("Battle start hatası:", error);
    }
  };

  // GM'in savaşı sonlandırması için kullanılacak fonksiyon.
  const handleEndBattle = () => {
    socket.send(JSON.stringify({
      event: "battleEnd",
      lobbyId: lobbyId,
    }));
  };

  // Lobi verisini çekme
  useEffect(() => {
    const fetchLobbyData = async () => {
      try {
        const response = await api.get(`lobbies/${lobbyId}/`);
        console.log("Lobi verisi:", response.data);
        setLobbyData(response.data);
        setIsGM(response.data.gm_player === currentUserId);
      } catch (error) {
        console.error("Lobi verileri alınırken hata:", error);
      }
    };
    if (lobbyId) {
      fetchLobbyData();
    }
  }, [lobbyId, currentUserId]);

  // Tüm karakterleri çekme
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await api.get(`lobbies/${lobbyId}/characters/`);
        console.log("Tüm karakterler (API'den):", response.data);
        setAllCharacters(response.data);
      } catch (error) {
        console.error("Karakterler alınırken hata:", error);
      }
    };
    if (lobbyId) {
      fetchCharacters();
    }
  }, [lobbyId]);

  useEffect(() => {
    const placedIds = Object.values(placements)
      .filter(ch => ch !== undefined)
      .map(ch => ch.id);
    const notPlaced = allCharacters.filter(ch => !placedIds.includes(ch.id));
    console.log("Filtrelenmiş karakterler (lobby_id=", lobbyId, "):", notPlaced);
    setAvailableCharacters(notPlaced);
  }, [allCharacters, placements, lobbyId]);

  // BattleStart mesajlarını dinleme
  useEffect(() => {
    const battleStartHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "battleStart" && Number(data.lobbyId) === Number(lobbyId)) {
          setBattleStarted(true);
          if (data.initiativeOrder) {
            console.log("Initiative Order Alındı:", data.initiativeOrder);
            setInitiativeOrder(data.initiativeOrder);
            setCurrentTurnIndex(0);
          }
          if (data.placements) setPlacements(data.placements);
          if (data.availableCharacters) setAvailableCharacters(data.availableCharacters);
          if (data.chatLog) setChatLog(data.chatLog);
        }
      } catch (error) {
        console.error("BattleStart mesajı ayrıştırma hatası:", error);
      }
    };
    socket.addEventListener("message", battleStartHandler);
    return () => {
      socket.removeEventListener("message", battleStartHandler);
    };
  }, [lobbyId]);

  // Polling: (Yukarıda battleStarted kontrolü yapılıyor)

  // BattleUpdate mesajlarını dinleme
  useEffect(() => {
    const battleUpdateHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "battleUpdate" && Number(data.lobbyId) === Number(lobbyId)) {
          if (data.placements) setPlacements(data.placements);
          if (data.availableCharacters) setAvailableCharacters(data.availableCharacters);
          if (data.initiativeOrder) setInitiativeOrder(data.initiativeOrder);
          if (data.chatLog) setChatLog(data.chatLog);
        }
      } catch (error) {
        console.error("BattleUpdate mesajı ayrıştırma hatası:", error);
      }
    };
    socket.addEventListener("message", battleUpdateHandler);
    return () => {
      socket.removeEventListener("message", battleUpdateHandler);
    };
  }, [lobbyId]);

  // Savaşın bitmesi için WebSocket dinleyicisi: battleEnd mesajı alındığında EndBattle sayfasına yönlendir.
  useEffect(() => {
    const battleEndHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "battleEnd" && Number(data.lobbyId) === Number(lobbyId)) {
          window.location.href = `/endbattle/${lobbyId}`;
        }
      } catch (error) {
        console.error("BattleEnd mesajı ayrıştırma hatası:", error);
      }
    };
    socket.addEventListener("message", battleEndHandler);
    return () => {
      socket.removeEventListener("message", battleEndHandler);
    };
  }, [lobbyId]);

  // Seçilen saldıran karakter değişince reachableCells hesapla.
  useEffect(() => {
    if (selectedAttacker) {
      let attackerIndex = null;
      for (let key in placements) {
        if (placements[key] && Number(placements[key].id) === Number(selectedAttacker.id)) {
          attackerIndex = Number(key);
          break;
        }
      }
      if (attackerIndex === null) return;
      const attackerRow = Math.floor(attackerIndex / gridSize);
      const attackerCol = attackerIndex % gridSize;
      const dex = selectedAttacker.dexterity || 10;
      const movementRange = 2 + Math.floor((dex - 10) / 2);
      const newReachable = new Set();
      for (let i = 0; i < totalCells; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const distance = Math.abs(row - attackerRow) + Math.abs(col - attackerCol);
        if (distance <= movementRange) {
          newReachable.add(i);
        }
      }
      setReachableCells(newReachable);
    } else {
      setReachableCells(new Set());
    }
  }, [selectedAttacker, placements]);

  // Yeni: Hareket etmek için handleMoveCharacter fonksiyonu
  const handleMoveCharacter = (targetCellIndex) => {
    // Hedef hücre boş ve ulaşılabilir mi kontrolü:
    if (!reachableCells.has(targetCellIndex) || placements[targetCellIndex]) return;
    
    // Seçili karakterin mevcut konumunu bul:
    let currentCell = null;
    for (let key in placements) {
      if (placements[key] && Number(placements[key].id) === Number(selectedAttacker.id)) {
        currentCell = Number(key);
        break;
      }
    }
    if (currentCell === null) return;
    
    // Yeni placements oluştur ve güncelle:
    const newPlacements = { ...placements };
    newPlacements[currentCell] = undefined;
    newPlacements[targetCellIndex] = selectedAttacker;
    setPlacements(newPlacements);
    
    // Hareket animasyonu için moving state'ini tetikle:
    setMoving(true);
    setTimeout(() => {
      setMoving(false);
      // Hareket sonrası aksiyon seçim menüsünden çık
      setSelectedAttacker(null);
      setAttackMode(false);
    }, 500); // 500ms animasyon süresi (örnek)
  };

  // Drag and Drop işlemleri
  const handleDragStart = (e, character, source, sourceIndex) => {
    const data = { character, source, sourceIndex };
    e.dataTransfer.setData("text/plain", JSON.stringify(data));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, cellIndex) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    let newPlacements = { ...placements };
    if (data.source === "grid" && data.sourceIndex !== undefined) {
      newPlacements[data.sourceIndex] = undefined;
    }
    if (newPlacements[cellIndex]) {
      setAvailableCharacters(prev => [...prev, newPlacements[cellIndex]]);
    }
    newPlacements[cellIndex] = data.character;
    setPlacements(newPlacements);
    if (data.source === "available") {
      setAvailableCharacters(prev => prev.filter(ch => ch.id !== data.character.id));
    }
    socket.send(JSON.stringify({
      event: "battleUpdate",
      lobbyId: lobbyId,
      placements: newPlacements,
      availableCharacters: availableCharacters.filter(ch => ch.id !== data.character.id)
    }));
  };

  // Grid hücrelerini oluştur.
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const cellCharacter = placements[index];
    return (
      <div
        key={index}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, index)}
        style={{
          border: '1px solid #ccc',
          width: '35px',
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: cellCharacter ? '#90ee90' : '#fff',
          cursor: cellCharacter ? 'pointer' : 'default',
          boxShadow: reachableCells.has(index) ? '0 0 0 2px green' : 'none'
        }}
        onClick={() => {
          // 1. Eğer seçili karakter var, aksiyon modu kapalı, tıklanan hücre boşsa ve ulaşılabilir ise hareket yap.
          if (selectedAttacker && !attackMode && !placements[index] && reachableCells.has(index)) {
            console.log("Hareket için seçilen hücre:", index);
            handleMoveCharacter(index);
            return;
          }
          if (attackMode && selectedAttacker) {
            if (cellCharacter && Number(cellCharacter.id) !== Number(selectedAttacker.id)) {
              console.log("Hedef olarak seçilen karakter:", cellCharacter);
              handleMeleeAttack(cellCharacter);
              return;
            }
          }
          if (cellCharacter && initiativeOrder.length > 0) {
            const currentTurn = initiativeOrder[currentTurnIndex];
            console.log("Tıklanan karakter:", cellCharacter, "Current Turn:", currentTurn);
            if (Number(cellCharacter.player_id) !== Number(currentUserId)) return;
            if (Number(cellCharacter.id) === Number(currentTurn.character_id)) {
              setSelectedAttacker(cellCharacter);
              console.log("Aksiyon paneli açılıyor, tıklanan karakter:", cellCharacter);
            } else {
              alert("Sıra sizde değil!");
            }
          }
        }}
      >
        {cellCharacter && (
          <div
            draggable={isGM}
            onDragStart={(e) => handleDragStart(e, cellCharacter, "grid", index)}
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
              border: cellCharacter.player_id === currentUserId ? '2px solid blue' : 'none',
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
      const response = await api.post('combat/end-turn/', { lobby_id: lobbyId });
      const newInitiativeOrder = response.data.initiative_order;
      socket.send(JSON.stringify({
        event: "battleUpdate",
        lobbyId: lobbyId,
        initiativeOrder: newInitiativeOrder,
        placements: response.data.placements
      }));
      console.log("Turn ended. New initiative order:", newInitiativeOrder);
      setInitiativeOrder(newInitiativeOrder);
    } catch (error) {
      console.error("Turn end error:", error);
    }
  };

  // Available list
  const availableList = availableCharacters.map(ch => (
    <div
      key={ch.id}
      onClick={() => {
        if (attackMode && selectedAttacker) {
          console.log("Available listeden hedef seçildi:", ch);
          handleMeleeAttack(ch);
          return;
        }
        if (Number(ch.player_id) !== Number(currentUserId)) return;
        if (initiativeOrder.length > 0) {
          const currentTurn = initiativeOrder[currentTurnIndex];
          console.log("Available'den tıklanan karakter:", ch, "Current Turn:", currentTurn);
          if (Number(ch.id) === Number(currentTurn.character_id)) {
            setSelectedAttacker(ch);
            console.log("Aksiyon paneli açılıyor (available list), tıklanan karakter:", ch);
          } else {
            alert("Sıra sizde değil!");
          }
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
        border: Number(ch.player_id) === Number(currentUserId) ? '2px solid blue' : 'none'
      }}
    >
      {ch.name}
    </div>
  ));

  // Turn End butonu: Her durumda görünür.
  const renderTurnEndButton = () => {
    return (
      <button 
        onClick={handleEndTurn}
        style={{
          marginTop: '10px',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#f44336',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Turn End
      </button>
    );
  };

  // 3. Aksiyon paneli: İptal butonu eklenmiştir.
  const renderActionPanel = () => {
    if (!selectedAttacker) return null;
    return (
      <div style={{ margin: '20px 0', padding: '10px', border: '1px solid #4CAF50', borderRadius: '4px', backgroundColor: '#e8f5e9' }}>
        <h3>{selectedAttacker.name} - Aksiyon Seçimi</h3>
        {!attackMode ? (
          <>
            <button onClick={() => setAttackMode(true)} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
              Yakın Dövüş Saldırı Seç
            </button>
            <button onClick={() => { setSelectedAttacker(null); setAttackMode(false); }} style={{ padding: '10px 20px', fontSize: '16px', marginLeft: '10px', cursor: 'pointer' }}>
              İptal
            </button>
          </>
        ) : (
          <p>Hareket menzili vurgulandı; lütfen hedefi seçin.</p>
        )}
      </div>
    );
  };

  // Üst kısımda initiative order'ı gösteren fonksiyon.
  const renderInitiativeOrder = () => {
    if (initiativeOrder.length === 0) return null;
    return (
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#ddd', borderRadius: '4px' }}>
        <strong>Initiative Order:</strong> {initiativeOrder.map((entry, idx) => (
          <span key={entry.character_id} style={{ marginRight: '10px', fontWeight: idx === currentTurnIndex ? 'bold' : 'normal' }}>
            {entry.name} ({entry.initiative})
          </span>
        ))}
      </div>
    );
  };

  // Chat log
  const renderChatLog = () => {
    return (
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #aaa', borderRadius: '4px', backgroundColor: '#f0f0f0', maxHeight: '150px', overflowY: 'auto' }}>
        <h4>Chat Log</h4>
        {chatLog.map((msg, idx) => (
          <p key={idx} style={{ margin: '5px 0' }}>{msg}</p>
        ))}
      </div>
    );
  };

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

  const availableContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    marginBottom: '20px'
  };

  if (!lobbyData) {
    return <div style={{ padding: '20px' }}>Lobi bilgileri yükleniyor...</div>;
  }

  return (
    <div style={containerStyle}>
      <h2>Battle Area</h2>
      {renderInitiativeOrder()}
      {battleStarted ? (
        <div style={gridContainerStyle}>
          {cells}
        </div>
      ) : (
        <>
          {isGM ? (
            <>
              <div style={gridContainerStyle}>
                {cells}
              </div>
              <div>
                <h3>Yerleştirilmeyi Bekleyen Karakterler</h3>
                <div style={availableContainerStyle}>
                  {availableList}
                </div>
              </div>
              <button 
                onClick={handleStartBattle}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Savaşı Başlat
              </button>
            </>
          ) : (
            <p style={{ fontSize: '20px', color: '#555' }}>Savaş alanı hazırlanıyor, lütfen bekleyiniz...</p>
          )}
        </>
      )}

      {/* GM ise, savaş başladıktan sonra "Savaşı Sonlandır" butonu gösterilsin */}
      {isGM && battleStarted && (
        <button 
          onClick={handleEndBattle}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#673AB7',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Savaşı Sonlandır
        </button>
      )}

      {selectedAttacker && renderActionPanel()}

      {renderTurnEndButton()}

      {renderChatLog()}
    </div>
  );
};

export default Battle;
