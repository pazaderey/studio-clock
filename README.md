# Studio clock for MIEM

Репозиторий представляет собой серверное веб-приложение, позволяющее в реальном времени отслеживать
состояние выбранного видеомикшера (OBS при первоначальном запуске). Приложение показывает время с
начала записи/трансляции, а при воспроизведении видеоролика покажет сколько времени осталось до
его конца. Также в приложении есть секундомер и возможность отслеживать состояние различных
источников звука.

## Подготовка

Создать файл `new_backend/config.json` следующей структуры (также см. `new_backend/config.example.json`):
```json
{
    "obs": {
        "ip": "",
        "port": 0,
        "password": ""
    }
}
```
При желании в соответствующие поля можно записать данные для подключения к obs-websocket.

## Переменные среды для серверной части (также см. `new_backend/.env.example`):

| Имя | Описание | Значение по умолчанию |
|---|---|---|
| FRONTEND_URL | Адрес frontend клиента | `http://localhost` |
| NODE_ENV | Окружение для логгирования (`production` или  `development`) | `production` |

Если у вашего сервера есть домен, то:
1. Задать переменную среды `FRONTEND_URL=https://{Ваш домен}`.
1. В файле `frontend/nginx.conf` на 14 строке поменять `server_name clocks;` на `server_name {Ваш домен};`;

## Запуск через Docker

```bash
docker-compose up -d
```

## Запуск локально

Удобнее при разработке, менее удобно для использования.

### Установка

Из корневого пути:
1. `cd ./frontend`
2. `npm ci`

Из корневого пути:
1. `cd ./new_backend`
2. `npm ci`

В файле `./frontend/package.json` заменить 46 строку на:
```json
  "proxy": "http://localhost:4000"
```

### Запуск

Из корневого пути:
1. `cd ./frontend`
2. `npm start`

Из корневого пути:
1. `cd ./new_backend`
2. `npm start`

