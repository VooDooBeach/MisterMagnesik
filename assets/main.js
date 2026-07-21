(() => {
  'use strict';
  const navigationEntry = performance.getEntriesByType?.('navigation')[0];
  const reloaded = navigationEntry?.type === 'reload' || performance.navigation?.type === 1;
  if (reloaded && !location.hash) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const resetScrollPosition = () => {
      scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };
    resetScrollPosition();
    addEventListener('DOMContentLoaded', resetScrollPosition, { once: true });
    addEventListener('pageshow', () => requestAnimationFrame(resetScrollPosition), { once: true });
    addEventListener('load', () => {
      resetScrollPosition();
      setTimeout(resetScrollPosition, 50);
      setTimeout(resetScrollPosition, 250);
    }, { once: true });
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) revealItems.forEach(item => item.classList.add('visible'));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08, rootMargin: '0px 0px 80px' });
    revealItems.forEach(item => observer.observe(item));
  }

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#main-menu');
  const closeMenu = () => { if (menu && menuButton) { menu.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.blur(); } };
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => { const open = menu.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menuButton.focus(); } });
  }

  document.querySelectorAll('a[href="#kontakt"]').forEach(link => link.addEventListener('click', () => {
    closeMenu();
    link.style.transform = '';
    requestAnimationFrame(() => document.querySelector('nav')?.classList.remove('menu-open'));
  }));

  const sectionLinks = menu ? [...menu.querySelectorAll('a[href^="#"]')] : [];
  if ('IntersectionObserver' in window && sectionLinks.length) {
    const sections = sectionLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(link => {
        const current = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', current);
        if (current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    }), { rootMargin: '-25% 0px -65% 0px' });
    sections.forEach(section => observer.observe(section));
  }

  document.querySelectorAll('[data-product]').forEach(link => link.addEventListener('click', () => {
    const select = document.querySelector('#product');
    if (select) { select.value = link.dataset.product; setTimeout(() => select.focus({ preventScroll: true }), reducedMotion ? 0 : 450); }
  }));

  const filters = document.querySelectorAll('.filter');
  const projects = document.querySelectorAll('.project');
  filters.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    filters.forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    projects.forEach(project => { project.hidden = selected !== 'all' && project.dataset.category !== selected; });
  }));

  const floating = document.querySelector('.float');
  let frame = 0;
  const updateContrast = () => {
    frame = 0;
    if (!floating) return;
    const rect = floating.getBoundingClientRect();
    const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    const dark = document.elementsFromPoint(x, y).some(el => el !== floating && !el.closest('.float') && el.closest('.black,.panel.dark,.contact-card'));
    floating.classList.toggle('on-dark', Boolean(dark));
  };
  const scheduleContrast = () => { if (!frame) frame = requestAnimationFrame(updateContrast); };
  if (floating) { addEventListener('scroll', scheduleContrast, { passive: true }); addEventListener('resize', scheduleContrast, { passive: true }); updateContrast(); }

  const openEmail = (form, subject, body) => {
    const status = form.querySelector('[role="status"]');
    if (status) status.textContent = 'Otwieramy aplikację pocztową z przygotowaną wiadomością.';
    location.href = `mailto:kontakt@mistermagnesik.pl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const reviewForm = document.querySelector('#review-form');
  if (reviewForm) reviewForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = reviewForm.elements['review-name'].value.trim();
    const review = reviewForm.elements['review-text'].value.trim();
    openEmail(reviewForm, 'Nowa opinia klienta — Mister Magnesik', `Autor: ${name}\n\nTreść opinii:\n${review}\n\nProszę o weryfikację przed publikacją.`);
  });
  const calculator = document.querySelector('[data-calculator]');
  if (calculator) {
    const quantityInput = calculator.querySelector('#calculator-quantity');
    const quantityOutput = calculator.querySelector('#calculator-quantity-output');
    const unitOutput = calculator.querySelector('#calculator-unit-price');
    const totalOutput = calculator.querySelector('#calculator-total');
    const quoteButton = calculator.querySelector('#calculator-quote');
    const money = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
    const updateCalculator = () => {
      const quantity = Number(quantityInput.value);
      const unitPrice = quantity >= 500 ? 2.50 : 3.10;
      quantityOutput.value = String(quantity);
      quantityOutput.textContent = String(quantity);
      unitOutput.textContent = money.format(unitPrice);
      totalOutput.textContent = money.format(quantity * unitPrice);
    };
    quantityInput.addEventListener('input', updateCalculator, { passive: true });
    quoteButton.addEventListener('click', () => {
      const form = document.querySelector('#quote-form');
      if (!form) return;
      form.querySelector('#product').value = 'Magnesy-wizytówki';
      form.querySelector('#format').value = '90 × 55 mm';
      form.querySelector('#quantity').value = quantityInput.value;
    });
    updateCalculator();
  }

  const productSlider = document.querySelector('.products');
  const productDots = [...document.querySelectorAll('.product-dots i')];
  if (productSlider && productDots.length) {
    const productCards = [...productSlider.querySelectorAll('.product')];
    let sliderFrame = 0;
    const updateProductDots = () => {
      sliderFrame = 0;
      const sliderCenter = productSlider.scrollLeft + productSlider.clientWidth / 2;
      let activeIndex = 0;
      let closestDistance = Infinity;
      productCards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - sliderCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          activeIndex = index;
        }
      });
      productDots.forEach((dot, index) => dot.classList.toggle('active', index === activeIndex));
    };
    productSlider.addEventListener('scroll', () => {
      if (!sliderFrame) sliderFrame = requestAnimationFrame(updateProductDots);
    }, { passive: true });
    window.addEventListener('resize', updateProductDots, { passive: true });
    updateProductDots();
  }

  const countElements = document.querySelectorAll('.count-up[data-count]');
  if (countElements.length) {
    const animateCount = element => {
      const target = Number(element.dataset.count || 0);
      if (reducedMotion || !target) {
        element.textContent = String(target);
        return;
      }
      const startedAt = performance.now();
      const duration = 2100;
      const tick = now => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const countObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: .6 });
    countElements.forEach(element => countObserver.observe(element));
  }

  const precisePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (precisePointer && !reducedMotion) {
    document.querySelectorAll('.btn').forEach(button => {
      if (button.closest('nav,.float')) return;
      button.classList.add('magnetic');
      button.addEventListener('pointermove', event => {
        const box = button.getBoundingClientRect();
        const x = (event.clientX - box.left - box.width / 2) * .12;
        const y = (event.clientY - box.top - box.height / 2) * .16;
        button.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
    document.querySelectorAll('.gallery img').forEach(image => {
      image.classList.add('motion-tilt');
      image.addEventListener('pointermove', event => {
        const box = image.getBoundingClientRect();
        const rotateY = ((event.clientX - box.left) / box.width - .5) * 4;
        const rotateX = (.5 - (event.clientY - box.top) / box.height) * 4;
        image.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.018)`;
      });
      image.addEventListener('pointerleave', () => { image.style.transform = ''; });
    });
  }

  const faqList = document.querySelector('#faq-list');
  const faqToggle = document.querySelector('.faq-toggle');
  if (faqList && faqToggle) {
    faqToggle.addEventListener('click', () => {
      const expanded = faqList.classList.toggle('expanded');
      faqToggle.setAttribute('aria-expanded', String(expanded));
      faqToggle.textContent = expanded ? 'Pokaż mniej pytań' : 'Pokaż więcej pytań';
      if (!expanded) faqList.querySelectorAll('.faq-more[open]').forEach(item => item.removeAttribute('open'));
    });
  }

  const quoteForm = document.querySelector('#quote-form');
  if (quoteForm) {
    const formsparkUrl = 'https://submit-form.com/4rtrH5OBY';
    const uploadcarePublicKey = '2d12ff7d8dd4b613b877';
    const attachment = quoteForm.querySelector('#attachment');
    const status = quoteForm.querySelector('.form-status');
    const uploadFile = async file => {
      if (!file || !file.size) return null;
      const upload = new FormData();
      upload.append('UPLOADCARE_PUB_KEY', uploadcarePublicKey);
      upload.append('UPLOADCARE_STORE', '1');
      upload.append('file', file, file.name);
      const response = await fetch('https://upload.uploadcare.com/base/', { method: 'POST', body: upload });
      if (!response.ok) throw new Error(`Uploadcare HTTP ${response.status}`);
      const result = await response.json();
      if (!result.file) throw new Error('Uploadcare nie zwrócił identyfikatora pliku.');
      return { name: file.name, url: `https://ucarecdn.com/${result.file}/` };
    };
    attachment?.addEventListener('change', () => {
      const file = attachment.files?.[0];
      const tooLarge = Boolean(file && file.size > 10 * 1024 * 1024);
      attachment.setCustomValidity(tooLarge ? 'Załącznik może mieć maksymalnie 10 MB.' : '');
      if (status) status.textContent = tooLarge ? 'Wybrany plik jest większy niż 10 MB.' : file ? `Wybrano plik: ${file.name}` : '';
    });
    quoteForm.addEventListener('submit', async event => {
      if (!quoteForm.checkValidity()) {
        event.preventDefault();
        quoteForm.reportValidity();
        return;
      }
      event.preventDefault();
      if (status) status.textContent = 'Wysyłamy zapytanie. Za chwilę zobaczysz potwierdzenie.';
      const submitButton = quoteForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        const data = new FormData(quoteForm);
        const file = data.get('attachment');
        const uploaded = file instanceof File && file.size ? await uploadFile(file) : null;
        const payload = {};
        data.forEach((value, key) => {
          if (!(value instanceof File) && !key.startsWith('_')) payload[key] = value;
        });
        payload['Źródło'] = 'Formularz wyceny na stronie głównej';
        if (uploaded) {
          payload['Nazwa załącznika'] = uploaded.name;
          payload['Załącznik — otwórz lub pobierz'] = uploaded.url;
        }
        payload._email = {
          subject: 'Nowe zapytanie ze strony Mister Magnesik',
          from: payload['Imię i nazwisko'] || 'Klient Mister Magnesik'
        };
        const response = await fetch(formsparkUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Formspark HTTP ${response.status}`);
        window.location.href = 'https://mistermagnesik.pl/dziekujemy.html';
      } catch (error) {
        console.error('Nie udało się wysłać formularza:', error);
        if (status) status.textContent = 'Nie udało się wysłać zapytania. Spróbuj ponownie lub napisz na kontakt@mistermagnesik.pl.';
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
})();
