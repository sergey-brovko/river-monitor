// frontend/src/index.js - Точка входа React приложения
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App';

// Создаем корневой элемент React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

// Рендерим приложение
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Логирование для отладки
console.log('🌊 Система мониторинга реки Обь запущена');
console.log('📊 React:', React.version);
console.log('🔗 API URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');