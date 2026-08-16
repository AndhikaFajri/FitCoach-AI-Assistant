const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Array untuk menyimpan riwayat percakapan
let conversation = [];

// Fungsi untuk menambahkan pesan ke antarmuka chat
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Tampilkan pesan user di antarmuka
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Simpan pesan user ke dalam riwayat
  conversation.push({ role: 'user', text: userMessage });

  // 3. Tampilkan pesan sementara saat bot berpikir
  const botMessageElem = appendMessage('bot', 'FitCoach AI sedang mengetik...');

  try {
    // 4. Kirim request ke backend Express di localhost:3000
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation: conversation })
    });

    const data = await response.json();

    // 5. Ganti pesan sementara dengan jawaban AI yang sebenarnya
    if (response.ok && data.result) {
      botMessageElem.textContent = data.result;
      // Simpan jawaban bot ke riwayat
      conversation.push({ role: 'model', text: data.result });
    } else {
      botMessageElem.textContent = data.error || 'Maaf, tidak menerima respons dari server.';
    }
  } catch (err) {
    console.error(err);
    botMessageElem.textContent = 'Gagal terhubung ke server backend.';
  }
});