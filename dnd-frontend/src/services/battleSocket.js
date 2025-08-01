// src/services/battleSocket.js

let battleSocket     = null;
let pingIntervalId   = null;
let reconnectTimeout = null;
let reconnectTries   = 0;

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
  // React dev server 3000, Django Channels genellikle 8000 portunda
  const backendHost = window.location.hostname; // örn. "localhost"
  const backendPort = 8000;                     // Django’nun çalıştığı port
  const socketUrl = `${protocol}://${backendHost}:${backendPort}/ws/battle/${lobbyId}/`;
  console.log("🛰  WebSocket bağlantısı başlatılıyor:", socketUrl);

  const connect = () => {
    clearTimeout(reconnectTimeout);
    clearInterval(pingIntervalId);

    try {
      battleSocket = new WebSocket(socketUrl);
    } catch (err) {
      console.error("❌ WebSocket oluşturulamadı:", err);
      scheduleReconnect();
      return null;
    }

    battleSocket.onopen = () => {
      console.log("✅ WebSocket açıldı:", socketUrl);
      reconnectTries = 0;
      pingIntervalId = setInterval(() => {
        if (battleSocket.readyState === WebSocket.OPEN) {
          battleSocket.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    battleSocket.onerror = e => {
      console.error("❌ WebSocket hatası:", e);
    };

    battleSocket.onclose = e => {
      console.warn(
        "⚠️ WebSocket bağlantısı kapandı.",
        "code=", e.code,
        "reason=", e.reason
      );
      scheduleReconnect();
    };

    battleSocket.onmessage = event => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        console.error("❌ Mesaj JSON.parse hata:", err, "raw:", event.data);
        return;
      }
      if (msg.type === "pong") return;
      if (onMessageCallback) {
        try {
          onMessageCallback(msg);
        } catch (err) {
          console.error("❌ onMessageCallback hata:", err, msg);
        }
      }
    };
    return battleSocket;
  };

  const scheduleReconnect = () => {
    clearInterval(pingIntervalId);
    reconnectTries += 1;
    const wait = Math.min(30000, 1000 * reconnectTries);
    reconnectTimeout = setTimeout(connect, wait);
  };

  return connect();
}

export function getBattleSocket() {
  return battleSocket;
}
