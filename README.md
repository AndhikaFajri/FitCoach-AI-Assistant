# FitCoach AI

Aplikasi chatbot kesehatan berbasis web yang membantu pengguna dalam mengelola gaya hidup sehat melalui konsultasi nutrisi, latihan fisik, dan perencanaan pola makan harian.

## Fitur Utama

- Chat konsultasi kebugaran dan nutrisi
- Rekomendasi menu sehat harian
- Panduan latihan rumah tanpa alat
- Dukungan multimodal: teks, gambar, dokumen, audio, dan video
- Streaming respons real-time dengan SSE
- Riwayat sesi chat di browser
- Kalkulator BMI dan tips kalori

## Struktur Project

```text
fitcoachai/
├── client/
│   ├── fitcoach.css
│   ├── fitcoach.html
│   └── fitcoach.js
├── docs/
│   ├── PORTOFOLIO.md
│   ├── PROJECT_FLOW.md
│   └── TECHNICAL_DOCUMENTATION.md
├── server/
│   ├── .env
│   ├── index.js
│   ├── package.json
│   ├── .gitignore
│   ├── node_modules/       (akan dibuat saat npm install)
│   └── package-lock.json   (akan dibuat saat npm install)
├── starter/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── README.md
```

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- AI: Google Gemini API
- Upload: Multer
- CORS: Express CORS
- Storage: localStorage

## Quick Start

### 1. Instal dependency

```bash
cd server
npm install
```
### 2. Install nodemon global (opsional tapi disarankan)

```bash
npm install -g nodemon
```

### 3. Set environment variable

Buat file `.env` di folder `server`:

```env
GEMINI_API_KEY=your_api_key_here
```

### 4. Jalankan server

```bash
node index.js
```

Atau:

```bash
nodemon index.js
```

### 4. Buka frontend

Buka file `client/fitcoach.html` di browser.

## API Utama

- `GET /` — health check
- `POST /generate-text` — generate jawaban dari teks
- `POST /generate-from-image` — analisis gambar
- `POST /generate-from-document` — analisis dokumen
- `POST /generate-from-audio` — analisis audio
- `POST /generate-from-video` — analisis video
- `POST /api/chat` — chat multi-turn
- `POST /api/chat-stream` — streaming real-time

## Dokumentasi

- [docs/PORTOFOLIO.md](docs.PORTOFOLIO.md) — versi formal untuk portofolio
- [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) — dokumentasi teknis detail
- [docs/PROJECT_FLOW.md](docs/PROJECT_FLOW.md) — diagram alur sistem

## Catatan

Proyek ini masih berada pada tahap prototype/education, namun sudah memiliki fondasi yang cukup untuk dikembangkan lebih lanjut menjadi aplikasi kesehatan AI yang lebih lengkap.
