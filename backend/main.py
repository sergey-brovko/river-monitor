# backend/main.py - Упрощенная версия FastAPI для быстрого старта
import asyncio
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import math

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Простой кэш в памяти
cache_storage = {}
CACHE_DURATION = timedelta(minutes=10)


# Конфигурация станций
@dataclass
class StationConfig:
    name: str
    coords: Dict[str, float]
    source: str
    allrivers_url: str
    critical_level: int
    normal_level: int
    id: str


STATIONS = {
    "novosibirsk": StationConfig(
        name="Новосибирск",
        coords={"lat": 54.8527, "lon": 82.9899},
        source="ФГБУ Западно-Сибирское УГМС",
        allrivers_url="https://allrivers.info/gauge/ob-novosibirsk",
        critical_level=450,
        normal_level=100,
        id="ob-novosibirsk"
    ),
    "barnaul": StationConfig(
        name="Барнаул",
        coords={"lat": 53.3606, "lon": 83.7636},
        source="ФГБУ Западно-Сибирское УГМС",
        allrivers_url="https://allrivers.info/gauge/ob-barnaul",
        critical_level=615,
        normal_level=200,
        id="ob-barnaul"
    ),
    "nizhnevartovsk": StationConfig(
        name="Нижневартовск",
        coords={"lat": 60.9200, "lon": 76.6200},
        source="Центр регистра и кадастра",
        allrivers_url="https://allrivers.info/gauge/ob-nizhnevartovsk",
        critical_level=500,
        normal_level=150,
        id="ob-nizhnevartovsk"
    ),
    "muzhi": StationConfig(
        name="Мужи",
        coords={"lat": 63.5565, "lon": 66.3619},
        source="Центр регистра и кадастра",
        allrivers_url="https://allrivers.info/gauge/ob-muzhi",
        critical_level=400,
        normal_level=80,
        id="ob-muzhi"
    )
}


# Pydantic модели
class StationData(BaseModel):
    station_id: str
    station_name: str
    water_level: Optional[int] = None
    temperature: Optional[float] = None
    last_update: Optional[str] = None
    source: str
    coords: Dict[str, float]
    critical_level: int
    normal_level: int
    status: str
    error: Optional[str] = None
    timestamp: datetime


class HistoricalDataPoint(BaseModel):
    date: str
    water_level: int
    temperature: float
    normal: int
    critical: int


class HistoricalData(BaseModel):
    station_id: str
    station_name: str
    period: str
    data: List[HistoricalDataPoint]
    last_update: datetime


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    uptime: float
    cache_size: int
    redis_connected: bool
    version: str


# Глобальные переменные
start_time = datetime.now()
http_client = None


# HTTP клиент
async def get_http_client():
    global http_client
    if http_client is None:
        http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
    return http_client


# Функции кэширования
def get_cached_data(cache_key: str):
    if cache_key in cache_storage:
        cached_item = cache_storage[cache_key]
        if datetime.now() - cached_item["timestamp"] < CACHE_DURATION:
            return cached_item["data"]
    return None


def set_cached_data(cache_key: str, data):
    cache_storage[cache_key] = {
        "data": data,
        "timestamp": datetime.now()
    }


# Функция парсинга данных
async def fetch_allrivers_data(station_id: str) -> StationData:
    station = STATIONS[station_id]
    client = await get_http_client()

    try:
        response = await client.get(station.allrivers_url)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        water_level = None
        temperature = None
        last_update = None

        # Поиск данных в HTML
        for element in soup.find_all(['td', 'div', 'span']):
            text = element.get_text(strip=True)

            level_match = re.search(r'(\d+)\s*см', text)
            if level_match and not water_level:
                water_level = int(level_match.group(1))

            temp_match = re.search(r'(\d+(?:\.\d+)?)\s*[°С]?C?', text)
            if temp_match and 'температур' in text.lower():
                temperature = float(temp_match.group(1))

            date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', text)
            if date_match:
                last_update = date_match.group(1)

        return StationData(
            station_id=station_id,
            station_name=station.name,
            water_level=water_level,
            temperature=temperature,
            last_update=last_update or datetime.now().strftime("%d.%m.%Y"),
            source=station.source,
            coords=station.coords,
            critical_level=station.critical_level,
            normal_level=station.normal_level,
            status="success" if water_level else "no_data",
            timestamp=datetime.now()
        )

    except Exception as e:
        logger.error(f"Ошибка получения данных для {station_id}: {e}")
        return StationData(
            station_id=station_id,
            station_name=station.name,
            water_level=None,
            temperature=None,
            last_update=None,
            source=station.source,
            coords=station.coords,
            critical_level=station.critical_level,
            normal_level=station.normal_level,
            status="error",
            error=str(e),
            timestamp=datetime.now()
        )


