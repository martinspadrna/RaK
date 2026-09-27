// RaK 1.2 (1.155) – spodní navigace a její bezpečné metriky.
function rakEarlyMenuLocalRootHtml() {
  return [
    '<div class="appMenuGrid" data-rak-early-menu-local-root="1">',
    '  <button type="button" class="appMenuAction" data-rak-early-menu-view="settings">Nastavení</button>',
    '  <button type="button" class="appMenuAction" data-rak-early-menu-view="about">O aplikaci</button>',
    '  <button type="button" class="appMenuAction" data-rak-early-menu-view="contact">Kontakt</button>',
    '  <button type="button" class="appMenuAction" data-rak-early-menu-view="bug-report">Pošli mi chybu</button>',
    '</div>'
  ].join('');
}

function rakPopulateEarlyMenuLocalRoot(page) {
  if (!page) return null;
  let body = page.querySelector('#appMenuBody, .appMenuBody');
  if (!body) {
    const card = document.createElement('div');
    card.className = 'card appMenuPageCard';
    body = document.createElement('div');
    body.className = 'appMenuBody';
    body.id = 'appMenuBody';
    card.appendChild(body);
    page.appendChild(card);
  } else if (!body.id) {
    body.id = 'appMenuBody';
  }
  body.dataset.adminView = '';
  body.innerHTML = rakEarlyMenuLocalRootHtml();
  if (body.dataset.rakEarlyMenuLocalBound !== '1') {
    body.dataset.rakEarlyMenuLocalBound = '1';
    body.addEventListener('click', (event) => {
      const button = event.target && event.target.closest
        ? event.target.closest('[data-rak-early-menu-view]')
        : null;
      if (!button || !body.contains(button)) return;
      event.preventDefault();
      const requestedView = String(button.getAttribute('data-rak-early-menu-view') || 'menu').trim() || 'menu';
      page.dataset.rakEarlyMenuRequestedView = requestedView;
      const openRequested = () => {
        if (typeof openAppMenu !== 'function') return false;
        delete page.dataset.rakEarlyMenuShell;
        const view = String(page.dataset.rakEarlyMenuRequestedView || requestedView || 'menu');
        delete page.dataset.rakEarlyMenuRequestedView;
        openAppMenu(view);
        return true;
      };
      if (openRequested()) return;
      if (typeof window.rakEnsureFeature === 'function') {
        window.rakEnsureFeature('menu').then(openRequested).catch((err) => {
          if (typeof window.rakHandleFeatureLoadError === 'function') window.rakHandleFeatureLoadError(err, 'menu');
        });
      }
    });
  }
  return body;
}

function openRakEarlyMenuShell() {
  if (typeof toggleAppMenu === 'function') {
    toggleAppMenu();
    return;
  }
  let page = document.getElementById('menu');
  if (!page) {
    page = document.createElement('div');
    page.id = 'menu';
    page.className = 'page appMenuPage';
    page.innerHTML = [
      '<div class="topBar appMenuTopBar"><div class="appMenuTitle">Více</div></div>',
      '<div class="card appMenuPageCard"><div class="appMenuBody" id="appMenuBody"></div></div>'
    ].join('');
    const anchor = document.querySelector('.bottomNav');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(page, anchor);
    else document.body.appendChild(page);
  }
  page.dataset.rakEarlyMenuShell = '1';
  rakPopulateEarlyMenuLocalRoot(page);
  document.querySelectorAll('.page').forEach((node) => node.classList.remove('active'));
  page.classList.add('active');
  if (typeof setBottomNavActive === 'function') setBottomNavActive('menu');
  if (typeof window.rakEnsureFeature === 'function') {
    window.rakEnsureFeature('menu').then(() => {
      if (typeof openAppMenu === 'function' && page.classList.contains('active') && page.dataset.rakEarlyMenuShell === '1') {
        const requestedView = String(page.dataset.rakEarlyMenuRequestedView || 'menu');
        delete page.dataset.rakEarlyMenuRequestedView;
        delete page.dataset.rakEarlyMenuShell;
        openAppMenu(requestedView);
      }
    }).catch((err) => {
      const body = page.querySelector('#appMenuBody, .appMenuBody');
      if (body && !body.querySelector('[data-rak-early-menu-local-root]')) body.innerHTML = rakEarlyMenuLocalRootHtml();
      if (typeof window.rakHandleFeatureLoadError === 'function') window.rakHandleFeatureLoadError(err, 'menu');
    });
  }
}

