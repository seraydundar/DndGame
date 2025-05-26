// src/services/battleSocket.js

let battleSocket = null;

/**
 * Opens (or re-opens) a WebSocket to the battle channel.
 * Calls onMessageCallback(msgObj) with the parsed JSON payload.
 */
export function createBattleSocket(lobbyId, onMessageCallback) {
  if (!lobbyId) {
    console.warn("WebSocket başlatılamadı: lobbyId boş.");
    return null;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socketUrl = `${protocol}://${window.location.host}/ws/battle/${lobbyId}/`;
  console.log("🛰  WebSocket bağlantısı başlatılıyor:", socketUrl);

  let socket;
  try {
    socket = new WebSocket(socketUrl);
  } catch (err) {
    console.error("❌ WebSocket oluşturulamadı:", err);
    return null;
  }

  socket.onopen = () => {
    console.log("✅ WebSocket açıldı.");
  };

  socket.onerror = e => {
    console.error("❌ WebSocket hatası:", e);
  };

  socket.onclose = e => {
    console.warn("⚠️ WebSocket bağlantısı kapandı.", "code=", e.code, "reason=", e.reason);
  };

  socket.onmessage = event => {
    console.log("📨 Raw WS mesajı alındı:", event.data);
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      console.error("❌ Mesaj JSON.parse hata:", err, "raw:", event.data);
      return;
    }
    console.log("🔍 Parsed mesaj:", msg);
    if (onMessageCallback) {
      try {
        onMessageCallback(msg);
      } catch (err) {
        console.error("❌ onMessageCallback hata:", err, msg);
      }
    }
  };

  battleSocket = socket;
  return socket;
}

export function getBattleSocket() {
  return battleSocket;
}
