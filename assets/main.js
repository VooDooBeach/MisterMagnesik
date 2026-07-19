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
  const closeMenu = () => { if (menu && menuButton) { menu.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); } };
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => { const open = menu.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(open)); });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menuButton.focus(); } });
  }

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
    if (status) status.textContent = 'Otwieramy aplikacjÄ™ pocztowÄ… z przygotowanÄ… wiadomoĹ›ciÄ….';
    location.href = `mailto:kontakt@mistermagnesik.pl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const reviewForm = document.querySelector('#review-form');
  if (reviewForm) reviewForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = reviewForm.elements['review-name'].value.trim();
    const review = reviewForm.elements['review-text'].value.trim();
    openEmail(reviewForm, 'Nowa opinia klienta â€” Mister Magnesik', `Autor: ${name}\n\nTreĹ›Ä‡ opinii:\n${review}\n\nProszÄ™ o weryfikacjÄ™ przed publikacjÄ….`);
  });
  const quoteForm = document.querySelector('#quote-form');
  if (quoteForm) quoteForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(quoteForm);
    const body = [`ImiÄ™ i nazwisko: ${data.get('name') || ''}`, `Telefon: ${data.get('phone') || ''}`, `E-mail: ${data.get('email') || ''}`, `Produkt: ${data.get('product') || ''}`, `Format: ${data.get('format') || ''}`, `Liczba sztuk: ${data.get('quantity') || ''}`, '', 'Opis zamĂłwienia:', data.get('message') || ''].join('\n');
    openEmail(quoteForm, 'Zapytanie ze strony Mister Magnesik', body);
  });
})();

