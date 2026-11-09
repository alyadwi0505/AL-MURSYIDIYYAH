/* ==========================================================================
   SDIT AL-MURSYIDIYYAH — PPDB ONLINE WIZARD & REGISTRATION HANDLER
   Full-stack integration: saves to SQLite Database via /api/ppdb with file uploads.
   ========================================================================== */

// Helper: Resolve backend API URL for both http://localhost:3000 and file:// or other dev ports
function resolveApiUrl(endpoint) {
  if (typeof window === 'undefined') return endpoint;
  if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
    return `http://localhost:3000${endpoint}`;
  }
  return endpoint;
}

// Helper: Format Date to Indonesian (e.g. 5 Desember 2020)
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const cleanStr = String(dateStr).trim().replace(' ', 'T');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = document.getElementById('ppdbWizard');
  if (wizard) {
    let currentStep = 1;
    const totalSteps = 3;
    let isSubmitting = false;

  const stepItems = document.querySelectorAll('.wizard-step-item');
  const formSteps = document.querySelectorAll('.form-step');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnSubmit = document.getElementById('btnSubmit');
  const regResult = document.getElementById('regResult');

  // File upload previews
  const dropzones = document.querySelectorAll('.upload-dropzone');
  dropzones.forEach(zone => {
    const input = zone.querySelector('input[type="file"]');
    const preview = zone.querySelector('.file-preview');

    if (input && preview) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          const sizeKb = (file.size / 1024).toFixed(1);
          preview.textContent = `✓ Terpilih: ${file.name} (${sizeKb} KB)`;
          preview.style.display = 'block';
          zone.classList.add('has-file');
          zone.style.borderColor = '#2b9348';
          zone.style.backgroundColor = '#f6fcf8';
        }
      });
    }
  });

  // Clear red border on input/change
  const allInputs = wizard.querySelectorAll('input, select, textarea');
  allInputs.forEach(inp => {
    inp.addEventListener('input', () => {
      if (inp.value && inp.value.trim()) inp.style.borderColor = 'var(--color-border)';
    });
    inp.addEventListener('change', () => {
      if (inp.value && inp.value.trim()) inp.style.borderColor = 'var(--color-border)';
    });
  });

  function showStep(step) {
    formSteps.forEach(el => el.classList.remove('active'));
    stepItems.forEach((item, idx) => {
      const stepNum = idx + 1;
      item.classList.remove('active', 'completed');
      if (stepNum === step) {
        item.classList.add('active');
      } else if (stepNum < step) {
        item.classList.add('completed');
      }
    });

    const activeFormStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (activeFormStep) {
      activeFormStep.classList.add('active');
    }

    // Toggle button visibilities
    if (btnPrev) {
      btnPrev.style.display = step === 1 ? 'none' : 'inline-flex';
    }
    if (btnNext) {
      btnNext.style.display = step === totalSteps ? 'none' : 'inline-flex';
    }
    if (btnSubmit) {
      btnSubmit.style.display = step === totalSteps ? 'inline-flex' : 'none';
    }

    // Scroll smoothly to form top
    wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(step) {
    const currentFormStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!currentFormStep) return true;

    // Files are optional for initial online registration, only validate required text/select
    const requiredInputs = currentFormStep.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    let firstInvalid = null;

    requiredInputs.forEach(input => {
      if (input.type === 'file') return; // File uploads can be completed during verification

      if (!input.value || !input.value.trim()) {
        isValid = false;
        input.style.borderColor = '#d93838';
        if (!firstInvalid) firstInvalid = input;
      } else {
        input.style.borderColor = 'var(--color-border)';
      }
    });

    if (!isValid) {
      if (firstInvalid) {
        if (typeof firstInvalid.focus === 'function') {
          firstInvalid.focus();
        }
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      alert('Mohon lengkapi kolom yang bertanda bintang (*) sebelum melanjutkan.');
    }

    return isValid;
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        if (currentStep < totalSteps) {
          currentStep++;
          showStep(currentStep);
        }
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
      }
    });
  }

  // Handle Form Submission with Real Database API
  async function handleFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    // Check essential fields
    const namaSiswaInput = document.getElementById('namaSiswa');
    const noHpOrtuInput = document.getElementById('noHpOrtu');

    if (!namaSiswaInput || !namaSiswaInput.value.trim()) {
      showStep(1);
      if (namaSiswaInput) {
        namaSiswaInput.focus();
        namaSiswaInput.style.borderColor = '#d93838';
      }
      alert('Mohon isi Nama Lengkap Siswa pada Langkah 1.');
      return;
    }

    if (!noHpOrtuInput || !noHpOrtuInput.value.trim()) {
      showStep(2);
      if (noHpOrtuInput) {
        noHpOrtuInput.focus();
        noHpOrtuInput.style.borderColor = '#d93838';
      }
      alert('Mohon isi Nomor WhatsApp Orang Tua pada Langkah 2.');
      return;
    }

    // Validate active step inputs
    if (!validateStep(currentStep)) return;

    isSubmitting = true;

    // Extract Form Elements
    const namaSiswa = namaSiswaInput.value.trim();
    const namaPanggilan = document.getElementById('namaPanggilan')?.value.trim() || namaSiswa.split(' ')[0];
    const nikSiswa = document.getElementById('nikSiswa')?.value.trim() || '';
    const jenisKelamin = document.getElementById('jenisKelamin')?.value || 'Laki-laki';
    const tempatLahir = document.getElementById('tempatLahir')?.value.trim() || '';
    const tglLahir = document.getElementById('tglLahir')?.value || '';
    const asalTK = document.getElementById('asalTK')?.value.trim() || '';
    const alamatSiswa = document.getElementById('alamatSiswa')?.value.trim() || '';

    const namaAyah = document.getElementById('namaAyah')?.value.trim() || '';
    const pekerjaanAyah = document.getElementById('pekerjaanAyah')?.value.trim() || '';
    const namaIbu = document.getElementById('namaIbu')?.value.trim() || '';
    const pekerjaanIbu = document.getElementById('pekerjaanIbu')?.value.trim() || '';
    const noHpOrtu = noHpOrtuInput.value.trim();
    const emailOrtu = document.getElementById('emailOrtu')?.value.trim() || '';

    const catatanKesehatan = document.getElementById('catatanKesehatan')?.value.trim() || '';

    // Prepare FormData for Backend API & SQLite
    const formData = new FormData();
    formData.append('namaSiswa', namaSiswa);
    formData.append('namaPanggilan', namaPanggilan);
    formData.append('nikSiswa', nikSiswa);
    formData.append('jenisKelamin', jenisKelamin);
    formData.append('tempatLahir', tempatLahir);
    formData.append('tglLahir', tglLahir);
    formData.append('asalTK', asalTK);
    formData.append('alamatSiswa', alamatSiswa);
    formData.append('namaAyah', namaAyah);
    formData.append('pekerjaanAyah', pekerjaanAyah);
    formData.append('namaIbu', namaIbu);
    formData.append('pekerjaanIbu', pekerjaanIbu);
    formData.append('noHpOrtu', noHpOrtu);
    formData.append('emailOrtu', emailOrtu);
    formData.append('pilihanProgram', 'Reguler Islam Terpadu');
    formData.append('minatEkskul', '');
    formData.append('catatanKesehatan', catatanKesehatan);

    // Append uploaded files if present
    const fileKIA = document.getElementById('fileKIA')?.files[0];
    const fileAkta = document.getElementById('fileAkta')?.files[0];
    const fileFoto = document.getElementById('fileFoto')?.files[0];
    const fileKK = document.getElementById('fileKK')?.files[0];
    const fileKTPAyah = document.getElementById('fileKTPAyah')?.files[0];
    const fileKTPIbu = document.getElementById('fileKTPIbu')?.files[0];
    const fileIjazah = document.getElementById('fileIjazah')?.files[0];

    if (fileKIA) formData.append('fileKIA', fileKIA);
    if (fileAkta) formData.append('fileAkta', fileAkta);
    if (fileFoto) formData.append('fileFoto', fileFoto);
    if (fileKK) formData.append('fileKK', fileKK);
    if (fileKTPAyah) formData.append('fileKTPAyah', fileKTPAyah);
    if (fileKTPIbu) formData.append('fileKTPIbu', fileKTPIbu);
    if (fileIjazah) formData.append('fileIjazah', fileIjazah);

    // Show loading indicator
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<i data-lucide="loader" class="spin" style="width:18px;height:18px;"></i> Menyimpan ke Database...`;
      if (window.lucide) lucide.createIcons();
    }

    let regNumber = `REG-2026-SDIT-${Math.floor(1000 + Math.random() * 9000)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      // Send to Backend API
      const response = await fetch(resolveApiUrl('/api/ppdb'), {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const resData = await response.json().catch(() => ({}));

      if (response.ok && resData.success) {
        if (resData.regNumber) {
          regNumber = resData.regNumber;
        }
        console.log('✓ Tersimpan di Database SQLite:', resData);
      } else {
        const errMsg = resData.error || resData.message || 'Gagal menyimpan data ke database server.';
        console.error('Backend error:', response.status, errMsg);
        alert('Terjadi kendala saat menyimpan pendaftaran: ' + errMsg);
        return;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Pemberitahuan koneksi backend:', err);
      alert('Tidak dapat terhubung ke server backend SDIT Al-Mursyidiyyah. Pastikan server aktif di http://localhost:3000');
      return;
    } finally {
      clearTimeout(timeoutId);
      isSubmitting = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i data-lucide="check-circle" style="width:18px;height:18px;"></i> Kirim Formulir Pendaftaran`;
        if (window.lucide) lucide.createIcons();
      }
    }

    // 1. Immediately hide wizard and display registration success card
    if (wizard) wizard.style.display = 'none';
    if (regResult) {
      regResult.style.display = 'block';
      regResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 2. Populate Success Card Fields Safely
    try {
      const cardReg = document.getElementById('cardRegNumber');
      if (cardReg) cardReg.textContent = regNumber;

      const cardNama = document.getElementById('cardNamaSiswa');
      if (cardNama) cardNama.textContent = namaSiswa;

      const cardJk = document.getElementById('cardJenisKelamin');
      if (cardJk) cardJk.textContent = jenisKelamin;

      const cardTgl = document.getElementById('cardTglLahir');
      if (cardTgl) cardTgl.textContent = formatIndonesianDate(tglLahir);

      const cardOrtu = document.getElementById('cardNamaOrtu');
      if (cardOrtu) cardOrtu.textContent = namaAyah || namaIbu || 'Orang Tua / Wali';

      const cardHp = document.getElementById('cardNoHp');
      if (cardHp) cardHp.textContent = noHpOrtu;

      const cardAsalTk = document.getElementById('cardAsalTk');
      if (cardAsalTk) cardAsalTk.textContent = asalTK || '-';

      const cardTglDaftar = document.getElementById('cardTglDaftar');
      if (cardTglDaftar) cardTglDaftar.textContent = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Update WhatsApp Confirmation Link
      const btnWhatsAppConfirm = document.getElementById('btnWhatsAppConfirm');
      if (btnWhatsAppConfirm) {
        const waMessage = encodeURIComponent(
          `*KONFIRMASI PENDAFTARAN PPDB ONLINE*\n*SDIT AL-MURSYIDIYYAH*\n\n` +
          `No. Registrasi: *${regNumber}*\n` +
          `Nama Calon Siswa: *${namaSiswa}*\n` +
          `Nama Orang Tua: *${namaAyah || namaIbu}*\n` +
          `No. WhatsApp: ${noHpOrtu}\n\n` +
          `Assalamu'alaikum Panitia PPDB, saya telah mengisi formulir online dan berkas berhasil tersimpan di sistem. Mohon informasi langkah verifikasi selanjutnya. Terima kasih!`
        );
        btnWhatsAppConfirm.href = `https://wa.me/6281380327256?text=${waMessage}`;
      }

      // Update link to dedicated tracking page
      const btnGoToTracking = document.getElementById('btnGoToTracking');
      if (btnGoToTracking) {
        btnGoToTracking.href = `cek-status.html?reg=${encodeURIComponent(regNumber)}`;
      }
    } catch (renderErr) {
      console.error('Error rendering registration success card:', renderErr);
    }

    if (window.lucide) lucide.createIcons();

    // 3. Prominent Alert with Registration Number
    setTimeout(() => {
      alert(`Alhamdulillah, pendaftaran ananda ${namaSiswa} BERHASIL!\n\nNomor Registrasi Anda: ${regNumber}\n\nSimpan nomor registrasi ini untuk mengecek status seleksi pendaftaran.`);
    }, 150);
  }

  // Attach submit listeners to both the button and form
  if (btnSubmit) {
    btnSubmit.addEventListener('click', handleFormSubmit);
  }
  const ppdbForm = document.getElementById('ppdbForm');
  if (ppdbForm) {
    ppdbForm.addEventListener('submit', handleFormSubmit);
  }

  // Print registration card handler
  const btnPrintCard = document.getElementById('btnPrintCard');
  if (btnPrintCard) {
    btnPrintCard.addEventListener('click', () => {
      window.print();
    });
  }
  } // End of if (wizard)

  // Helper: Mapping Konfigurasi Status Pendaftaran (Senior UI/UX Design System)
  function getStatusConfig(rawStatus) {
    const s = (rawStatus || '').toLowerCase();
    
    // 6. Tidak Diterima
    if (s.includes('tidak') || s.includes('tolak') || s.includes('reject')) {
      return {
        statusClass: 'status-banner-ditolak',
        icon: 'x-circle',
        tag: 'STATUS PENDAFTARAN: BELUM MEMENUHI KUOTA',
        title: 'Mohon Maaf, Kuota Belum Mencukupi',
        timelineClasses: ['completed', 'completed', 'completed', 'warning'],
        note: 'Terima kasih atas kepercayaan Ayah/Bunda mendaftarkan ananda. Mengingat keterbatasan kuota daya tampung kelas, saat ini calon siswa belum dapat kami terima di T.A. 2027/2028.'
      };
    }
    // 5. Diterima
    if (s.includes('terima') || s.includes('accept') || s.includes('lulus')) {
      return {
        statusClass: 'status-banner-diterima',
        icon: 'award',
        tag: 'STATUS PENDAFTARAN: DINYATAKAN DITERIMA',
        title: 'Selamat! Calon Siswa Diterima di SDIT Al-Mursyidiyyah',
        timelineClasses: ['completed', 'completed', 'completed', 'completed'],
        note: 'Alhamdulillah, ananda dinyatakan resmi diterima sebagai peserta didik baru SDIT Al-Mursyidiyyah. Mohon segera melakukan konfirmasi daftar ulang melalui Sekretariat PPDB.'
      };
    }
    // 3. Perlu Perbaikan
    if (s.includes('perlu') || s.includes('perbaikan') || s.includes('revisi')) {
      return {
        statusClass: 'status-banner-perbaikan',
        icon: 'alert-triangle',
        tag: 'STATUS PENDAFTARAN: PERLU PERBAIKAN BERKAS',
        title: 'Dokumen Persyaratan Perlu Dilengkapi / Diperbaiki',
        timelineClasses: ['completed', 'warning', '', ''],
        note: 'Terdapat dokumen yang belum lengkap atau berkas kurang terbaca jelas. Mohon hubungi panitia via WhatsApp untuk panduan unggah ulang berkas.'
      };
    }
    // 4. Terverifikasi
    if (s.includes('terverifikasi') || s.includes('verified')) {
      return {
        statusClass: 'status-banner-terverifikasi',
        icon: 'check-circle-2',
        tag: 'STATUS PENDAFTARAN: BERKAS TERVERIFIKASI',
        title: 'Seluruh Berkas Administrasi Dinyatakan Sah',
        timelineClasses: ['completed', 'completed', 'active', ''],
        note: 'Dokumen administrasi telah lengkap dan sah. Calon wali murid dijadwalkan mengikuti tahapan wawancara calon wali murid.'
      };
    }
    // 2. Sedang Diverifikasi
    if (s.includes('sedang') || s.includes('proses') || s.includes('in verif')) {
      return {
        statusClass: 'status-banner-proses',
        icon: 'refresh-cw',
        tag: 'STATUS PENDAFTARAN: SEDANG DIVERIFIKASI',
        title: 'Pemeriksaan Berkas oleh Tim Administrasi',
        timelineClasses: ['completed', 'active', '', ''],
        note: 'Panitia PPDB sedang meninjau keabsahan dan kelengkapan dokumen persyaratan calon peserta didik. Proses ini membutuhkan waktu 1-2 hari kerja.'
      };
    }
    // 1. Menunggu Verifikasi (Default)
    return {
      statusClass: 'status-banner-menunggu',
      icon: 'clock',
      tag: 'STATUS PENDAFTARAN: MENUNGGU VERIFIKASI',
      title: 'Berkas Telah Berhasil Diterima Sistem',
      timelineClasses: ['completed', 'active', '', ''],
      note: 'Pendaftaran calon siswa telah tersimpan di sistem. Berkas ananda saat ini sedang mengantre untuk diperiksa oleh panitia seleksi administrasi.'
    };
  }

  // Handle Cek Status Pendaftaran for Wali Murid
  const formCek = document.getElementById('formCekStatus');
  if (formCek) {
    formCek.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = (document.getElementById('inputCekQuery')?.value || '').trim();
      if (!q) return;

      const btn = document.getElementById('btnCekStatus');
      const resultBox = document.getElementById('cekResultBox');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i data-lucide="loader" class="spin" style="width:16px;height:16px;"></i> Memeriksa...`;
          if (window.lucide) lucide.createIcons();
        }

        const res = await fetch(resolveApiUrl(`/api/ppdb/cek?q=${encodeURIComponent(q)}`), {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        let json;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          json = await res.json();
        } else {
          const rawText = await res.text();
          throw new Error(`Respons server tidak valid (${res.status}): ${rawText.slice(0, 80)}`);
        }

        if (resultBox) {
          resultBox.style.display = 'block';
        }

        if (res.ok && json.success && json.data) {
          const item = json.data;
          const cfg = getStatusConfig(item.status);

          const tglDaftar = formatIndonesianDate(item.created_at);

          const namaOrtu = (item.nama_ayah && item.nama_ibu)
            ? `${item.nama_ayah} / ${item.nama_ibu}`
            : (item.nama_ayah || item.nama_ibu || '-');

          const photoSrc = item.file_foto
            ? (item.file_foto.startsWith('http') ? item.file_foto : resolveApiUrl(item.file_foto))
            : '';

          const photoHtml = photoSrc
            ? `<img src="${photoSrc}" alt="Foto ${item.nama_siswa}" class="tracking-photo-img" onerror="this.style.display='none'; const fb = this.nextElementSibling; if (fb) fb.style.display='flex';">
               <div class="tracking-photo-fallback" style="display:none;">
                 <i data-lucide="user" style="width:38px;height:38px;"></i>
                 <span style="font-size:0.75rem;margin-top:0.35rem;font-weight:700;">Foto Siswa</span>
               </div>`
            : `<div class="tracking-photo-fallback">
                 <i data-lucide="user" style="width:38px;height:38px;"></i>
                 <span style="font-size:0.75rem;margin-top:0.35rem;font-weight:700;">Foto Siswa</span>
               </div>`;

          if (resultBox) {
            resultBox.innerHTML = `
              <!-- 1. BANNER STATUS BESAR & PALING MENONJOL -->
              <div class="status-banner ${cfg.statusClass}">
                <div class="status-banner-icon">
                  <i data-lucide="${cfg.icon}" style="width:24px;height:24px;"></i>
                </div>
                <div class="status-banner-content">
                  <span class="status-banner-tag">${cfg.tag}</span>
                  <div class="status-banner-title">${cfg.title}</div>
                </div>
              </div>

              <!-- 2. KARTU INFORMASI SISWA DENGAN FOTO DATABASE -->
              <div class="tracking-student-card">
                <div class="tracking-photo-box">
                  ${photoHtml}
                </div>
                <div class="tracking-info-details">
                  <div class="tracking-student-name">${item.nama_siswa}</div>
                  <div class="tracking-reg-number">${item.reg_number}</div>
                  <table class="tracking-data-table">
                    <tr>
                      <td class="label-col">Jenis Kelamin</td>
                      <td class="value-col">${item.jenis_kelamin || '-'}</td>
                    </tr>
                    <tr>
                      <td class="label-col">Orang Tua / Wali</td>
                      <td class="value-col">${namaOrtu}</td>
                    </tr>
                    <tr>
                      <td class="label-col">Tanggal Pendaftaran</td>
                      <td class="value-col">${tglDaftar}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- 3. TIMELINE 4 TAHAPAN PENDAFTARAN -->
              <div class="tracking-timeline">
                <div class="timeline-header-title">Tahapan Pendaftaran</div>
                <div class="timeline-track-grid">
                  <div class="timeline-step-node ${cfg.timelineClasses[0]}">
                    <div class="timeline-step-circle">1</div>
                    <div class="timeline-step-label">Pengisian Formulir</div>
                  </div>
                  <div class="timeline-step-node ${cfg.timelineClasses[1]}">
                    <div class="timeline-step-circle">2</div>
                    <div class="timeline-step-label">Verifikasi Dokumen</div>
                  </div>
                  <div class="timeline-step-node ${cfg.timelineClasses[2]}">
                    <div class="timeline-step-circle">3</div>
                    <div class="timeline-step-label">Wawancara Wali Murid</div>
                  </div>
                  <div class="timeline-step-node ${cfg.timelineClasses[3]}">
                    <div class="timeline-step-circle">4</div>
                    <div class="timeline-step-label">Pengumuman & Daftar Ulang</div>
                  </div>
                </div>
              </div>

              <!-- 4. CATATAN RESMI DARI PANITIA -->
              <div class="tracking-committee-box">
                <strong>Catatan Tim Panitia PPDB</strong>
                ${cfg.note}
              </div>

              <!-- 5. AKSI LANGSUNG WHATSAPP PANITIA -->
              <a href="https://wa.me/6281380327256?text=Halo%20Panitia%20PPDB%20SDIT%20Al-Mursyidiyyah,%20saya%20ingin%20menanyakan%20status%20pendaftaran%20ananda%20${encodeURIComponent(item.nama_siswa)}%20(${item.reg_number})" target="_blank" class="btn btn-gold" style="width:100%; justify-content:center; padding:0.85rem 1.25rem; font-weight:700; white-space:normal; text-align:center; line-height:1.35;">
                <i data-lucide="message-circle" style="width:18px;height:18px;"></i>
                Hubungi Sekretariat PPDB via WhatsApp
              </a>
            `;
            if (window.lucide) lucide.createIcons();
          }
        } else {
          if (resultBox) {
            resultBox.innerHTML = `
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-sm); padding: 1.25rem 1.5rem; color: #991B1B;">
                <div style="display:flex; align-items:center; gap:0.6rem; font-weight:700; margin-bottom:0.25rem;">
                  <i data-lucide="alert-circle" style="width:20px;height:20px;"></i>
                  Data Registrasi Tidak Ditemukan
                </div>
                <p style="font-size:0.9rem; margin:0; line-height:1.45; color:#7F1D1D;">
                  Nomor registrasi <strong>${q}</strong> tidak ditemukan pada database PPDB. Mohon pastikan nomor registrasi sudah benar sesuai tanda bukti pendaftaran Anda.
                </p>
              </div>
            `;
            if (window.lucide) lucide.createIcons();
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (resultBox) {
          resultBox.style.display = 'block';
          const errMsg = err.name === 'AbortError'
            ? 'Waktu koneksi ke server habis (timeout). Pastikan koneksi internet atau server berjalan normal, lalu coba lagi.'
            : `Gagal memeriksa status: ${err.message}`;
          resultBox.innerHTML = `
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-sm); padding: 1.25rem; color: #991B1B;">
              <p style="margin:0;">${errMsg}</p>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
      } finally {
        clearTimeout(timeoutId);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="search" style="width:18px;height:18px;"></i> Periksa Status`;
          if (window.lucide) lucide.createIcons();
        }
      }
    });

    // Auto-search via URL parameter ?reg=... or ?q=... (e.g. from confirmation card or bookmark)
    const urlParams = new URLSearchParams(window.location.search);
    const regParam = urlParams.get('reg') || urlParams.get('q');
    const inputQuery = document.getElementById('inputCekQuery');
    if (regParam && inputQuery) {
      inputQuery.value = regParam.trim();
      setTimeout(() => {
        formCek.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }, 200);
    }
  }
});
