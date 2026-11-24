# samarei.com

Sam Schnaars' personal site. Vite + React, deployed on Vercel.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

- `src/Pages/toolsData.tsx`: the "fun tools" cards on the home page (each is a route, e.g. `/drone`).
- `src/Pages/DroneSim.tsx`: 3D sim of the AMETA S20 Lite work ([repo](https://github.com/sam-schnaars/ameta-s20-lite)).
- `src/components/ApiKeyGate.tsx`: "bring your own key" screen for tools whose shared keys were pulled
  (Synonym AI uses Groq via `/api/synonyms` + `x-groq-key`; construction maps use a Mapbox `pk.` token).
  Keys stay in the visitor's localStorage.
- `api/`: Vercel functions (TV art feed, art submissions, synonyms).
- `public/sammyword/`: static Sammy Word pages; `/mobile` proxies to the Sammy Word app.

Env vars (Vercel): `TV_ART_READ_TOKEN`, `TV_ART_WRITE_TOKEN`, `BLOB_READ_WRITE_TOKEN`. `GROQ_API_KEY` is optional
(only used when a visitor sends no key).
