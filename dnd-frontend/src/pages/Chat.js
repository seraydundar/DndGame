import React, { useContext, useEffect, useState, useRef } from 'react';
import { WebSocketContext } from '../contexts/WebSocketContext';

const Chat = () => {
  // Global context'ten wsChat'i alıyoruz; eğer yoksa null dönecektir.
  const { wsChat } = useContext(WebSocketContext);
  // Eğer global chat socket yoksa, kendi bağlantımızı oluşturmak için ref kullanabiliriz.
  const socketRef = useRef(wsChat || new WebSocket('ws://localhost:8000/ws/chat/1/'));
  const [messages, setMessages] = useState([]);   // Gelen mesajları saklamak için
  const [input, setInput] = useState('');           // Kullanıcının yazdığı mesaj

  useEffect(() => {
    // Eğer global context'ten wsChat gelmişse, socketRef.current zaten o nesne olur.
    // Bağlantı açıldığında
    socketRef.current.onopen = () => {
      console.log('WebSocket bağlantısı kuruldu (Chat)');
    };

    // Mesaj alındığında
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      } catch (e) {
        console.error('Mesaj ayrıştırma hatası:', e);
      }
    };

    // Hata oluşursa
    socketRef.current.onerror = (error) => {
      console.error('WebSocket hatası (Chat):', error);
    };

    // Bağlantı kapandığında
    socketRef.current.onclose = () => {
      console.log('WebSocket bağlantısı kapandı (Chat)');
    };

    // Bileşen unmount olduğunda WebSocket bağlantısını kapat (eğer global context'teki socket değilse)
    return () => {
      // Eğer global socket kullanılıyorsa kapatmayın; aksi halde kapatın.
      if (!wsChat) {
        socketRef.current.close();
      }
    };
  }, [wsChat]);

  // Kullanıcının mesaj gönderme fonksiyonu
  const sendMessage = () => {
    if (input.trim() === '' || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    const messageData = { message: input };
    socketRef.current.send(JSON.stringify(messageData));
    setInput('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Chat</h2>
      <div
        style={{
          border: '1px solid #ccc',
          padding: '10px',
          height: '300px',
          overflowY: 'auto',
          marginBottom: '10px',
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </div>
      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mesajınızı yazın..."
          style={{ width: '80%', marginRight: '10px' }}
        />
        <button onClick={sendMessage}>Gönder</button>
      </div>
    </div>
  );
};

export default Chat;
