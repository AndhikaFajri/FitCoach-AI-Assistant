# Dokumentasi Teknis FitCoach AI

## Tujuan Aplikasi

FitCoach AI adalah aplikasi web yang berfungsi sebagai konsultan kebugaran dan nutrisi digital. Aplikasi ini membantu pengguna dalam menyusun pola makan sehat, menerima rekomendasi latihan rumah, dan menjawab pertanyaan terkait kesehatan dengan pendekatan yang ramah dan praktis.

## Arsitektur Sistem

### Frontend
Folder `client` berisi:

- `fitcoach.html` — struktur UI
- `fitcoach.css` — styling dan responsivitas
- `fitcoach.js` — logika chat, sesi, upload, tema, dan integrasi API

### Backend
Folder `server` berisi:

- `index.js` — server utama Express.js
- `package.json` — dependency dan metadata project

### Layer Utama

1. Client layer
   - chat interface
   - quick prompts
   - history sidebar
   - BMI modal
   - theme toggle

2. API layer
   - request validation
   - file upload handling
   - sanitization logic
   - response formatting

3. AI layer
   - Gemini text generation
   - multimodal file analysis
   - real-time stream generation

## Alur Kerja Aplikasi

### Alur Chat Reguler

1. Pengguna membuka frontend.
2. User mengetik pertanyaan atau memilih quick prompt.
3. Frontend mengirim request ke backend.
4. Backend memvalidasi input dan memanggil model AI.
5. Hasil dikirim kembali dan ditampilkan di UI.

### Alur Streaming

1. Frontend memanggil endpoint `/api/chat-stream`.
2. Server menetapkan header `text/event-stream`.
3. server memanggil `generateContentStream`.
4. Setiap chunk teks dikirim ke client secara real-time.
5. Server mengirim `data: [DONE]` saat proses selesai.

## Endpoint API

| Endpoint | Method | Deskripsi |
| --- | --- | --- |
| `/` | GET | Health check |
| `/generate-text` | POST | Generate jawaban teks |
| `/generate-from-image` | POST | Analisis gambar |
| `/generate-from-document` | POST | Analisis dokumen |
| `/generate-from-audio` | POST | Analisis audio |
| `/generate-from-video` | POST | Analisis video |
| `/api/chat` | POST | Chat multi-turn |
| `/api/chat-stream` | POST | Streaming real-time SSE |

## Prompt dan Persona

Server menggunakan `SYSTEM_INSTRUCTION` untuk membentuk persona FitCoach. Persona ini berfokus pada:

- bahasa Indonesia yang ramah dan mudah dimengerti
- saran nutrisi dan olahraga yang aman
- format jawaban yang terstruktur
- pencegahan informasi yang terlalu ekstrem atau tidak berdasar

## Data Handling

### Input
- request JSON untuk chat dan prompt
- file upload untuk media seperti gambar, video, audio, dan dokumen

### Sanitasi
- `sanitizeConversation` membatasi konteks percakapan yang dikirim ke model
- pesan yang kosong atau invalid akan dihindari

### Error Handling
- error quota dan resource exhaustion {{gunakan pesan ramah}}
- file terlalu besar akan ditolak dengan pesan yang jelas
- error umum akan dibungkus agar tetap nyaman untuk pengguna

## Keamanan dan Produksi

Untuk pengembangan lebih lanjut, aspek berikut perlu ditambahkan:

- autentikasi user
- rate limiting
- validasi API lebih ketat
- logging dan monitoring
- penyimpanan riwayat chat ke database
- keamanan file upload yang lebih robust

## Pengembangan Selanjutnya

- dashboard progres user
- personalisasi diet berdasarkan target berat badan
- tracking latihan & progress
- fitur reminder harian
- integrasi database dan autentikasi

## Kesimpulan

FitCoach AI merupakan prototype AI health assistant yang relevan untuk kebutuhan edukasi, konsultasi, dan pengembangan produk digital kesehatan di masa depan.
