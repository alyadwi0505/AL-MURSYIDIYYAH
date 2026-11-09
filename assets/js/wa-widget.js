/**
 * SDIT AL-MURSYIDIYYAH — WHATSAPP AUTOMATION & CHAT SIMULATOR
 * Nomor Resmi Admin PPDB: 081380327256 (https://wa.me/6281380327256)
 */

const ADMIN_WA_NUMBER = '6281380327256';
const ADMIN_WA_DISPLAY = '0813-8032-7256';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Create and inject Widget HTML dynamically
  injectWhatsAppWidget();

  const triggerBtn = document.getElementById('waTriggerBtn');
  const chatWindow = document.getElementById('waChatWindow');
  const closeBtn = document.getElementById('waCloseBtn');
  const sendBtn = document.getElementById('waSendBtn');
  const inputField = document.getElementById('waInputField');
  const chatBody = document.getElementById('waChatBody');
  const typingIndicator = document.getElementById('waTypingIndicator');
  const unreadBadge = document.getElementById('waUnreadBadge');

  if (!triggerBtn || !chatWindow) return;

  // Toggle chat window
  triggerBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
      if (unreadBadge) unreadBadge.style.display = 'none';
      if (inputField) inputField.focus();
      scrollChatToBottom();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatWindow.classList.remove('open');
    });
  }

  // Handle Quick Replies
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.wa-quick-chip');
    if (chip) {
      const topic = chip.getAttribute('data-topic');
      handleUserTopicSelect(topic);
    }
  });

  // Handle User Input Submission
  function submitUserMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    inputField.value = '';
    scrollChatToBottom();

    // Trigger Automated Bot Response
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      handleCustomQuestionResponse(text);
      scrollChatToBottom();
    }, 900);
  }

  if (sendBtn && inputField) {
    sendBtn.addEventListener('click', submitUserMessage);
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitUserMessage();
      }
    });
  }

  function appendMessage(text, sender = 'bot', actionBtn = null) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const msgDiv = document.createElement('div');
    msgDiv.className = `wa-message wa-message-${sender}`;

    let html = `<div>${text}</div>`;

    if (actionBtn) {
      html += actionBtn;
    }

    html += `
      <div class="wa-msg-meta">
        <span>${timeStr}</span>
        ${sender === 'user' ? '<span style="color:#4fc3f7;">✓✓</span>' : ''}
      </div>
    `;

    msgDiv.innerHTML = html;
    chatBody.insertBefore(msgDiv, typingIndicator);
    scrollChatToBottom();
  }

  function showTyping(show) {
    if (typingIndicator) {
      if (show) {
        typingIndicator.classList.add('active');
        scrollChatToBottom();
      } else {
        typingIndicator.classList.remove('active');
      }
    }
  }

  function scrollChatToBottom() {
    setTimeout(() => {
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
  }

  // Automated Knowledge Base Handler
  function handleUserTopicSelect(topic) {
    showTyping(true);

    setTimeout(() => {
      showTyping(false);

      if (topic === 'ppdb') {
        const reply = `
          <strong>📋 Informasi & Persyaratan PPDB:</strong><br><br>
          • <strong>Usia:</strong> Minimal 6 tahun per 1 Juli 2026.<br>
          • <strong>Alur:</strong> 1. Pengisian formulir ➔ 2. Verifikasi dokumen oleh tim PPDB ➔ 3. Wawancara wali murid ➔ 4. Pengumuman & daftar ulang.<br>
          • <strong>Berkas:</strong> Pas foto 3x4, Akta Kelahiran, Kartu Keluarga, dan KTP Orang Tua.
        `;
        const waLink = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent("Assalamu'alaikum Admin SDIT Al-Mursyidiyyah, saya ingin bertanya lebih lanjut mengenai persyaratan dan pendaftaran PPDB.")}`;
        const btnHtml = `
          <div style="margin-top:0.6rem; display:flex; flex-direction:column; gap:0.4rem;">
            <a href="ppdb.html" class="wa-action-btn-bubble" style="background:#07594F;">
              📝 Buka Formulir Pendaftaran Online
            </a>
            <a href="${waLink}" target="_blank" class="wa-action-btn-bubble">
              💬 Lanjut Chat WA Admin (${ADMIN_WA_DISPLAY})
            </a>
          </div>
        `;
        appendMessage(reply, 'bot', btnHtml);

      } else if (topic === 'biaya') {
        const reply = `
          <strong>💵 Informasi Biaya Pendaftaran & Pendidikan:</strong><br><br>
          • Pendaftaran PPDB dapat dilakukan secara online melalui website ini.<br>
          • Rincian lengkap biaya formulir, sarana/uang pangkal, SPP bulanan, dan seragam sekolah dapat dikirimkan langsung oleh admin panitia.
        `;
        const waLink = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent("Assalamu'alaikum Admin SDIT Al-Mursyidiyyah, mohon informasi rincian brosur biaya masuk dan SPP sekolah.")}`;
        const btnHtml = `
          <div style="margin-top:0.6rem;">
            <a href="${waLink}" target="_blank" class="wa-action-btn-bubble">
              📄 Minta Rincian Biaya via WhatsApp
            </a>
          </div>
        `;
        appendMessage(reply, 'bot', btnHtml);

      } else if (topic === 'program') {
        const reply = `
          <strong>📖 Pembiasaan Harian & Ekstrakurikuler:</strong><br><br>
          • <strong>Pembiasaan Harian:</strong> Sholat Dhuha, English Morning Boost, Tadarus setiap hari, Sholat sunnah qobliah dzuhur, & Sholat berjamaah.<br>
          • <strong>4 Ekstrakurikuler:</strong> Public Speaking, Silat, Math & Science Club, English Club.<br>
          • <strong>Tahfidz:</strong> Bimbingan tahfidz & tartil Al-Qur'an intensif.
        `;
        const waLink = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent("Assalamu'alaikum Admin SDIT Al-Mursyidiyyah, saya ingin konsultasi mengenai program pembiasaan harian dan ekstrakurikuler sekolah.")}`;
        const btnHtml = `
          <div style="margin-top:0.6rem; display:flex; flex-direction:column; gap:0.4rem;">
            <a href="program.html" class="wa-action-btn-bubble" style="background:#07594F;">
              🔍 Buka Rincian Program Sekolah
            </a>
            <a href="${waLink}" target="_blank" class="wa-action-btn-bubble">
              💬 Diskusi via WhatsApp
            </a>
          </div>
        `;
        appendMessage(reply, 'bot', btnHtml);

      } else if (topic === 'kunjungan') {
        const reply = `
          <strong>🏫 Fasilitas & Jadwal Kunjungan:</strong><br><br>
          Fasilitas kami meliputi <strong>Gedung 3 lantai</strong>, <strong>ruangan kelas full AC</strong>, <strong>lapangan sekolah</strong>, dan <strong>halaman sekolah yang nyaman</strong>.<br><br>
          Ayah dan Bunda sangat dipersilakan berkunjung untuk melihat langsung suasana belajar kami.<br>
          • <strong>Hari:</strong> Senin – Jumat (08.00 – 14.30 WIB)<br>
          • <strong>Sabtu:</strong> 08.00 – 12.00 WIB (Dengan konfirmasi)
        `;
        const waLink = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent("Assalamu'alaikum Admin SDIT Al-Mursyidiyyah, saya berencana melakukan kunjungan/survei ke sekolah pada hari...")}`;
        const btnHtml = `
          <div style="margin-top:0.6rem;">
            <a href="${waLink}" target="_blank" class="wa-action-btn-bubble">
              🗓️ Buat Janji Kunjungan via WhatsApp
            </a>
          </div>
        `;
        appendMessage(reply, 'bot', btnHtml);
      }
    }, 700);
  }

  function handleCustomQuestionResponse(userQuestion) {
    const waText = encodeURIComponent(
      `Assalamu'alaikum Admin SDIT Al-Mursyidiyyah,\n\nSaya ingin menanyakan perihal berikut:\n"${userQuestion}"\n\nMohon informasinya. Terima kasih!`
    );
    const waUrl = `https://wa.me/${ADMIN_WA_NUMBER}?text=${waText}`;

    const reply = `
      Terima kasih pertanyaannya, Ayah/Bunda! 😊<br><br>
      Pertanyaan Anda: <em>"${userQuestion}"</em> sudah kami rangkumkan. Untuk respon paling cepat dari tim panitia PPDB, silakan klik tombol di bawah untuk langsung terhubung ke WhatsApp Admin kami:
    `;

    const btnHtml = `
      <div style="margin-top:0.6rem;">
        <a href="${waUrl}" target="_blank" class="wa-action-btn-bubble">
          <i data-lucide="send" style="width:14px;height:14px;"></i> Kirim ke WA Admin (${ADMIN_WA_DISPLAY})
        </a>
      </div>
    `;

    appendMessage(reply, 'bot', btnHtml);
    if (window.lucide) lucide.createIcons();
  }

  function injectWhatsAppWidget() {
    // Remove existing legacy static button if present
    const legacyFloats = document.querySelectorAll('.whatsapp-float');
    legacyFloats.forEach(el => el.remove());

    const widgetHtml = `
      <div class="wa-widget-container" id="waWidgetContainer">
        <!-- Floating Trigger Button -->
        <button class="wa-trigger-btn" id="waTriggerBtn" aria-label="Tanya Admin via WhatsApp">
          <i data-lucide="message-circle" style="width:22px;height:22px;"></i>
          <span>Tanya Admin</span>
          <span class="wa-unread-badge" id="waUnreadBadge">1</span>
        </button>

        <!-- Interactive Chat Popup Window -->
        <div class="wa-chat-window" id="waChatWindow">
          <!-- Header -->
          <div class="wa-chat-header">
            <div class="wa-header-info">
              <img src="assets/img/logo-transparent.png" alt="Logo SDIT" class="wa-avatar">
              <div class="wa-header-text">
                <h4>Admin SDIT Al-Mursyidiyyah</h4>
                <div class="wa-header-status">
                  <span class="wa-status-dot"></span>
                  <span>Online • Siap Membantu</span>
                </div>
              </div>
            </div>
            <div class="wa-header-actions">
              <a href="https://wa.me/${ADMIN_WA_NUMBER}" target="_blank" title="Langsung Buka WhatsApp" class="wa-header-btn">
                <i data-lucide="external-link" style="width:18px;height:18px;"></i>
              </a>
              <button class="wa-header-btn" id="waCloseBtn" title="Tutup Chat">
                <i data-lucide="x" style="width:20px;height:20px;"></i>
              </button>
            </div>
          </div>

          <!-- Chat Body -->
          <div class="wa-chat-body" id="waChatBody">
            <div class="wa-date-divider">Hari Ini</div>

            <!-- Welcome Message from Bot -->
            <div class="wa-message wa-message-bot">
              <div>
                <strong>Assalamu'alaikum Warahmatullahi Wabarakatuh! 🌿</strong><br><br>
                Selamat datang di Layanan Informasi Resmi <strong>SDIT Al-Mursyidiyyah</strong>.<br>
                Ada yang bisa kami bantu seputar sekolah dan PPDB, Ayah/Bunda?
              </div>
              <div class="wa-msg-meta">
                <span>08:00</span>
              </div>
            </div>

            <!-- Quick Options -->
            <div class="wa-quick-replies" id="waQuickReplies">
              <div class="wa-quick-chip" data-topic="ppdb">
                <span>📋 Info & Persyaratan PPDB</span>
                <span>➔</span>
              </div>
              <div class="wa-quick-chip" data-topic="biaya">
                <span>💵 Jadwal & Biaya (Early Bird)</span>
                <span>➔</span>
              </div>
              <div class="wa-quick-chip" data-topic="program">
                <span>📖 Program Tahfidz & Kurikulum</span>
                <span>➔</span>
              </div>
              <div class="wa-quick-chip" data-topic="kunjungan">
                <span>🏫 Jadwal Kunjungan / Survei</span>
                <span>➔</span>
              </div>
            </div>

            <!-- Typing Indicator -->
            <div class="wa-typing" id="waTypingIndicator">
              <span class="wa-typing-dot"></span>
              <span class="wa-typing-dot"></span>
              <span class="wa-typing-dot"></span>
            </div>
          </div>

          <!-- Footer / Input Field -->
          <div class="wa-chat-footer">
            <input type="text" class="wa-input-field" id="waInputField" placeholder="Ketik pertanyaan Anda...">
            <button class="wa-send-btn" id="waSendBtn" aria-label="Kirim Pesan">
              <i data-lucide="send" style="width:16px;height:16px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHtml);
    if (window.lucide) lucide.createIcons();
  }
});

