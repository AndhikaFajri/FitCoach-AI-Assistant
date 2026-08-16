const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const chatWidget = document.getElementById('chat-widget-container');
const fileInput = document.getElementById('file-input');
const filePreviewBar = document.getElementById('file-preview-bar');
const fileNameLabel = document.getElementById('file-name-label');
const historySidebar = document.getElementById('chat-history-sidebar');
const historyList = document.getElementById('history-list');
const voiceRecordingIndicator = document.getElementById('voice-recording-indicator');

let selectedFile = null;
let currentSessionId = null;
let sessions = {};
let isUserScrolledUp = false;
let recognition = null;
let isRecordingVoice = false;
let currentSpeechUtterance = null;
let calculatedBmiContext = null;

// ================= 1. INISIALISASI & TEMA DARK MODE =================
function initTheme() {
    const savedTheme = localStorage.getItem('fitcoach_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('fitcoach_theme', newTheme);
}

function initSessions() {
    initTheme();
    const saved = localStorage.getItem('fitcoach_sessions');
    if (saved) {
        try {
            sessions = JSON.parse(saved);
        } catch (e) {
            sessions = {};
        }
    }

    const sessionKeys = Object.keys(sessions);
    if (sessionKeys.length > 0) {
        currentSessionId = sessionKeys[sessionKeys.length - 1];
    } else {
        createNewSession();
    }
    renderHistoryList();
    renderCurrentChat();
    initSmartScroll();
}

function saveSessions() {
    localStorage.setItem('fitcoach_sessions', JSON.stringify(sessions));
    renderHistoryList();
}

function createNewSession() {
    const id = 'sess_' + Date.now();
    sessions[id] = {
        title: 'Konsultasi ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        conversation: [
            { role: 'model', text: 'Halo! Saya **FitCoach**. Mau menyusun menu makan sehat hari ini atau butuh panduan latihan fisik mandiri di rumah?' }
        ]
    };
    currentSessionId = id;
    saveSessions();
    renderCurrentChat();
}

function startNewSession() {
    createNewSession();
    if (historySidebar.classList.contains('open')) {
        toggleHistorySidebar();
    }
}

function switchSession(id) {
    stopTTS();
    currentSessionId = id;
    renderHistoryList();
    renderCurrentChat();
    if (historySidebar.classList.contains('open')) {
        toggleHistorySidebar();
    }
}

// ================= 2. PENCARIAN RIWAYAT =================
function handleSearchHistory(e) {
    const query = e.target.value.toLowerCase().trim();
    renderHistoryList(query);
}

function renderHistoryList(filterQuery = '') {
    historyList.innerHTML = '';
    const sessionKeys = Object.keys(sessions).reverse();

    const filteredKeys = sessionKeys.filter(id => {
        if (!filterQuery) return true;
        const s = sessions[id];
        const titleMatch = s.title.toLowerCase().includes(filterQuery);
        const contentMatch = s.conversation.some(m => m.text && m.text.toLowerCase().includes(filterQuery));
        return titleMatch || contentMatch;
    });

    if (filteredKeys.length === 0) {
        historyList.innerHTML = '<p style="font-size:0.75rem; color:var(--muted); text-align:center; padding:10px;">Belum ada riwayat sesi ditemukan.</p>';
        return;
    }

    filteredKeys.forEach((id) => {
        const item = document.createElement('div');
        item.className = 'history-item' + (id === currentSessionId ? ' active' : '');

        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-item-title';
        titleSpan.textContent = sessions[id].title;
        titleSpan.onclick = () => switchSession(id);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-session';
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Hapus sesi ini';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteSession(id);
        };

        item.appendChild(titleSpan);
        item.appendChild(delBtn);
        historyList.appendChild(item);
    });
}

// ================= 3. RENDER PESAN & SMART AUTO-SCROLL =================
function initSmartScroll() {
    chatBox.addEventListener('scroll', () => {
        const distanceToBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight;
        isUserScrolledUp = distanceToBottom > 60;
    });
}

