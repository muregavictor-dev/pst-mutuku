/* ==========================================================================
   PASTOR MUTUKU — site-wide interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Sticky navbar shrink on scroll ---------- */
  const nav = document.querySelector('.navbar-mutuku');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Scroll-reveal animations ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Scroll-to-top button ---------- */
  const topBtn = document.querySelector('.scroll-top-btn');
  if (topBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) topBtn.classList.add('show');
      else topBtn.classList.remove('show');
    }, { passive: true });
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Toast helper (exposed globally) ---------- */
  window.showToast = function (message) {
    let toast = document.querySelector('.toast-mutuku');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-mutuku';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  };

  /* ---------- "Buy Now" buttons everywhere ---------- */
  document.querySelectorAll('[data-buy-now]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const title = btn.getAttribute('data-book-title') || 'this book';
      const price = btn.getAttribute('data-book-price') || '';
      if (window.location.pathname.endsWith('checkout.html')) return;
      e.preventDefault();
      try {
        sessionStorage.setItem('mutuku_selected_book', JSON.stringify({ title, price }));
      } catch (err) { /* storage unavailable, proceed anyway */ }
      window.location.href = 'checkout.html?book=' + encodeURIComponent(title) + '&price=' + encodeURIComponent(price);
    });
  });

  /* ---------- Quotes rotating slider (homepage + quotes page) ---------- */
  const slider = document.querySelector('[data-quote-slider]');
  if (slider) {
    const slides = slider.querySelectorAll('.quote-slide');
    const dotsWrap = slider.querySelector('[data-quote-dots]');
    let current = 0;
    let timer;

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'quote-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Show quote ' + (i + 1));
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;border:1px solid var(--gold);background:' + (i === 0 ? 'var(--gold)' : 'transparent') + ';margin:0 5px;cursor:pointer;padding:0;';
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      });
    }

    function goTo(i) {
      slides[current].classList.remove('active');
      if (dotsWrap) dotsWrap.children[current].style.background = 'transparent';
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('active');
      if (dotsWrap) dotsWrap.children[current].style.background = 'var(--gold)';
    }

    function next() { goTo(current + 1); }

    if (slides.length > 1) {
      timer = setInterval(next, 5500);
      slider.addEventListener('mouseenter', () => clearInterval(timer));
      slider.addEventListener('mouseleave', () => { timer = setInterval(next, 5500); });
      const prevBtn = slider.querySelector('[data-quote-prev]');
      const nextBtn = slider.querySelector('[data-quote-next]');
      if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
    }
  }

  /* ---------- Book category filter (books.html) ---------- */
  const pills = document.querySelectorAll('[data-filter-pill]');
  const bookItems = document.querySelectorAll('[data-book-item]');
  if (pills.length && bookItems.length) {
    const applyFilter = (cat) => {
      pills.forEach((p) => p.classList.toggle('active', p.getAttribute('data-filter-pill') === cat));
      bookItems.forEach((item) => {
        const match = cat === 'all' || item.getAttribute('data-category') === cat;
        item.style.display = match ? '' : 'none';
        if (match) {
          item.classList.remove('reveal', 'in');
          void item.offsetWidth;
          item.classList.add('reveal');
          requestAnimationFrame(() => item.classList.add('in'));
        }
      });
    };

    pills.forEach((pill) => {
      pill.addEventListener('click', () => applyFilter(pill.getAttribute('data-filter-pill')));
    });

    /* Honour ?cat= query param so links like books.html?cat=faith pre-filter the page */
    const bookParams = new URLSearchParams(window.location.search);
    const requestedCat = bookParams.get('cat');
    const validCats = Array.from(pills).map((p) => p.getAttribute('data-filter-pill'));
    if (requestedCat && validCats.includes(requestedCat)) {
      applyFilter(requestedCat);
    }
  }

  /* ---------- Book search (books.html) ---------- */
  const searchInput = document.querySelector('[data-book-search]');
  if (searchInput && bookItems.length) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      bookItems.forEach((item) => {
        const title = (item.getAttribute('data-title') || '').toLowerCase();
        item.style.display = title.includes(q) ? '' : 'none';
      });
    });
  }

  /* ---------- Checkout page: payment method + summary ---------- */
  const mpesaToggle = document.querySelector('[data-mpesa-toggle]');
  if (mpesaToggle) mpesaToggle.classList.add('selected');

  const params = new URLSearchParams(window.location.search);
  const bookTitleEl = document.querySelector('[data-order-title]');
  const bookPriceEl = document.querySelector('[data-order-price]');
  const totalEl = document.querySelector('[data-order-total]');
  if (bookTitleEl && bookPriceEl) {
    let title = params.get('book');
    let price = params.get('price');
    if (!title) {
      try {
        const stored = JSON.parse(sessionStorage.getItem('mutuku_selected_book') || 'null');
        if (stored) { title = stored.title; price = stored.price; }
      } catch (err) { /* ignore */ }
    }
    title = title || 'Quiet Fire: Cultivating a Deeper Walk';
    price = price || '1,100';
    bookTitleEl.textContent = title;
    bookPriceEl.textContent = 'KES ' + price;
    if (totalEl) totalEl.textContent = 'KES ' + price;
  }

  const checkoutForm = document.querySelector('[data-checkout-form]');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = checkoutForm.querySelector('[name="phone"]');
      if (phone && phone.value.trim().length < 9) {
        phone.classList.add('is-invalid');
        return;
      }
      const payBtn = checkoutForm.querySelector('button[type="submit"]');
      const originalText = payBtn.textContent;
      payBtn.disabled = true;
      payBtn.textContent = 'Sending STK Push…';
      setTimeout(() => {
        payBtn.textContent = 'Check Your Phone';
        showToast('M-Pesa prompt sent. Enter your PIN to complete payment.');
        setTimeout(() => {
          payBtn.disabled = false;
          payBtn.textContent = originalText;
        }, 3000);
      }, 1600);
    });
  }

  /* ---------- Contact form ---------- */
  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Thank you. Your message has been received.');
      contactForm.reset();
    });
  }

  /* ---------- Newsletter form ---------- */
  document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('You are now subscribed to weekly reflections.');
      form.reset();
    });
  });

  /* ---------- Mobile nav: close on link click ---------- */
  const navCollapse = document.querySelector('#mainNav');
  if (navCollapse) {
    navCollapse.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (navCollapse.classList.contains('show') && window.bootstrap) {
          const bsCollapse = window.bootstrap.Collapse.getOrCreateInstance(navCollapse);
          bsCollapse.hide();
        }
      });
    });
  }

});
