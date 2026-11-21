/**
 * SDIT AL-MURSYIDIYYAH — FULL-STACK SERVER & DATABASE
 * Native Node.js HTTP Server + Built-in SQLite Database (node:sqlite)
 * Zero external dependencies required.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
} catch (e) {
  console.warn('Pragma setup notice:', e.message);
}

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS ppdb_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_number TEXT UNIQUE NOT NULL,
    nama_siswa TEXT NOT NULL,
    nama_panggilan TEXT,
    nik_siswa TEXT,
    jenis_kelamin TEXT,
    tempat_lahir TEXT,
    tanggal_lahir TEXT,
    asal_tk TEXT,
    alamat_siswa TEXT,
    nama_ayah TEXT,
    pekerjaan_ayah TEXT,
    nama_ibu TEXT,
    pekerjaan_ibu TEXT,
    no_hp_ortu TEXT NOT NULL,
    email_ortu TEXT,
    pilihan_program TEXT,
    minat_ekskul TEXT,
    catatan_kesehatan TEXT,
    file_foto TEXT,
    file_akta TEXT,
    file_kk TEXT,
    file_kia TEXT,
    file_ktp_ayah TEXT,
    file_ktp_ibu TEXT,
    file_ijazah TEXT,
    status TEXT DEFAULT 'Menunggu Verifikasi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Belum Dibaca',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ppdb_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_number TEXT UNIQUE NOT NULL,
    queue_number INTEGER UNIQUE NOT NULL,
    status TEXT DEFAULT 'available',
    assigned_to TEXT,
    assigned_at DATETIME,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper: Normalize Registration Token (e.g. "1" or "001" or "reg-2027-001" -> "REG-2027-001")
function normalizeToken(raw) {
  let clean = (raw || '').trim().toUpperCase().replace(/\s+/g, '-');
  if (!clean) return '';
  if (/^\d{1,3}$/.test(clean)) {
    const num = parseInt(clean, 10);
    return `REG-2027-${String(num).padStart(3, '0')}`;
  }
  const matchShort = clean.match(/^REG-(\d{1,3})$/);
  if (matchShort) {
    const num = parseInt(matchShort[1], 10);
    return `REG-2027-${String(num).padStart(3, '0')}`;
  }
  const matchYear = clean.match(/^2027-(\d{1,3})$/);
  if (matchYear) {
    const num = parseInt(matchYear[1], 10);
    return `REG-2027-${String(num).padStart(3, '0')}`;
  }
  return clean;
}

// Total Quota Siswa Baru T.A. 2027/2028 (Sesuai arahan: 30 Siswa)
const TOTAL_PPDB_QUOTA = 30;

// Seed initial 30 registration tokens (REG-2027-001 s/d REG-2027-030)
try {
  const countTokens = db.prepare('SELECT COUNT(*) as c FROM ppdb_tokens').get().c;
  if (countTokens === 0) {
    const insertToken = db.prepare('INSERT INTO ppdb_tokens (token_number, queue_number, status) VALUES (?, ?, ?)');
    for (let i = 1; i <= TOTAL_PPDB_QUOTA; i++) {
      const pad = String(i).padStart(3, '0');
      insertToken.run(`REG-2027-${pad}`, i, 'available');
    }
  }
} catch (e) {
  console.warn('Tokens setup notice:', e.message);
}

// Auto-migration: Ensure all 7 document columns exist in SQLite schema
try {
  const existingCols = db.prepare("PRAGMA table_info(ppdb_registrations)").all().map(c => c.name);
  if (!existingCols.includes('file_kia')) {
    db.exec("ALTER TABLE ppdb_registrations ADD COLUMN file_kia TEXT;");
  }
  if (!existingCols.includes('file_ktp_ayah')) {
    db.exec("ALTER TABLE ppdb_registrations ADD COLUMN file_ktp_ayah TEXT;");
  }
  if (!existingCols.includes('file_ktp_ibu')) {
    db.exec("ALTER TABLE ppdb_registrations ADD COLUMN file_ktp_ibu TEXT;");
  }
} catch (e) {
  console.warn("Schema migration notice:", e.message);
}

console.log('✓ Database SQLite connected & initialized at:', DB_PATH);

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=UTF-8',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Helper: Multipart Form Data Parser (Buffer-based, handles binary file uploads)
function parseMultipart(buffer, boundary) {
  const result = { fields: {}, files: {} };
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = 0;

  while (true) {
    const idx = buffer.indexOf(boundaryBuffer, start);
    if (idx === -1) break;

    const nextIdx = buffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
    if (nextIdx === -1) break;

    const part = buffer.subarray(idx + boundaryBuffer.length, nextIdx);
    start = nextIdx;

    // Header and body separator
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;

    const headerText = part.subarray(0, headerEnd).toString('utf-8');
    let body = part.subarray(headerEnd + 4);

    // Strip trailing \r\n
    if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
      body = body.subarray(0, body.length - 2);
    }

    const nameMatch = headerText.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];

    const filenameMatch = headerText.match(/filename="([^"]+)"/);
    if (filenameMatch) {
      const originalFilename = filenameMatch[1];
      if (originalFilename && body.length > 0) {
        const ext = path.extname(originalFilename) || '.bin';
        const cleanBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const savedFilename = `${Date.now()}_${cleanBase}${ext}`;
        const savePath = path.join(UPLOADS_DIR, savedFilename);
        fs.writeFileSync(savePath, body);

        result.files[fieldName] = {
          originalName: originalFilename,
          filename: savedFilename,
          path: `/uploads/${savedFilename}`,
          size: body.length
        };
      }
    } else {
      result.fields[fieldName] = body.toString('utf-8');
    }
  }

  return result;
}

// Request Handler
const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    let pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

  // Helper response functions
  const jsonResponse = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  };

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API ROUTES ---

  // 1. POST /api/ppdb (Submit Registration)
  if (pathname === '/api/ppdb' && method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const totalBuffer = Buffer.concat(chunks);
        let fields = {};
        let files = {};

        if (contentType.includes('multipart/form-data')) {
          const boundaryMatch = contentType.match(/boundary=([^;]+)/);
          if (!boundaryMatch) {
            return jsonResponse(400, { error: 'Invalid multipart boundary' });
          }
          const boundary = boundaryMatch[1].trim();
          const parsed = parseMultipart(totalBuffer, boundary);
          fields = parsed.fields;
          files = parsed.files;
        } else if (contentType.includes('application/json')) {
          fields = JSON.parse(totalBuffer.toString('utf-8'));
        }

        // Validate Registration Number against Quota of 30
        let regNumber = normalizeToken(fields.regNumber || '');
        if (!regNumber) {
          // Check quota if no token passed
          const usedCount = db.prepare('SELECT COUNT(*) as c FROM ppdb_registrations').get().c;
          if (usedCount >= TOTAL_PPDB_QUOTA) {
            return jsonResponse(400, { success: false, error: 'Mohon maaf, kuota pendaftaran siswa baru (30 siswa) telah terpenuhi.' });
          }
          const nextToken = db.prepare("SELECT token_number FROM ppdb_tokens WHERE status = 'available' ORDER BY queue_number ASC LIMIT 1").get();
          regNumber = nextToken ? nextToken.token_number : `REG-2027-${String(usedCount + 1).padStart(3, '0')}`;
        } else {
          // Validate format REG-2027-XXX
          const match = regNumber.match(/^REG-2027-(\d{3})$/);
          if (!match) {
            return jsonResponse(400, { success: false, error: 'Format Nomor Registrasi tidak valid (harus REG-2027-001 s/d REG-2027-030).' });
          }
          const num = parseInt(match[1], 10);
          if (num < 1 || num > TOTAL_PPDB_QUOTA) {
            return jsonResponse(400, { success: false, error: `Nomor Registrasi di luar kuota pendaftaran (Maksimal ${TOTAL_PPDB_QUOTA} siswa).` });
          }
          // Check if already used
          const existing = db.prepare('SELECT id, nama_siswa FROM ppdb_registrations WHERE UPPER(reg_number) = UPPER(?)').get(regNumber);
          if (existing) {
            return jsonResponse(400, { success: false, error: `Nomor Registrasi ${regNumber} sudah pernah digunakan untuk pendaftaran ananda ${existing.nama_siswa}.` });
          }
        }

        const insertStmt = db.prepare(`
          INSERT INTO ppdb_registrations (
            reg_number, nama_siswa, nama_panggilan, nik_siswa, jenis_kelamin,
            tempat_lahir, tanggal_lahir, asal_tk, alamat_siswa,
            nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu,
            no_hp_ortu, email_ortu, pilihan_program, minat_ekskul, catatan_kesehatan,
            file_foto, file_akta, file_kk, file_kia, file_ktp_ayah, file_ktp_ibu, file_ijazah, status
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi'
          )
        `);

        const result = insertStmt.run(
          regNumber,
          fields.namaSiswa || 'Tanpa Nama',
          fields.namaPanggilan || '',
          fields.nikSiswa || '',
          fields.jenisKelamin || 'Laki-laki',
          fields.tempatLahir || '',
          fields.tglLahir || '',
          fields.asalTK || '',
          fields.alamatSiswa || '',
          fields.namaAyah || '',
          fields.pekerjaanAyah || '',
          fields.namaIbu || '',
          fields.pekerjaanIbu || '',
          fields.noHpOrtu || '',
          fields.emailOrtu || '',
          fields.pilihanProgram || 'Reguler Islam Terpadu',
          fields.minatEkskul || '',
          fields.catatanKesehatan || '',
          files.fileFoto ? files.fileFoto.path : '',
          files.fileAkta ? files.fileAkta.path : '',
          files.fileKK ? files.fileKK.path : '',
          files.fileKIA ? files.fileKIA.path : '',
          files.fileKTPAyah ? files.fileKTPAyah.path : '',
          files.fileKTPIbu ? files.fileKTPIbu.path : '',
          files.fileIjazah ? files.fileIjazah.path : ''
        );

        // Mark token as used
        try {
          db.prepare("UPDATE ppdb_tokens SET status = 'used', used_at = CURRENT_TIMESTAMP WHERE UPPER(token_number) = UPPER(?)").run(regNumber);
        } catch (_) {}

        return jsonResponse(201, {
          success: true,
          message: 'Pendaftaran PPDB berhasil disimpan di database!',
          id: Number(result.lastInsertRowid),
          regNumber: regNumber,
          data: {
            namaSiswa: fields.namaSiswa,
            jenisKelamin: fields.jenisKelamin,
            tglLahir: fields.tglLahir,
            namaOrtu: fields.namaAyah || fields.namaIbu,
            noHpOrtu: fields.noHpOrtu,
            program: fields.pilihanProgram
          }
        });
      } catch (err) {
        console.error('Error inserting PPDB registration:', err);
        return jsonResponse(500, { error: 'Gagal menyimpan pendaftaran: ' + err.message });
      }
    });
    return;
  }

  // 2. GET /api/ppdb (List Registrations)
  if (pathname === '/api/ppdb' && method === 'GET') {
    try {
      const q = parsedUrl.searchParams.get('q') || '';
      const status = parsedUrl.searchParams.get('status') || '';

      let query = 'SELECT * FROM ppdb_registrations WHERE 1=1';
      const params = [];

      if (q) {
        query += ' AND (nama_siswa LIKE ? OR reg_number LIKE ? OR no_hp_ortu LIKE ?)';
        const pattern = `%${q}%`;
        params.push(pattern, pattern, pattern);
      }
      if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
      }
      query += ' ORDER BY id DESC';

      const stmt = db.prepare(query);
      const rows = stmt.all(...params);
      return jsonResponse(200, { success: true, count: rows.length, data: rows });
    } catch (err) {
      return jsonResponse(500, { error: err.message });
    }
  }

  // 3. GET /api/ppdb/:id (Get Single Registration)
  const ppdbDetailMatch = pathname.match(/^\/api\/ppdb\/(\d+)$/);
  if (ppdbDetailMatch && method === 'GET') {
    try {
      const id = ppdbDetailMatch[1];
      const stmt = db.prepare('SELECT * FROM ppdb_registrations WHERE id = ?');
      const row = stmt.get(id);
      if (!row) {
        return jsonResponse(404, { success: false, error: 'Data pendaftar tidak ditemukan' });
      }
      return jsonResponse(200, { success: true, data: row });
    } catch (err) {
      return jsonResponse(500, { success: false, error: err.message });
    }
  }

  // 4. PATCH or PUT /api/ppdb/:id/status or /api/ppdb/:id (Update Status)
  const ppdbStatusMatch = pathname.match(/^\/api\/ppdb\/(\d+)(?:\/status)?$/);
  if (ppdbStatusMatch && (method === 'PATCH' || method === 'PUT')) {
    const id = ppdbStatusMatch[1];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!payload.status || typeof payload.status !== 'string' || !payload.status.trim()) {
          return jsonResponse(400, { success: false, error: 'Status harus diisi' });
        }
        const newStatus = payload.status.trim();
        const updateStmt = db.prepare('UPDATE ppdb_registrations SET status = ? WHERE id = ?');
        const info = updateStmt.run(newStatus, id);

        if (info.changes === 0) {
          return jsonResponse(404, { success: false, error: `Pendaftar #${id} tidak ditemukan di database` });
        }

        return jsonResponse(200, {
          success: true,
          message: `Status pendaftaran #${id} berhasil diubah ke: ${newStatus}`,
          id: Number(id),
          status: newStatus
        });
      } catch (err) {
        return jsonResponse(500, { success: false, error: 'Gagal memperbarui status: ' + err.message });
      }
    });
    return;
  }

  // 5. GET /api/ppdb/cek (Cek Status Pendaftaran untuk Wali Murid)
  if (pathname === '/api/ppdb/cek' && method === 'GET') {
    try {
      const q = (parsedUrl.searchParams.get('q') || '').trim();
      if (!q) {
        return jsonResponse(400, { success: false, error: 'Masukkan nomor registrasi atau nomor WhatsApp' });
      }
      const cleanPhone = q.replace(/[^0-9]/g, '');
      const stmt = db.prepare(`
        SELECT id, reg_number, nama_siswa, jenis_kelamin, pilihan_program, status, file_foto, no_hp_ortu, nama_ayah, nama_ibu, tanggal_lahir, created_at
        FROM ppdb_registrations
        WHERE UPPER(reg_number) = UPPER(?) OR (length(?) >= 6 AND no_hp_ortu LIKE ?)
        ORDER BY id DESC LIMIT 1
      `);
      const row = stmt.get(q, cleanPhone, `%${cleanPhone}%`);
      if (!row) {
        return jsonResponse(404, {
          success: false,
          error: `Data pendaftaran dengan kata kunci "${q}" tidak ditemukan. Pastikan Nomor Registrasi atau Nomor WhatsApp sudah sesuai.`
        });
      }
      return jsonResponse(200, { success: true, data: row });
    } catch (err) {
      return jsonResponse(500, { success: false, error: err.message });
    }
  }

  // 6. DELETE /api/ppdb/:id (Delete Registration)
  if (ppdbDetailMatch && method === 'DELETE') {
    const id = ppdbDetailMatch[1];
    try {
      const delStmt = db.prepare('DELETE FROM ppdb_registrations WHERE id = ?');
      delStmt.run(id);
      return jsonResponse(200, { success: true, message: `Pendaftar #${id} berhasil dihapus` });
    } catch (err) {
      return jsonResponse(500, { success: false, error: err.message });
    }
  }

  // 6. GET /api/ppdb/export (Export CSV)
  if (pathname === '/api/ppdb/export' && method === 'GET') {
    try {
      const stmt = db.prepare('SELECT * FROM ppdb_registrations ORDER BY id DESC');
      const rows = stmt.all();

      const headers = [
        'ID', 'No Registrasi', 'Nama Siswa', 'Jenis Kelamin', 'Tgl Lahir', 'Asal TK',
        'Nama Ayah', 'Nama Ibu', 'No HP Ortu', 'Program', 'Status', 'Tanggal Daftar'
      ];
      const csvLines = [headers.join(',')];

      rows.forEach(r => {
        csvLines.push([
          r.id,
          `"${r.reg_number}"`,
          `"${(r.nama_siswa || '').replace(/"/g, '""')}"`,
          `"${r.jenis_kelamin || ''}"`,
          `"${r.tanggal_lahir || ''}"`,
          `"${(r.asal_tk || '').replace(/"/g, '""')}"`,
          `"${(r.nama_ayah || '').replace(/"/g, '""')}"`,
          `"${(r.nama_ibu || '').replace(/"/g, '""')}"`,
          `"${r.no_hp_ortu || ''}"`,
          `"${(r.pilihan_program || '').replace(/"/g, '""')}"`,
          `"${r.status || ''}"`,
          `"${r.created_at || ''}"`
        ].join(','));
      });

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="data_pendaftar_ppdb_sdit.csv"'
      });
      return res.end(csvLines.join('\n'));
    } catch (err) {
      return jsonResponse(500, { error: err.message });
    }
  }

  // 7. POST /api/kontak (Save Contact Message)
  if (pathname === '/api/kontak' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const insertStmt = db.prepare(`
          INSERT INTO contact_messages (nama, phone, subject, message)
          VALUES (?, ?, ?, ?)
        `);
        const result = insertStmt.run(
          payload.nama || '',
          payload.phone || '',
          payload.subject || '',
          payload.message || ''
        );
        return jsonResponse(201, { success: true, message: 'Pesan berhasil disimpan!', id: Number(result.lastInsertRowid) });
      } catch (err) {
        return jsonResponse(500, { error: err.message });
      }
    });
    return;
  }

  // 8. GET /api/kontak (List Contact Messages)
  if (pathname === '/api/kontak' && method === 'GET') {
    try {
      const stmt = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC');
      const rows = stmt.all();
      return jsonResponse(200, { success: true, count: rows.length, data: rows });
    } catch (err) {
      return jsonResponse(500, { error: err.message });
    }
  }

  // 9. GET /api/stats (Dashboard statistics)
  if (pathname === '/api/stats' && method === 'GET') {
    try {
      const totalPendaftar = db.prepare('SELECT COUNT(*) as c FROM ppdb_registrations').get().c;
      const menunggu = db.prepare("SELECT COUNT(*) as c FROM ppdb_registrations WHERE status = 'Menunggu Verifikasi'").get().c;
      const terverifikasi = db.prepare("SELECT COUNT(*) as c FROM ppdb_registrations WHERE status = 'Terverifikasi' OR status = 'Lulus Observasi' OR status = 'Lulus Wawancara' OR status = 'Diterima'").get().c;
      const totalPesan = db.prepare('SELECT COUNT(*) as c FROM contact_messages').get().c;
      const assignedTokens = db.prepare("SELECT COUNT(*) as c FROM ppdb_tokens WHERE status != 'available'").get().c;
      const remainingQuota = Math.max(0, TOTAL_PPDB_QUOTA - totalPendaftar);

      return jsonResponse(200, {
        success: true,
        stats: {
          totalPendaftar,
          menunggu,
          terverifikasi,
          totalPesan,
          quota: {
            total: TOTAL_PPDB_QUOTA,
            used: totalPendaftar,
            assigned: assignedTokens,
            remaining: remainingQuota,
            isFull: totalPendaftar >= TOTAL_PPDB_QUOTA
          }
        }
      });
    } catch (err) {
      return jsonResponse(500, { error: err.message });
    }
  }

  // 10. GET /api/ppdb/quota (Get Real-time Quota Info)
  if (pathname === '/api/ppdb/quota' && method === 'GET') {
    try {
      const totalPendaftar = db.prepare('SELECT COUNT(*) as c FROM ppdb_registrations').get().c;
      const remainingQuota = Math.max(0, TOTAL_PPDB_QUOTA - totalPendaftar);
      const isFull = totalPendaftar >= TOTAL_PPDB_QUOTA;

      // Find next token that is available
      const nextTokenRow = db.prepare("SELECT token_number, queue_number FROM ppdb_tokens WHERE status = 'available' ORDER BY queue_number ASC LIMIT 1").get();
      const nextToken = nextTokenRow ? nextTokenRow.token_number : (isFull ? null : `REG-2027-${String(totalPendaftar + 1).padStart(3, '0')}`);

      return jsonResponse(200, {
        success: true,
        totalQuota: TOTAL_PPDB_QUOTA,
        usedCount: totalPendaftar,
        remainingQuota,
        isFull,
        nextAvailableToken: nextToken
      });
    } catch (err) {
      return jsonResponse(500, { error: err.message });
    }
  }

  // 11. POST /api/ppdb/verify-token (Verify Registration Number Gate)
  if (pathname === '/api/ppdb/verify-token' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const token = normalizeToken(payload.token || '');

        if (!token) {
          return jsonResponse(400, { success: false, error: 'Nomor Registrasi wajib diisi.' });
        }

        const match = token.match(/^REG-2027-(\d{3})$/);
        if (!match) {
          return jsonResponse(400, { success: false, error: 'Format Nomor Registrasi tidak sesuai. Contoh: REG-2027-001 (atau ketik nomor urut, misal: 1).' });
        }

        const num = parseInt(match[1], 10);
        if (num < 1 || num > TOTAL_PPDB_QUOTA) {
          return jsonResponse(400, { success: false, error: `Nomor Registrasi di luar batas kuota (1 s/d ${TOTAL_PPDB_QUOTA}).` });
        }

        // Check if already used in ppdb_registrations
        const existingReg = db.prepare('SELECT id, nama_siswa, created_at FROM ppdb_registrations WHERE UPPER(reg_number) = UPPER(?)').get(token);
        if (existingReg) {
          return jsonResponse(400, {
            success: false,
            alreadyUsed: true,
            error: `Nomor Registrasi ${token} sudah terpakai atas nama ananda ${existingReg.nama_siswa}. Silakan gunakan menu Cek Status Pendaftaran.`
          });
        }

        return jsonResponse(200, {
          success: true,
          valid: true,
          token: token,
          queueNumber: num,
          message: `Nomor Registrasi ${token} valid! Silakan lengkapi formulir pendaftaran.`
        });
      } catch (err) {
        return jsonResponse(500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 12. POST /api/admin/issue-token (Issue next token for WhatsApp chat)
  if (pathname === '/api/admin/issue-token' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const note = (payload.note || '').trim();

        // Find next token that is available
        const nextToken = db.prepare("SELECT * FROM ppdb_tokens WHERE status = 'available' ORDER BY queue_number ASC LIMIT 1").get();
        if (!nextToken) {
          return jsonResponse(400, {
            success: false,
            error: `Seluruh kuota (${TOTAL_PPDB_QUOTA} siswa) telah diterbitkan!`
          });
        }

        db.prepare("UPDATE ppdb_tokens SET status = 'assigned', assigned_to = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?").run(note, nextToken.id);

        const assignedCount = db.prepare("SELECT COUNT(*) as c FROM ppdb_tokens WHERE status != 'available'").get().c;
        const remaining = Math.max(0, TOTAL_PPDB_QUOTA - assignedCount);

        const messageTemplate = `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nTerima kasih Ayah/Bunda telah menghubungi Panitia PPDB SDIT Al-Mursyidiyyah dan melakukan konfirmasi pembayaran formulir.\n\nBerikut adalah Nomor Registrasi resmi ananda untuk pengisian formulir pendaftaran:\n📋 Nomor Registrasi: *${nextToken.token_number}*\n\nSilakan klik tautan resmi di bawah ini untuk membuka dan melengkapi formulir pendaftaran secara online:\n🔗 http://localhost:3000/daftar.html?reg=${nextToken.token_number}\n\nMohon siapkan dokumen seperti Akta Kelahiran, KK, Pas Foto, dan KIA untuk diunggah.\n\nJazakumullah khairan katsiran.\nPanitia PPDB SDIT Al-Mursyidiyyah`;

        return jsonResponse(200, {
          success: true,
          token: nextToken.token_number,
          queueNumber: nextToken.queue_number,
          remaining,
          messageTemplate
        });
      } catch (err) {
        return jsonResponse(500, { success: false, error: err.message });
      }
    });
    return;
  }

  // API Route Fallback (ensure all /api/ requests receive JSON, never HTML)
  if (pathname.startsWith('/api/')) {
    return jsonResponse(404, { success: false, error: `Endpoint API ${method} ${pathname} tidak ditemukan` });
  }

  // --- STATIC FILE SERVING ---
  // Support aliases and clean URLs
  if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin.html';
  } else if (pathname === '/ppdb' || pathname === '/ppdb/') {
    pathname = '/ppdb.html';
  } else if (pathname === '/daftar' || pathname === '/daftar/') {
    pathname = '/daftar.html';
  } else if (pathname === '/cek-status' || pathname === '/cek-status/') {
    pathname = '/cek-status.html';
  }

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Favicon fallback to school logo
  if (pathname === '/favicon.ico') {
    filePath = path.join(__dirname, 'assets', 'img', 'logo-transparent.png');
  }

  // Auto-append .html if clean URL is accessed (e.g. /profil -> /profil.html)
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 handler
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      return res.end(`
        <!DOCTYPE html>
        <html lang="id">
        <head><title>404 Tidak Ditemukan</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;background:#F7F5EB;color:#263A35;}</style></head>
        <body>
          <h1 style="color:#07594F;">404 — Halaman Tidak Ditemukan</h1>
          <p>Halaman yang Anda cari tidak ditemukan.</p>
          <a href="/" style="display:inline-block;margin-top:1rem;padding:0.75rem 1.5rem;background:#07594F;color:#fff;text-decoration:none;border-radius:99px;">Kembali ke Beranda</a>
        </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Read and serve file with Content-Length to prevent browser connection hanging
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        return res.end('Internal Server Error loading asset');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': data.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
      });
      res.end(data);
    });
  });
  } catch (err) {
    console.error('Unhandled Server Error:', err);
    if (!res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: false, error: 'Internal Server Error: ' + err.message }));
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  SDIT AL-MURSYIDIYYAH — FULL-STACK WEB SERVER RUNNING`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Database: SQLite (native node:sqlite)`);
  console.log(`  Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`=======================================================`);
});