function installBottomNavBindings() {
  const nav = document.querySelector('.bottomNav');
  if (!nav || nav.__rotaceBound) return;
  nav.__rotaceBound = true;

  const actionMap = {
    home: () => { if (typeof showPage === 'function') showPage('home'); if (typeof setBottomNavActive === 'function') setBottomNavActive('home'); },
    rotace: () => { if (typeof openRotaceNames === 'function') openRotaceNames(); else if (typeof showPage === 'function') showPage('rotace'); },
    kalkulacky: () => { if (typeof openKalkulacky === 'function') openKalkulacky(); else if (typeof showPage === 'function') showPage('kalkulacky'); },
    rozpisy: () => { if (typeof openRotaceMonths === 'function') openRotaceMonths(); else if (typeof showPage === 'function') showPage('rotace'); },
    statistiky: () => { if (typeof openRotaceStats === 'function') openRotaceStats(); else if (typeof showPage === 'function') showPage('rotace'); },
    menu: () => { openRakEarlyMenuShell(); }
  };

  nav.addEventListener('click', (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('button[data-action]') : null;
    if (!btn || !nav.contains(btn)) return;
    const handler = actionMap[btn.dataset.action];
    if (!handler) return;
    event.preventDefault();
    handler();
  }, { passive: false });
}

function applyRakFixedBottomNavMetrics() {
  if (window.__rakFixedBottomNavMetricsBound) {
    if (typeof window.__rakApplyFixedBottomNavMetricsNow === 'function') window.__rakApplyFixedBottomNavMetricsNow();
    return;
  }
  window.__rakFixedBottomNavMetricsBound = true;

  let pending = false;
  const root = document.documentElement;
  const apply = () => {
    pending = false;
    try {
      const nav = document.querySelector('.bottomNav');
      if (!nav || !root || !root.style) return false;
      const navRect = nav.getBoundingClientRect ? nav.getBoundingClientRect() : null;
      const navHeight = Math.max(48, Math.ceil(nav.offsetHeight || (navRect ? navRect.height : 0) || 56));
      const visualHeight = Math.max(480, Math.floor((window.visualViewport && window.visualViewport.height) || window.innerHeight || document.documentElement.clientHeight || 0));
      const navTop = navRect && Number.isFinite(navRect.top) ? navRect.top : (visualHeight - navHeight);
      const navBottom = navRect && Number.isFinite(navRect.bottom) ? navRect.bottom : visualHeight;
      const navBottomGap = Math.max(0, Math.round(visualHeight - navBottom));
      const viewport = window.visualViewport || null;
      const viewportOffsetTop = viewport ? Math.max(0, Math.round(Number(viewport.offsetTop || 0) || 0)) : 0;
      const layoutHeight = Math.max(visualHeight, Math.round(Number(window.innerHeight || 0) || 0), Math.round(Number(document.documentElement.clientHeight || 0) || 0));
      const visualBottomGap = Math.max(0, Math.round(layoutHeight - visualHeight - viewportOffsetTop));
      const bottomTotalSpace = Math.max(navHeight + 8, Math.ceil(visualHeight - navTop + 8));
      const contentSpace = Math.max(52, navHeight + 4);
      root.style.setProperty('--bottom-nav-h', navHeight + 'px');
      root.style.setProperty('--rak-fixed-bottom-space', contentSpace + 'px');
      root.style.setProperty('--rak-visual-viewport-h', visualHeight + 'px');
      root.style.setProperty('--rak-bottom-total-space', bottomTotalSpace + 'px');
      root.style.setProperty('--rak-bottom-nav-live-gap', navBottomGap + 'px');
      root.style.setProperty('--rak-visual-bottom-gap', visualBottomGap + 'px');
      root.dataset.rakBottomNavFixed = '1';
      if (document.body && document.body.classList && document.body.classList.contains('tttOpen') && typeof scheduleTttLayout === 'function') {
        try { scheduleTttLayout(); } catch (err) {}
      }
      return true;
    } catch (err) {
      return false;
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(apply);
  };
  window.__rakApplyFixedBottomNavMetricsNow = apply;
  const bind = (target, type, handler, opts) => {
    if (!target || !target.addEventListener) return;
    try {
      if (typeof registerListener === 'function') registerListener(target, type, handler, opts || { passive: true });
      else target.addEventListener(type, handler, opts || { passive: true });
    } catch (err) {}
  };

  const run = () => {
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 360);
  };
  if (document.readyState === 'loading') bind(document, 'DOMContentLoaded', run, { once: true });
  else run();
  bind(window, 'resize', schedule, { passive: true });
  bind(window, 'orientationchange', () => setTimeout(run, 120), { passive: true });
  bind(window, 'scroll', schedule, { passive: true });
  bind(window, 'pageshow', run, { passive: true });
  try {
    if (window.visualViewport) {
      bind(window.visualViewport, 'resize', () => setTimeout(apply, 80), { passive: true });
      bind(window.visualViewport, 'scroll', () => setTimeout(apply, 40), { passive: true });
    }
  } catch (err) {}
  try {
    const nav = document.querySelector('.bottomNav');
    if (nav && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(schedule);
      observer.observe(nav);
      window.__rakBottomNavResizeObserver = observer;
    }
  } catch (err) {}
}



