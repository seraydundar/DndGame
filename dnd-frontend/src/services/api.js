// src/services/api.js
import axios from 'axios';

// CSRF token helper (istersen ayrı bir util dosyaya al)
// Eğer token’ı çerezden axios’a otomatik almak istemiyorsan, buna ihtiyacın olmayabilir.
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    document.cookie.split(';').forEach(cookie => {
      const [key, val] = cookie.trim().split('=');
      if (key === name) cookieValue = decodeURIComponent(val);
    });
  }
  return cookieValue;
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/',
  withCredentials: true,             // kesinlikle cookie’leri gönder
  xsrfCookieName: 'csrftoken',       // Django’nun çerez adı
  xsrfHeaderName: 'X-CSRFToken',     // beklenen header
});

export default api;
