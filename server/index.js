import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();

// Batas ukuran berkas 25 MB
const upload = multer({
    limits: { fileSize: 25 * 1024 * 1024 }
});

// Inisialisasi client Gemini AI standar Hacktiv8 Sesi 2 & 3
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Model standar materi Hacktiv8
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_INSTRUCTION = `
Kamu adalah "FitCoach", asisten kebugaran dan konsultan nutrisi digital yang profesional, suportif, dan berbasis data ilmiah terpercaya.

PANDUAN & PERILAKU:
1. Persona & Nada Bicara (Tone):
   - Bersikaplah ramah, penuh motivasi, positif, dan solutif layaknya seorang Coach kebugaran pribadi.
   - Gunakan Bahasa Indonesia yang baik, santun, dan mudah dipahami oleh pemula.
   - Berikan dorongan semangat (encouragement) yang realistis untuk membentuk kebiasaan hidup sehat berkelanjutan.

2. Batasan & Anti-Halusinasi (Constraints):
   - HANYA jawab pertanyaan seputar kebugaran, pola makan sehat, nutrisi, hidrasi, dan olahraga harian.
   - Jika ditanya topik di luar kebugaran dan nutrisi, tolak secara sopan dan arahkan kembali pengguna ke topik kesehatan.
   - JANGAN MENGARANG informasi ilmiah, dosis suplemen ekstrem, atau klaim kesehatan yang tidak berdasar.
   - JANGAN PERNAH memberikan diagnosis medis penyakit kritis atau resep obat dokter. Sarankan konsultasi ke dokter atau ahli gizi klinis jika pengguna memiliki kondisi medis khusus.

3. Panduan Analisis Multimodal (Media & Berkas):
   - Gambar Makanan: Estimasi porsi, keseimbangan makronutrisi (karbohidrat, protein, lemak), serta saran perbaikan gizi.
   - Gambar/Video Gerakan Olahraga: Evaluasi teknik dasar, postur, serta tips keamanan untuk mencegah cedera.
   - Dokumen/Catatan Kesehatan: Rangkum poin-poin penting dan sesuaikan saran olahraga atau kalori sesuai kebutuhan yang tertera.
   - Audio: Dengarkan keluhan atau catatan latihan pengguna dengan saksama dan berikan jawaban yang relevan dan praktis.

4. Format Output:
   - Sajikan rencana menu harian secara terstruktur (Sarapan, Makan Siang, Makan Malam, Camilan).
   - Gunakan poin-poin (bullet points) ringkas, padat, dan jelas tanpa jarak baris kosong yang berlebihan.
   - Cantumkan estimasi repetisi, set, durasi istirahat, atau takaran porsi yang realistis dan aman dipraktikkan.
`.trim();

// Helper Format Pesan Kesalahan Ramah untuk Pengguna
function formatCoachErrorMessage(error, isFileUpload = false) {
    const errorStr = (error?.message || '').toLowerCase();

    if (error?.status === 429 || errorStr.includes('quota') || errorStr.includes('resource_exhausted')) {
        return 'Halo! FitCoach sedang menerima sangat banyak sesi konsultasi saat ini 🏃💨. Mohon beri jeda sekitar 15–20 detik lalu tanyakan kembali, ya!';
    }
    if (error?.status === 503 || errorStr.includes('high demand') || errorStr.includes('unavailable')) {
        return 'Antrean konsultasi saat ini sedang cukup ramai. Silakan kirimkan kembali pertanyaan Anda dalam beberapa saat.';
    }
    if (isFileUpload) {
        return 'FitCoach belum bisa membaca berkas tersebut dengan jelas. Pastikan berkas yang Anda kirimkan berhubungan dengan menu makanan, catatan kesehatan, atau video latihan olahraga.';
    }
    return 'Halo! FitCoach siap membantu Anda. Silakan coba tanyakan kembali menu sehat, target kalori, atau panduan olahraga yang Anda butuhkan.';
}

// Helper sanitasi percakapan multi-turn
function sanitizeConversation(rawConversation) {
    if (!Array.isArray(rawConversation)) return [];

    const validMessages = rawConversation.filter(msg => msg && msg.text && typeof msg.text === 'string' && msg.text.trim() !== '');

    while (validMessages.length > 0 && validMessages[0].role !== 'user') {
        validMessages.shift();
    }

    return validMessages.slice(-8).map(msg => ({
        role: (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user',
        parts: [{ text: msg.text.trim() }]
    }));
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('FitCoach AI Assistant Server is running!');
});

// ================= ENDPOINT STANDAR MATERI HACKTIV8 =================