function applyBottomNavMoreHardFix() {
  const apply = () => {
    const btn = document.querySelector('nav.bottomNav > .bottomNavMenuBtn') || document.querySelector('nav.bottomNav .bottomNavMenuBtn');
    if (!btn || !btn.style) return false;

    const compact = window.matchMedia && window.matchMedia('(max-width: 390px)').matches;
    const lightweight = document.body && (document.body.classList.contains('lightweightMode') || document.body.classList.contains('lowEndDevice'));
    const peer = document.querySelector('nav.bottomNav > .bottomNavScroll > .bottomNavBtn:not(.bottomNavMenuBtn):not(.active)')
      || document.querySelector('nav.bottomNav > .bottomNavScroll > .bottomNavBtn:not(.bottomNavMenuBtn)');
    const peerRect = peer && peer.getBoundingClientRect ? peer.getBoundingClientRect() : null;
    const peerWidth = peerRect && peerRect.width ? Math.round(peerRect.width) : (compact ? 58 : 64);
    // „Více“ je plnohodnotná položka spodní lišty: stejná šířka jako ostatní.
    const width = '100%';
    const peerHeight = peerRect && peerRect.height ? Math.round(peerRect.height) : 44;
    const height = Math.max(lightweight ? 40 : 42, Math.min(peerHeight || 44, lightweight ? 46 : 48)) + 'px';
    const setStyle = typeof setStylePropertyIfChanged === 'function'
      ? setStylePropertyIfChanged
      : ((el, prop, value, priority) => { if (el && el.style) el.style.setProperty(prop, value, priority || ''); return true; });

    setStyle(btn, 'flex', '1 1 0', 'important', 'bottomNavMore-flex');
    setStyle(btn, 'width', width, 'important', 'bottomNavMore-width');
    setStyle(btn, 'min-width', '0', 'important', 'bottomNavMore-minWidth');
    setStyle(btn, 'max-width', 'none', 'important', 'bottomNavMore-maxWidth');
    setStyle(btn, 'height', height, 'important', 'bottomNavMore-height');
    setStyle(btn, 'min-height', height, 'important', 'bottomNavMore-minHeight');
    setStyle(btn, 'max-height', height, 'important', 'bottomNavMore-maxHeight');
    setStyle(btn, 'align-self', 'center', 'important', 'bottomNavMore-alignSelf');
    setStyle(btn, 'justify-self', 'stretch', 'important', 'bottomNavMore-justifySelf');
    setStyle(btn, 'padding', lightweight ? '3px 1px' : '4px 1px 3px', 'important', 'bottomNavMore-padding');
    setStyle(btn, 'margin', '0', 'important', 'bottomNavMore-margin');
    setStyle(btn, 'box-sizing', 'border-box', 'important', 'bottomNavMore-boxSizing');
    setStyle(btn, 'justify-content', 'center', 'important', 'bottomNavMore-justify');
    setStyle(btn, 'gap', '1px', 'important', 'bottomNavMore-gap');
    setStyle(btn, 'transform', 'none', 'important', 'bottomNavMore-transform');

    const icon = btn.querySelector('.moreIcon');
    if (icon && icon.style) {
      const iconWidth = lightweight ? '28px' : (compact ? '30px' : '32px');
      const iconHeight = iconWidth;
      setStyle(icon, 'flex', '0 0 ' + iconHeight, 'important', 'bottomNavMoreIcon-flex');
      setStyle(icon, 'width', iconWidth, 'important', 'bottomNavMoreIcon-width');
      setStyle(icon, 'height', iconHeight, 'important', 'bottomNavMoreIcon-height');
      setStyle(icon, 'max-width', iconWidth, 'important', 'bottomNavMoreIcon-maxWidth');
      setStyle(icon, 'max-height', iconHeight, 'important', 'bottomNavMoreIcon-maxHeight');
      setStyle(icon, 'padding', '0', 'important', 'bottomNavMoreIcon-padding');
      setStyle(icon, 'margin', '0 auto', 'important', 'bottomNavMoreIcon-margin');
      setStyle(icon, 'transform', 'none', 'important', 'bottomNavMoreIcon-transform');
      setStyle(icon, 'box-sizing', 'border-box', 'important', 'bottomNavMoreIcon-boxSizing');
    }

    const label = btn.querySelector('.bottomNavLabel');
    if (label && label.style) {
      setStyle(label, 'font-size', lightweight ? '8px' : '8.6px', 'important', 'bottomNavMoreLabel-fontSize');
      setStyle(label, 'line-height', '1', 'important', 'bottomNavMoreLabel-lineHeight');
      setStyle(label, 'margin', '0', 'important', 'bottomNavMoreLabel-margin');
      setStyle(label, 'padding', '0', 'important', 'bottomNavMoreLabel-padding');
      setStyle(label, 'white-space', 'nowrap', 'important', 'bottomNavMoreLabel-whiteSpace');
      setStyle(label, 'letter-spacing', '-.02em', 'important', 'bottomNavMoreLabel-letterSpacing');
      setStyle(label, 'transform', 'none', 'important', 'bottomNavMoreLabel-transform');
    }
    return true;
  };

  const run = () => {
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 350);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
  window.addEventListener('resize', () => requestAnimationFrame(apply), { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(apply, 120), { passive: true });
  window.__rakApplyBottomNavMoreHardFix = apply;
}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-bottom-nav.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
