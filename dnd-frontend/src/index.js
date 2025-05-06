import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FriendProvider } from './contexts/FriendContext';
import { NotificationProvider } from './contexts/NotificationContext';
import axios from 'axios';

// Proxy sayesinde aynı origin olarak sayılacağız
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRFToken'] =
  document.cookie.match('(^|;)\\s*csrftoken=([^;]+)')?.pop() || '';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <FriendProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </FriendProvider>
);
