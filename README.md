# Buzzcut Marketplace (Next.js)

Красивый минималистичный фронт для маркетплейса с:
- product feed (лента товаров)
- модалкой авторизации по email+код
- хранением токенов в localStorage
- приятной розово‑фиолетовой темой на чёрном

## Быстрый старт

1) Установи зависимости:
```bash
npm i
```

2) Скопируй env:
```bash
cp .env.example .env.local
```

3) Запусти:
```bash
npm run dev
```

Открой: http://localhost:3000

## Настройка API

По умолчанию:
- `NEXT_PUBLIC_API_BASE=https://buzzcut-season.ru`

Можно поменять в `.env.local`.

## Что реализовано

### Проверка API
Кнопка **API: ...** в хедере делает `GET /actuator/health` и показывает статус.

### Авторизация
- `POST /api/v1/accounts/send-code` (только email `test@buzzcut-season.ru`)
- `POST /api/v1/accounts/authenticate` (email+code)
- access/refresh токены сохраняются в localStorage

### Лента товаров
- `GET /api/v1/product-feed`
- Карточки товаров: фото, название, цена (форматируется из `priceSubunits`)

## Деплой (самый простой) — Vercel

1) Залей репозиторий на GitHub.
2) Зайди на Vercel → Add New Project → Import Git Repository.
3) В Environment Variables добавь:
   - `NEXT_PUBLIC_API_BASE` = `https://buzzcut-season.ru`
4) Deploy.

> Если API не разрешает CORS, фронт может не увидеть ответы в браузере. Тогда можно:
> - настроить CORS на бэке, или
> - сделать прокси через Next.js route handlers (я могу добавить, если понадобится).

## Деплой в Docker (опционально)

Если хочешь, могу добавить Dockerfile + compose.
