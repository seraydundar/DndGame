// services/socket.js
// Lobi id'sini localStorage'dan alıyoruz. (Lobiye girildiğinde bu değeri orada saklaman gerekiyor)
const lobbyId = localStorage.getItem('lobbyId') || 6;
const socket = new WebSocket(`ws://localhost:8000/ws/lobby/${lobbyId}/`);

socket.onopen = () => {
  console.log("WebSocket bağlantısı kuruldu, lobby id:", lobbyId);
};

socket.onerror = (error) => {
  console.error("WebSocket hatası:", error);
};

export default socket;
