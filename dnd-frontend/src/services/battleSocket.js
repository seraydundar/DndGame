let battleSocket = null;

export function createBattleSocket(lobbyId, onMessageCallback) {
  if (!lobbyId) {
    console.warn("WebSocket başlatılamadı: lobbyId boş.");
    return null;
  }

  const socketUrl = `ws://localhost:8000/ws/battle/${lobbyId}/`;
  console.log("WebSocket bağlantısı başlatılıyor:", socketUrl);

  let socket;

  try {
    socket = new WebSocket(socketUrl);
  } catch (err) {
    console.error("WebSocket oluşturulamadı:", err);
    return null;
  }

  socket.onopen = () => {
    console.log("WebSocket açıldı.");
  };

  socket.onerror = (e) => {
    console.error("WebSocket hatası:", e);
  };

  socket.onclose = () => {
    console.warn("WebSocket bağlantısı kapandı.");
  };

  if (onMessageCallback && socket) {
    try {
      socket.addEventListener('message', onMessageCallback);
    } catch (err) {
      console.warn("message listener eklenemedi:", err);
    }
  }

  battleSocket = socket;
  return socket;
}

export function getBattleSocket() {
  return battleSocket;
}
