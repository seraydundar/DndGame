import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Session cookie'leri göndermek/almak için
});

// Session tabanlı doğrulama kullanıldığından token eklemeye gerek yok.
api.interceptors.request.use((config) => {
  return config;
});

export default api;