function scrollToBottomIfNeeded() {
    if (!isUserScrolledUp) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function safeParseMarkdown(text) {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(marked.parse(text || ''));
    }
    return text;
}

function renderCurrentChat() {
    chatBox.innerHTML = '';
    const current = sessions[currentSessionId];
    if (!current) return;

    current.conversation.forEach((msg) => {
        appendMessageUI(msg.role === 'model' ? 'bot' : 'user', msg.text, msg.fileName);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

function attachActionsBar(wrapper, text) {
    if (!text || text.trim() === '') return;

    const existingBar = wrapper.querySelector('.message-actions-bar');
    if (existingBar) existingBar.remove();

    const actionsBar = document.createElement('div');
    actionsBar.className = 'message-actions-bar';

    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'msg-action-btn';
    ttsBtn.innerHTML = '🔊 Dengarkan';
    ttsBtn.onclick = function () {
        speakText(text, this);
    };

    const stopBtn = document.createElement('button');
    stopBtn.className = 'msg-action-btn';
    stopBtn.innerHTML = '⏹️ Stop';
    stopBtn.title = 'Hentikan Suara';
    stopBtn.onclick = function () {
        stopTTS();
    };

    const exportBtn = document.createElement('button');
    exportBtn.className = 'msg-action-btn';
    exportBtn.innerHTML = '📥 Simpan Catatan';
    exportBtn.onclick = () => exportMessageNote(text);

    actionsBar.appendChild(ttsBtn);
    actionsBar.appendChild(stopBtn);
    actionsBar.appendChild(exportBtn);
    wrapper.appendChild(actionsBar);
}

function appendMessageUI(sender, text, fileName = null, isLoading = false) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', sender);

    const msg = document.createElement('div');
    msg.classList.add('message', sender);

    if (fileName) {
        const badge = document.createElement('div');
        badge.className = 'attachment-badge';
        badge.textContent = '📎 ' + fileName;
        msg.appendChild(badge);
    }

    const content = document.createElement('div');
    content.className = 'message-content';
    if (isLoading) {
        msg.classList.add('loading');
        content.textContent = text;
    } else {
        content.innerHTML = safeParseMarkdown(text);
    }
    msg.appendChild(content);
    wrapper.appendChild(msg);

    if (sender === 'bot' && !isLoading) {
        attachActionsBar(wrapper, text);
    }

    chatBox.appendChild(wrapper);
    scrollToBottomIfNeeded();
    return { wrapper, content, msg };
}

// ================= 4. TEXT-TO-SPEECH WITH INDONESIAN NUMBER & UNIT NORMALIZER =================
const ttsState = {
    isSpeaking: false,
    isPaused: false,
    activeButton: null,
    sentences: [],
    currentIndex: 0,
    currentUtterance: null
};

function angkaKeTeks(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return '';
    if (n === 0) return 'nol';

    const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

    if (n < 12) return satuan[n];
    if (n < 20) return angkaKeTeks(n - 10) + ' belas';
    if (n < 100) return angkaKeTeks(Math.floor(n / 10)) + ' puluh' + (n % 10 !== 0 ? ' ' + satuan[n % 10] : '');
    if (n < 200) return 'seratus' + (n - 100 !== 0 ? ' ' + angkaKeTeks(n - 100) : '');
    if (n < 1000) return satuan[Math.floor(n / 100)] + ' ratus' + (n % 100 !== 0 ? ' ' + angkaKeTeks(n % 100) : '');
    if (n < 2000) return 'seribu' + (n - 1000 !== 0 ? ' ' + angkaKeTeks(n - 1000) : '');
    if (n < 1000000) return angkaKeTeks(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + angkaKeTeks(n % 1000) : '');
    if (n < 1000000000) return angkaKeTeks(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 !== 0 ? ' ' + angkaKeTeks(n % 1000000) : '');

    return n.toString();
}

function normalizeIndonesianSpeechText(rawText) {
    if (!rawText) return '';

    let text = rawText;
    text = text.replace(/[*#_`>~]/g, ' ');
    text = text.replace(/(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/g, '$1 sampai $2');

    const unitMap = [
        { regex: /\b(\d+(?:[.,]\d+)?)\s*kg\b/gi, replace: '$1 kilogram' },
        { regex: /\bkg\b/gi, replace: 'kilogram' },
        { regex: /\b(\d+(?:[.,]\d+)?)\s*cm\b/gi, replace: '$1 sentimeter' },
        { regex: /\bcm\b/gi, replace: 'sentimeter' },
        { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:kkal|kcal)\b/gi, replace: '$1 kilokalori' },
        { regex: /\b(?:kkal|kcal)\b/gi, replace: 'kilokalori' },
        { regex: /\b(\d+(?:[.,]\d+)?)\s*gr?\b/gi, replace: '$1 gram' },
        { regex: /\b(\d+(?:[.,]\d+)?)\s*ml\b/gi, replace: '$1 mililiter' },
        { regex: /\b(\d+(?:[.,]\d+)?)\s*sdm\b/gi, replace: '$1 sendok makan' },
        { regex: /\b(\d+(?:[.,]\d+)?)\s*sdt\b/gi, replace: '$1 sendok teh' },
        { regex: /%/g, replace: ' persen' },
        { regex: /\bBMI\b/g, replace: 'B M I' },
        { regex: /\bTDEE\b/g, replace: 'T D E E' },
        { regex: /\bBMR\b/g, replace: 'B M R' }
    ];

    unitMap.forEach(u => {
        text = text.replace(u.regex, u.replace);
    });

    text = text.replace(/\b(\d+)[.,](\d+)\b/g, (match, depan, belakang) => {
        const teksDepan = angkaKeTeks(depan);
        const teksBelakang = belakang.split('').map(d => angkaKeTeks(d)).join(' ');
        return `${teksDepan} koma ${teksBelakang}`;
    });

    text = text.replace(/\b\d+\b/g, (match) => {
        return angkaKeTeks(match);
    });

    return text.replace(/\s+/g, ' ').trim();
}

function stopTTS() {
    window.speechSynthesis.cancel();
    ttsState.isSpeaking = false;
    ttsState.isPaused = false;
    ttsState.sentences = [];
    ttsState.currentIndex = 0;
    ttsState.currentUtterance = null;

    if (ttsState.activeButton) {
        ttsState.activeButton.innerHTML = '🔊 Dengarkan';
        ttsState.activeButton = null;
    }
}

function speakText(text, btnElement) {
    if (!('speechSynthesis' in window)) {
        alert('Fitur suara tidak didukung di browser ini.');
        return;
    }

    if (ttsState.isSpeaking && ttsState.activeButton === btnElement && !ttsState.isPaused) {
        window.speechSynthesis.pause();
        ttsState.isPaused = true;
        btnElement.innerHTML = '▶️ Lanjutkan';
        return;
    }

    if (ttsState.isSpeaking && ttsState.activeButton === btnElement && ttsState.isPaused) {
        window.speechSynthesis.resume();
        ttsState.isPaused = false;
        btnElement.innerHTML = '⏸️ Jeda';
        return;
    }

    stopTTS();

    const processedText = normalizeIndonesianSpeechText(text);
    if (!processedText) return;

    ttsState.sentences = processedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [processedText];
    ttsState.currentIndex = 0;
    ttsState.activeButton = btnElement;
    ttsState.isSpeaking = true;
    ttsState.isPaused = false;

    btnElement.innerHTML = '⏸️ Jeda';

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang === 'id-ID' || v.lang.startsWith('id'));

    function playNextSentence() {
        if (!ttsState.isSpeaking) return;

        if (ttsState.currentIndex >= ttsState.sentences.length) {
            stopTTS();
            return;
        }

        const sentence = ttsState.sentences[ttsState.currentIndex].trim();
        if (!sentence) {
            ttsState.currentIndex++;
            playNextSentence();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        if (idVoice) {
            utterance.voice = idVoice;
        }

        utterance.onend = () => {
            if (ttsState.isSpeaking && !ttsState.isPaused) {
                ttsState.currentIndex++;
                playNextSentence();
            }
        };

        utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('TTS Info:', e);
                ttsState.currentIndex++;
                playNextSentence();
            }
        };

        ttsState.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    playNextSentence();
}

function exportMessageNote(text) {
    const parsedContent = typeof marked !== 'undefined' ? marked.parse(text) : text;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '100vw';
    printFrame.style.bottom = '100vh';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Catatan Konsultasi FitCoach</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; padding: 30px; color: #0f172a; line-height: 1.6; }
                .header { border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 20px; }
                .header h2 { color: #16a34a; margin: 0 0 6px 0; font-size: 20px; }
                .header p { margin: 0; font-size: 12px; color: #64748b; }
                .content { font-size: 13px; }
                ul, ol { margin-top: 6px; margin-bottom: 10px; padding-left: 20px; }
                li { margin-bottom: 4px; }
                strong { color: #0f172a; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🥗 FitCoach - Rekomendasi Kebugaran & Nutrisi</h2>
                <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <div class="content">${parsedContent}</div>
        </body>
        </html>
    `);
    frameDoc.close();

    setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => {
            document.body.removeChild(printFrame);
        }, 1500);
    }, 300);
}

// ================= 5. VOICE-TO-TEXT (INPUT SUARA) =================
function toggleVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Fitur pengenalan suara tidak didukung di perangkat ini.');
        return;
    }

    if (isRecordingVoice) {
        recognition.stop();
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isRecordingVoice = true;
        voiceRecordingIndicator.style.display = 'flex';
        document.getElementById('voice-btn').classList.add('active');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = (input.value ? input.value + ' ' : '') + transcript;
    };

    recognition.onerror = (err) => {
        console.warn('Voice recognition note:', err);
    };

    recognition.onend = () => {
        isRecordingVoice = false;
        voiceRecordingIndicator.style.display = 'none';
        document.getElementById('voice-btn').classList.remove('active');
    };

    recognition.start();
}

// ================= 6. STREAMING & MULTIMODAL RESPONSE =================
async function sendMessage(userMessage) {
    if (!userMessage && !selectedFile) return;

    if (!chatWidget.classList.contains('active')) {
        chatWidget.classList.add('active');
    }

    const currentFile = selectedFile;
    const fileName = currentFile ? currentFile.name : null;

    // Validasi ukuran berkas (Maksimal 25 MB)
    if (currentFile && currentFile.size > 25 * 1024 * 1024) {
        appendMessageUI('bot', 'Ukuran berkas melebihi batas 25 MB. Silakan pilih berkas yang lebih ringkas agar dapat segera dianalisis.');
        cancelAttachment();
        return;
    }

    appendMessageUI('user', userMessage || `[Mengunggah berkas: ${fileName}]`, fileName);
    input.value = '';

    const current = sessions[currentSessionId];
    current.conversation.push({
        role: 'user',
        text: userMessage || `[Lampiran Berkas: ${fileName}]`,
        fileName: fileName
    });

    if (current.conversation.length === 3) {
        current.title = (userMessage || fileName).substring(0, 20) + '...';
    }
    saveSessions();

    cancelAttachment();

    // Skenario 1: Multimodal File Upload
    if (currentFile) {
        const botElemObj = appendMessageUI('bot', 'Sedang meninjau berkas latihan atau nutrisi Anda...', null, true);
        const formData = new FormData();
        formData.append('prompt', userMessage || 'Tolong berikan ulasan dan saran seputar kebugaran atau nutrisi dari berkas ini.');

        let endpoint = 'http://localhost:3000/generate-text';
        if (currentFile.type.startsWith('image/')) {
            endpoint = 'http://localhost:3000/generate-from-image';
            formData.append('image', currentFile);
        } else if (currentFile.type.startsWith('video/')) {
            endpoint = 'http://localhost:3000/generate-from-video';
            formData.append('video', currentFile);
        } else if (currentFile.type.startsWith('audio/')) {
            endpoint = 'http://localhost:3000/generate-from-audio';
            formData.append('audio', currentFile);
        } else {
            endpoint = 'http://localhost:3000/generate-from-document';
            formData.append('document', currentFile);
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            const resultText = data.result || data.message || 'Analisis berkas telah selesai.';

            botElemObj.msg.classList.remove('loading');
            botElemObj.content.innerHTML = safeParseMarkdown(resultText);

            current.conversation.push({ role: 'model', text: resultText });
            saveSessions();
            attachActionsBar(botElemObj.wrapper, resultText);
            scrollToBottomIfNeeded();
        } catch (err) {
            console.warn(err);
            botElemObj.msg.classList.remove('loading');
            botElemObj.content.textContent = 'FitCoach sedang menerima banyak antrean konsultasi saat ini. Silakan coba unggah kembali berkas Anda sebentar lagi.';
        }
        return;
    }

    // Skenario 2: Percakapan Teks Streaming
    const botElemObj = appendMessageUI('bot', 'Menyiapkan rekomendasi sehat untuk Anda...', null, true);
    let accumulatedResponse = '';

    try {
        const payload = {
            conversation: current.conversation.map(m => ({
                role: m.role === 'model' ? 'model' : 'user',
                text: m.text
            }))
        };

        const response = await fetch('http://localhost:3000/api/chat-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Koneksi konsultasi mengalami jeda.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        botElemObj.msg.classList.remove('loading');
        botElemObj.content.innerHTML = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataPart = line.substring(6).trim();
                    if (dataPart === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(dataPart);
                        if (parsed.text) {
                            accumulatedResponse += parsed.text;
                            botElemObj.content.innerHTML = safeParseMarkdown(accumulatedResponse);
                            scrollToBottomIfNeeded();
                        }
                    } catch (err) {
                        // Chunk parsial
                    }
                }
            }
        }

        current.conversation.push({ role: 'model', text: accumulatedResponse });
        saveSessions();
        attachActionsBar(botElemObj.wrapper, accumulatedResponse);
        scrollToBottomIfNeeded();

    } catch (err) {
        console.warn(err);
        botElemObj.msg.classList.remove('loading');
        botElemObj.content.textContent = 'Maaf, FitCoach sedang menerima lonjakan sesi konsultasi saat ini 🏃💨. Silakan beri jeda sekitar 15-20 detik lalu tanyakan kembali, ya!';
    }
}

// ================= 7. MODAL KALKULATOR BMI & TDEE =================
function openBmiModal() {
    document.getElementById('bmi-modal').classList.add('active');
}

function closeBmiModal() {
    document.getElementById('bmi-modal').classList.remove('active');
}

function handleCalculateBmi(e) {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('bmi-weight').value);
    const height = parseFloat(document.getElementById('bmi-height').value);
    const age = parseInt(document.getElementById('bmi-age').value);
    const gender = document.getElementById('bmi-gender').value;
    const activity = parseFloat(document.getElementById('bmi-activity').value);

    const heightMeter = height / 100;
    const bmi = (weight / (heightMeter * heightMeter)).toFixed(1);

    let category = 'Normal';
    if (bmi < 18.5) category = 'Kurus / Kurang';
    else if (bmi >= 23 && bmi < 25) category = 'Kelebihan Berat Badan';
    else if (bmi >= 25) category = 'Obesitas';

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;
    const tdee = Math.round(bmr * activity);

    document.getElementById('bmi-score').textContent = bmi;
    document.getElementById('bmi-category').textContent = category;
    document.getElementById('tdee-score').textContent = tdee;
    document.getElementById('bmi-result-area').style.display = 'block';

    calculatedBmiContext = { weight, height, age, gender: gender === 'male' ? 'Pria' : 'Wanita', bmi, category, tdee };
}

function sendBmiContextToChat() {
    closeBmiModal();
    if (!calculatedBmiContext) return;

    const promptText = `Saya telah menghitung profil kebugaran saya:\n- Berat: ${calculatedBmiContext.weight} kg, Tinggi: ${calculatedBmiContext.height} cm, Usia: ${calculatedBmiContext.age} tahun (${calculatedBmiContext.gender})\n- Skor BMI: ${calculatedBmiContext.bmi} (${calculatedBmiContext.category})\n- Estimasi Kebutuhan Kalori Harian (TDEE): ${calculatedBmiContext.tdee} kkal.\n\nBerdasarkan data profil tersebut, tolong susunkan rekomendasi pola makan harian dan rencana latihan olahraga yang paling cocok untuk saya.`;

    if (!chatWidget.classList.contains('active')) {
        toggleChat();
    }
    sendMessage(promptText);
}

// ================= 8. KONTROL WIDGET, CONFIRM MODAL, URL & EVENT LISTENER =================
function resetUrlHash(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
}

function toggleChat() {
    chatWidget.classList.toggle('active');
    if (!chatWidget.classList.contains('active')) {
        stopTTS();
    } else {
        input.focus();
    }
}

function toggleHistorySidebar() {
    historySidebar.classList.toggle('open');
}

function scrollChips(distance) {
    document.getElementById('quick-prompts').scrollBy({ left: distance, behavior: 'smooth' });
}

function handleFileSelected(e) {
    if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        fileNameLabel.textContent = '📎 ' + selectedFile.name;
        filePreviewBar.style.display = 'flex';
    }
}

function cancelAttachment() {
    selectedFile = null;
    fileInput.value = '';
    filePreviewBar.style.display = 'none';
}

function showCustomConfirm(title, desc, onConfirm) {
    const modal = document.getElementById('custom-confirm-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');

    modalTitle.textContent = title;
    modalDesc.textContent = desc;

    btnConfirm.className = 'btn btn-danger';
    btnConfirm.textContent = 'Ya, Hapus';

    modal.classList.add('active');

    const newConfirmBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirmBtn, btnConfirm);

    const newCancelBtn = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(newCancelBtn, btnCancel);

    document.getElementById('modal-btn-confirm').addEventListener('click', () => {
        modal.classList.remove('active');
        onConfirm();
    });

    document.getElementById('modal-btn-cancel').addEventListener('click', () => {
        modal.classList.remove('active');
    });
}

function deleteSession(id) {
    showCustomConfirm('Hapus Sesi Percakapan', 'Sesi konsultasi ini akan dihapus dari riwayat Anda.', () => {
        delete sessions[id];
        const remainingKeys = Object.keys(sessions);

        if (id === currentSessionId) {
            if (remainingKeys.length > 0) {
                currentSessionId = remainingKeys[remainingKeys.length - 1];
            } else {
                createNewSession();
                return;
            }
        }
        saveSessions();
        renderCurrentChat();
    });
}

function clearAllSessions() {
    showCustomConfirm('Hapus Semua Riwayat', 'Semua riwayat konsultasi kebugaran Anda akan dihapus secara menyeluruh.', () => {
        sessions = {};
        createNewSession();
    });
}

function handleQuickAction(promptText) {
    sendMessage(promptText);
}

// Single-source Event Listener
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const messageText = input.value.trim();
    if (messageText || selectedFile) {
        sendMessage(messageText);
    }
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const messageText = input.value.trim();
        if (messageText || selectedFile) {
            sendMessage(messageText);
        }
    }
});

document.addEventListener('DOMContentLoaded', initSessions);