// Endpoint 1 (Sesi 2): POST /generate-text (Tepat sesuai Slide Materi Hacktiv8 Sesi 2)
app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Pertanyaan atau pesan konsultasi tidak boleh kosong.' });

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error('[Error Detail /generate-text]:', e);
        res.status(500).json({ message: formatCoachErrorMessage(e, false) });
    }
});

// Endpoint 2 (Sesi 2): POST /generate-from-image
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const { prompt } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Silakan pilih gambar makanan atau aktivitas fisik yang ingin dianalisis.' });

    const base64Image = req.file.buffer.toString('base64');
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || 'Analisis gambar ini dari sudut pandang kebugaran, nutrisi, atau porsi makan sehat.' },
                { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error('[Error Detail /generate-from-image]:', e);
        res.status(500).json({ message: formatCoachErrorMessage(e, true) });
    }
});

// Endpoint 3 (Sesi 2): POST /generate-from-document
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const { prompt } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Silakan lampirkan dokumen ringkasan kesehatan atau nutrisi Anda.' });

    const base64Document = req.file.buffer.toString('base64');
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt ?? 'Tolong analisis isi dokumen ini dan berikan saran kebugaran atau nutrisi yang relevan.' },
                { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error('[Error Detail /generate-from-document]:', e);
        res.status(500).json({ message: formatCoachErrorMessage(e, true) });
    }
});

// Endpoint 4 (Sesi 2): POST /generate-from-audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const { prompt } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Silakan lampirkan rekaman suara pertanyaan atau catatan Anda.' });

    const base64Audio = req.file.buffer.toString('base64');
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt ?? 'Dengarkan rekaman audio ini dan berikan tanggapan panduan kebugaran atau nutrisi yang sesuai.' },
                { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error('[Error Detail /generate-from-audio]:', e);
        res.status(500).json({ message: formatCoachErrorMessage(e, true) });
    }
});

// Endpoint 5 (Pengembangan): POST /generate-from-video
app.post('/generate-from-video', upload.single('video'), async (req, res) => {
    const { prompt } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Silakan lampirkan video gerakan latihan atau olahraga Anda.' });

    const base64Video = req.file.buffer.toString('base64');
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || 'Analisis video gerakan olahraga ini. Berikan evaluasi postur, teknik, dan tips kebugaran yang tepat.' },
                { inlineData: { data: base64Video, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error('[Error Detail /generate-from-video]:', e);
        res.status(500).json({ message: formatCoachErrorMessage(e, true) });
    }
});

// Endpoint 6 (Sesi 3): POST /api/chat (Multi-turn Chatbot Standar Hacktiv8)
app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;

    if (!Array.isArray(conversation)) {
        return res.status(400).json({ error: 'Messages must be an array' });
    }

    const contents = sanitizeConversation(conversation);

    if (contents.length === 0) {
        return res.status(200).json({ result: 'Halo! Ada yang bisa FitCoach bantu seputar pola makan sehat atau olahraga harian?' });
    }

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: contents,
            config: {
                temperature: 0.7,
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error('[Error Detail /api/chat]:', e);
        res.status(500).json({ error: formatCoachErrorMessage(e, false) });
    }
});

// Endpoint 7 (Tambahan): POST /api/chat-stream (Streaming Real-time SSE)
app.post('/api/chat-stream', async (req, res) => {
    const { conversation } = req.body;

    if (!Array.isArray(conversation)) {
        return res.status(400).json({ error: 'Format percakapan tidak valid.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const contents = sanitizeConversation(conversation);

    if (contents.length === 0) {
        res.write(`data: ${JSON.stringify({ text: 'Halo! Ada yang bisa FitCoach bantu seputar rencana makan sehat atau program latihan Anda?' })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
    }

    try {
        const streamResult = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents: contents,
            config: {
                temperature: 0.7,
                systemInstruction: SYSTEM_INSTRUCTION
            },
        });

        for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        return res.end();
    } catch (e) {
        console.error('[Error Detail /api/chat-stream]:', e);
        const friendlyMsg = formatCoachErrorMessage(e, false);
        res.write(`data: ${JSON.stringify({ text: friendlyMsg })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
    }
});

// Middleware Multer Error Handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            message: 'Ukuran berkas melebihi batas 25 MB. Silakan pilih berkas yang lebih ringkas agar dapat dianalisis.'
        });
    }
    if (err) {
        return res.status(500).json({ message: 'Terjadi kendala saat membaca berkas. Silakan coba unggah kembali.' });
    }
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FitCoach Server is ready on http://localhost:${PORT} using ${GEMINI_MODEL}`));