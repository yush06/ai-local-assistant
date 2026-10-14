# AI Local Assistant — Step 3

A small Node.js + TypeScript backend that searches restaurants using
Google Places API (New) Text Search.

## Requirements

- Node.js 18+ (Node 20+ recommended)
- A Google Cloud project
- Places API (New) enabled
- Billing enabled
- A valid Google Maps Platform API key

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`:

```bash
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_API_KEY
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then put your real key in `.env`.

## Run

```bash
npm run dev
```

You should see:

```text
API running at http://localhost:3000
```

## Test

Browser:

```text
http://localhost:3000/health
```

Restaurants:

```text
http://localhost:3000/api/restaurants?city=Kanpur&limit=10
```

Example:

```bash
curl "http://localhost:3000/api/restaurants?city=Kanpur&limit=10"
```

## Current architecture

```text
HTTP Request
    |
    v
restaurants.routes.ts
    |
    v
PlacesService
    |
    v
Google Places API (New)
    |
    v
normalizeRestaurant()
    |
    v
Our API response
```

## Important

The API key is read from `.env` and is never hard-coded into the source.

Do not commit `.env` to Git. It is included in `.gitignore`.

The current field mask intentionally requests only the fields needed for
the first MVP:

- place ID
- display name
- formatted address
- rating
- review count
- price level

Later steps will add our own ranking engine and natural-language intent parsing.