# Генерация исторических данных
def generate_historical_data(station_id: str, days: int = 30) -> List[HistoricalDataPoint]:
    station = STATIONS[station_id]
    data = []
    base_level = station.normal_level + 30

    for i in range(days - 1, -1, -1):
        date = datetime.now() - timedelta(days=i)

        day_of_year = date.timetuple().tm_yday
        seasonal_variation = math.sin((day_of_year / 365) * 2 * math.pi) * 50
        random_variation = (hash(f"{station_id}{date.date()}") % 41) - 20
        level = max(0, round(base_level + seasonal_variation + random_variation))

        data.append(HistoricalDataPoint(
            date=date.strftime("%Y-%m-%d"),
            water_level=level,
            temperature=round(15 + (hash(f"temp{station_id}{date.date()}") % 100) / 10, 1),
            normal=station.normal_level,
            critical=station.critical_level
        ))

    return data


# Создание FastAPI приложения
app = FastAPI(
    title="Мониторинг реки Обь",
    description="API для мониторинга уровня воды в реке Обь",
    version="2.0.0"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# API Routes
@app.get("/")
async def root():
    return {
        "message": "API мониторинга реки Обь",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    uptime = (datetime.now() - start_time).total_seconds()

    return HealthResponse(
        status="OK",
        timestamp=datetime.now(),
        uptime=uptime,
        cache_size=len(cache_storage),
        redis_connected=False,  # Пока без Redis
        version="2.0.0"
    )


@app.get("/api/stations")
async def get_all_stations():
    cache_key = "all_stations"
    cached_data = get_cached_data(cache_key)

    if cached_data:
        return {
            "stations": cached_data,
            "last_update": datetime.now(),
            "source": "Cache"
        }

    # Получаем данные всех станций
    tasks = [fetch_allrivers_data(station_id) for station_id in STATIONS.keys()]
    stations_data = await asyncio.gather(*tasks)

    # Конвертируем в словари для JSON
    stations_dict = [station.dict() for station in stations_data]
    set_cached_data(cache_key, stations_dict)

    return {
        "stations": stations_dict,
        "last_update": datetime.now(),
        "source": "AllRivers.info"
    }


@app.get("/api/stations/{station_id}")
async def get_station_data(station_id: str):
    if station_id not in STATIONS:
        raise HTTPException(status_code=404, detail="Станция не найдена")

    cache_key = f"station_{station_id}"
    cached_data = get_cached_data(cache_key)

    if cached_data:
        return cached_data

    station_data = await fetch_allrivers_data(station_id)
    station_dict = station_data.dict()
    set_cached_data(cache_key, station_dict)

    return station_dict


@app.get("/api/stations/{station_id}/history")
async def get_station_history(station_id: str, days: int = 30):
    if station_id not in STATIONS:
        raise HTTPException(status_code=404, detail="Станция не найдена")

    if days > 365:
        days = 365

    station = STATIONS[station_id]
    historical_data = generate_historical_data(station_id, days)

    return {
        "station_id": station_id,
        "station_name": station.name,
        "period": f"{days} дней",
        "data": [point.dict() for point in historical_data],
        "last_update": datetime.now()
    }


@app.get("/api/stations-list")
async def get_stations_list():
    stations_list = [
        {
            "id": station_id,
            "name": station.name,
            "coords": station.coords,
            "source": station.source,
            "critical_level": station.critical_level,
            "normal_level": station.normal_level
        }
        for station_id, station in STATIONS.items()
    ]

    return {
        "stations": stations_list,
        "total": len(stations_list)
    }


@app.get("/api/summary")
async def get_summary():
    # Получаем данные всех станций
    tasks = [fetch_allrivers_data(station_id) for station_id in STATIONS.keys()]
    stations_data = await asyncio.gather(*tasks)

    # Подсчитываем статистику
    active_stations = sum(1 for s in stations_data if s.status == "success")
    critical_stations = sum(1 for s in stations_data
                            if s.water_level and s.water_level > s.critical_level)
    elevated_stations = sum(1 for s in stations_data
                            if s.water_level and s.normal_level + 50 < s.water_level <= s.critical_level)
    normal_stations = sum(1 for s in stations_data
                          if s.water_level and s.water_level <= s.normal_level + 50)

    summary_stations = [
        {
            "id": station.station_id,
            "name": station.station_name,
            "level": station.water_level,
            "status": "critical" if station.water_level and station.water_level > station.critical_level
            else "elevated" if station.water_level and station.water_level > station.normal_level + 50
            else "normal" if station.water_level else "no_data",
            "temperature": station.temperature
        }
        for station in stations_data
    ]

    return {
        "total_stations": len(stations_data),
        "active_stations": active_stations,
        "critical_stations": critical_stations,
        "elevated_stations": elevated_stations,
        "normal_stations": normal_stations,
        "last_update": datetime.now(),
        "stations": summary_stations
    }


@app.post("/api/refresh")
async def manual_refresh():
    # Очищаем кэш для принудительного обновления
    cache_storage.clear()
    return {"message": "Кэш очищен, данные будут обновлены при следующем запросе", "timestamp": datetime.now()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)