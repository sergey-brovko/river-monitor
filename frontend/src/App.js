import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplets, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

function App() {
  const [selectedStation, setSelectedStation] = useState('novosibirsk');
  const [loading, setLoading] = useState(false);
  const [dataStatus, setDataStatus] = useState('disconnected');
  const [stationsData, setStationsData] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [healthData, setHealthData] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Функция для API запросов
  const apiRequest = useCallback(async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return { success: false, error: error.message };
    }
  }, [API_BASE_URL]);

  // Проверка API
  const checkApiHealth = useCallback(async () => {
    const result = await apiRequest('/api/health');
    if (result.success) {
      setHealthData(result.data);
      setDataStatus('connected');
      return true;
    } else {
      setDataStatus('error');
      return false;
    }
  }, [apiRequest]);

  // Загрузка данных станций
  const fetchStationsData = useCallback(async () => {
    const result = await apiRequest('/api/stations');
    if (result.success) {
      const stationsMap = {};
      result.data.stations.forEach(station => {
        stationsMap[station.station_id] = station;
      });
      setStationsData(stationsMap);
      return stationsMap;
    }
    throw new Error(result.error);
  }, [apiRequest]);

  // Загрузка исторических данных
  const fetchHistoricalData = useCallback(async (stationId) => {
    const result = await apiRequest(`/api/stations/${stationId}/history?days=7`);
    if (result.success) {
      setHistoricalData(result.data.data);
      return result.data.data;
    }
    throw new Error(result.error);
  }, [apiRequest]);

  // Основная функция обновления
  const refreshData = useCallback(async () => {
    setLoading(true);

    try {
      const isHealthy = await checkApiHealth();
      if (!isHealthy) return;

      await Promise.all([
        fetchStationsData(),
        fetchHistoricalData(selectedStation)
      ]);

      setDataStatus('connected');
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      setDataStatus('error');
    } finally {
      setLoading(false);
    }
  }, [checkApiHealth, fetchStationsData, fetchHistoricalData, selectedStation]);

  // Эффекты
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (Object.keys(stationsData).length > 0) {
      fetchHistoricalData(selectedStation);
    }
  }, [selectedStation, fetchHistoricalData, stationsData]);

  // Данные текущей станции
  const currentStationData = stationsData[selectedStation];
  const currentLevel = currentStationData?.water_level || 0;

  const getStatusIcon = () => {
    switch (dataStatus) {
      case 'connected': return <Wifi className="text-green-500" size={16} />;
      case 'error': return <WifiOff className="text-red-500" size={16} />;
      default: return <WifiOff className="text-gray-500" size={16} />;
    }
  };

  const getStatusMessage = () => {
    switch (dataStatus) {
      case 'connected': return 'FastAPI подключен';
      case 'error': return 'Ошибка FastAPI сервера';
      default: return 'Подключение...';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #b2f5ea 100%)', padding: '1rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Droplets color="#2563eb" size={40} />
            Мониторинг реки Обь
            <span style={{ fontSize: '0.875rem', background: dataStatus === 'connected' ? '#dcfce7' : '#fecaca', color: dataStatus === 'connected' ? '#16a34a' : '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontWeight: '500' }}>
              {dataStatus === 'connected' ? 'LIVE' : 'ERROR'}
            </span>
          </h1>
          <p style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {getStatusIcon()}
            {getStatusMessage()} • {new Date().toLocaleString('ru-RU')}
          </p>
        </div>

        {/* Системная информация */}
        {healthData && (
          <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              Статус FastAPI сервера
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{healthData.status}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Статус</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>v{healthData.version}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Версия</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{Math.floor(healthData.uptime / 60)}м</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Время работы</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{healthData.cache_size}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Размер кэша</div>
              </div>
            </div>
          </div>
        )}

        {/* Ошибка подключения */}
        {dataStatus !== 'connected' && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '1rem', border: '2px solid #fecaca', background: '#fef2f2', color: '#dc2626' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} />
              <span style={{ fontWeight: '500' }}>Ошибка подключения к FastAPI</span>
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Проверьте, что FastAPI сервер запущен на {API_BASE_URL}
            </p>
            <button
              onClick={refreshData}
              style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', background: 'white', borderRadius: '0.5rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
            >
              Повторить подключение
            </button>
          </div>
        )}

        {/* Панель управления */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              disabled={loading}
            >
              <option value="novosibirsk">Новосибирск</option>
              <option value="barnaul">Барнаул</option>
              <option value="nizhnevartovsk">Нижневартовск</option>
              <option value="muzhi">Мужи</option>
            </select>

            <button
              onClick={refreshData}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                background: '#3b82f6', color: 'white', borderRadius: '0.5rem', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1
              }}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>

            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}
            >
              API Docs
            </a>
          </div>
        </div>

        {/* Карточки с данными */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>
              {currentLevel ? `${currentLevel} см` : 'Нет данных'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Текущий уровень</div>
          </div>

          <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>
              {currentStationData?.temperature ? `${currentStationData.temperature}°C` : 'Нет данных'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Температура воды</div>
          </div>

          <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>
              {currentStationData?.source ? 'Активна' : 'Нет данных'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Статус станции</div>
          </div>
        </div>

        {/* График */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
            Динамика уровня воды (7 дней)
          </h2>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6b7280' }}>
              <RefreshCw className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} />
              Загрузка данных из FastAPI...
            </div>
          ) : historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
                  formatter={(value, name) => [
                    `${value} см`,
                    name === 'water_level' ? 'Уровень воды' :
                    name === 'critical' ? 'Критический' : 'Нормальный'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="critical"
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="normal"
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="water_level"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6b7280' }}>
              <div style={{ textAlign: 'center' }}>
                <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
                <p>Нет данных для отображения</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Проверьте подключение к FastAPI серверу
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Информационная панель */}
        <div style={{ background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
            Информация о станции
          </h3>
          {currentStationData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Название:</span>
                <div style={{ fontWeight: '500' }}>{currentStationData.station_name}</div>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Координаты:</span>
                <div style={{ fontWeight: '500' }}>{currentStationData.coords.lat}°N, {currentStationData.coords.lon}°E</div>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Источник данных:</span>
                <div style={{ fontWeight: '500', fontSize: '0.75rem' }}>{currentStationData.source}</div>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Последнее обновление:</span>
                <div style={{ fontWeight: '500' }}>{currentStationData.last_update}</div>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Критический уровень:</span>
                <div style={{ fontWeight: '500', color: '#dc2626' }}>{currentStationData.critical_level} см</div>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Нормальный уровень:</span>
                <div style={{ fontWeight: '500', color: '#16a34a' }}>{currentStationData.normal_level} см</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>Выберите станцию для просмотра информации</p>
          )}
        </div>

        {/* Футер */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
          <p>
            Система мониторинга реки Обь • FastAPI + React •
            <a href={`${API_BASE_URL}/docs`} style={{ color: '#3b82f6', marginLeft: '0.25rem' }} target="_blank" rel="noopener noreferrer">
              Документация API
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;