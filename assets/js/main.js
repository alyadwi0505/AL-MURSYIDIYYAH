// SDIT Al-Mursyidiyyah - Main App Script v2.0 (Updated 2026)
/* ==========================================================================
   SDIT AL-MURSYIDIYYAH — MAIN JAVASCRIPT
   Clean, interactive behaviors: Mobile drawer, sticky navbar,
   gallery filter & lightbox, news modal, and contact message database handler.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. STICKY NAVBAR SHADOW
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // 2. MOBILE MENU DRAWER
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      const isOpen = mobileNav.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  // 3. GALLERY FILTERING
  const filterBtns = document.querySelectorAll('.gallery-filter .filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (filterBtns.length && galleryItems.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');
        galleryItems.forEach(item => {
          const category = item.getAttribute('data-category');
          if (filterValue === 'all' || category === filterValue) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  // 4. GALLERY LIGHTBOX MODAL
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  if (lightbox && lightboxImg && lightboxClose) {
    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const title = item.querySelector('.gallery-item-title');
        const tag = item.querySelector('.gallery-item-tag');

        if (img) {
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt || 'Dokumentasi SDIT Al-Mursyidiyyah';
          lightboxCaption.textContent = (title ? title.textContent : '') + (tag ? ` • ${tag.textContent}` : '');
          lightbox.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // 5. CONTACT FORM HANDLER (Save to Database & Redirect to WhatsApp)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = document.getElementById('contactName')?.value.trim();
      const hp = document.getElementById('contactPhone')?.value.trim();
      const subjek = document.getElementById('contactSubject')?.value.trim();
      const pesan = document.getElementById('contactMessage')?.value.trim();

      if (!nama || !pesan) {
        alert('Mohon lengkapi nama dan pesan Anda.');
        return;
      }

      // Save to SQLite Database
      try {
        await fetch('/api/kontak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, phone: hp, subject: subjek, message: pesan })
        });
        console.log('✓ Pesan kontak berhasil disimpan ke SQLite!');
      } catch (err) {
        console.warn('Running offline, proceeding to WhatsApp directly.');
      }

      const waText = encodeURIComponent(
        `Halo SDIT Al-Mursyidiyyah,\n\nSaya ingin bertanya mengenai informasi sekolah.\n\n*Nama:* ${nama}\n*No. HP/WA:* ${hp || '-'}\n*Subjek:* ${subjek || '-'}\n*Pesan:* ${pesan}`
      );
      // School WhatsApp number
      window.open(`https://wa.me/6281380327256?text=${waText}`, '_blank');
    });
  }

  // 6. TYPEWRITER ANIMATION (Ahlan Wa Sahlan on Homepage Hero - Runs once on entrance)
  const ahlanEl = document.getElementById('ahlanTypewriter');
  if (ahlanEl) {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      ahlanEl.textContent = 'أَهْلًا وَسَهْلًا';
    } else {
      // Natural Arabic syllables for "أَهْلًا وَسَهْلًا" with complete ligatures & harakat
      const beats = ['أَ', 'هْ', 'لًا', ' ', 'وَ', 'سَ', 'هْ', 'لًا'];

      // Pre-compute cumulative prefixes for smooth, jump-free rendering
      const prefixes = [];
      let acc = '';
      for (const beat of beats) {
        acc += beat;
        prefixes.push(acc);
      }

      let stepIndex = 0;
      let timerId = null;

      // Start from empty so visitor immediately sees it being typed
      ahlanEl.textContent = '';

      function tick() {
        ahlanEl.textContent = prefixes[stepIndex];
        stepIndex++;

        if (stepIndex >= prefixes.length) {
          // Completed typing: stays permanently (runs once)
          return;
        }

        // Natural organic typing cadence (130ms - 170ms)
        const delay = 140 + Math.floor(Math.random() * 35);
        timerId = setTimeout(tick, delay);
      }

      // Initial start delay (300ms) after page paint
      timerId = setTimeout(tick, 300);

      window.addEventListener('pagehide', () => {
        if (timerId) clearTimeout(timerId);
      });
    }
  }
});
