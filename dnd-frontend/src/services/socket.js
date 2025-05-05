// services/socket.js

// sessionStorage’dan oku
const lobbyId = sessionStorage.getItem('lobby_id');
const userId  = sessionStorage.getItem('user_id');

if (!lobbyId) {
  console.error(
    'WebSocket başlatılamadı: sessionStorage["lobby_id"] bulunamadı.'
  );
}

if (!userId) {
  console.error(
    'WebSocket başlatılamadı: sessionStorage["user_id"] bulunamadı.'
  );
}

// WebSocket URL’de sadece lobbyId var, userId’yi header olarak iletebilirsin (isteğe bağlı)
const socket = new WebSocket(`ws://localhost:8000/ws/lobby/${lobbyId}/`);


socket.onopen = () => {
  console.log("WebSocket bağlantısı kuruldu, lobby id:", lobbyId, "user id:", userId);
  // Eğer sunucu custom header bekliyorsa, ilk mesajda userId’yi yollayabilirsin:
  // socket.send(JSON.stringify({ type: 'identify', user_id: userId }));
};

socket.onerror = (error) => {
  console.error("WebSocket hatası:", error);
};

export default socket;
