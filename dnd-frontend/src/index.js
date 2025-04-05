import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FriendProvider } from './contexts/FriendContext';
import { NotificationProvider } from './contexts/NotificationContext';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <FriendProvider>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </FriendProvider>
);
