# Diagram Alur Proyek FitCoach AI

```mermaid
flowchart TD
    U[Pengguna] --> FE[Frontend Web]
    FE --> UI[Chat UI / BMI / Quick Prompt / Theme]
    UI --> API[Express API Server]
    API --> VALIDATE[Validasi Input]
    VALIDATE --> TEXT[Generate Text]
    VALIDATE --> FILE[Upload File Media]
    FILE --> IMG[Image / Audio / Video / Document]
    TEXT --> GEMINI[Gemini AI]
    IMG --> GEMINI
    GEMINI --> RESP[Response / Stream Output]
    RESP --> API
    API --> UI
    UI --> STORE[LocalStorage History]
    UI --> USER[Pengguna]
```

## Penjelasan Singkat

- Pengguna berinteraksi dengan frontend.
- Frontend mengirim request ke server Express.
- Server melakukan validasi input dan mengelola upload file.
- Data dikirim ke model Gemini untuk diproses.
- Hasil dikembalikan ke client dalam format chat biasa atau streaming.
- Riwayat chat disimpan di browser melalui `localStorage`.

## Tujuan Diagram

Diagram ini membantu memahami aliran data secara cepat, mulai dari input pengguna hingga hasil dari AI. Ini cocok untuk portofolio, presentasi, atau dokumentasi teknis.
