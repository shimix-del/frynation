import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize theme class immediately before render
const savedTheme = localStorage.getItem('nanifrys_theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark', 'theme-dark');
} else {
  document.documentElement.classList.remove('dark', 'theme-dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
