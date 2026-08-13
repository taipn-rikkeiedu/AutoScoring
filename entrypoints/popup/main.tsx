import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'window') {
  document.body.classList.add('window-mode');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
