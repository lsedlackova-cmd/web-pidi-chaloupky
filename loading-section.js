(function(){
  const ALL = [
    { id: 'domu',      html: '/domu/domu.html',                               css: '/domu/domu.css',                               js: '/domu/domu.js',                               selector: '.pidi-home' },
    { id: 'nase',      html: '/nase-pidichaloupky/nase-pidichaloupky.html',   css: '/nase-pidichaloupky/nase-pidichaloupky.css',   js: '/nase-pidichaloupky/nase-pidichaloupky.js',   selector: '.pidi-section' },
    { id: 'galerie',   html: '/galerie/galerie.html',                          css: '/galerie/galerie.css',                          js: '/galerie/galerie.js',                          selector: '.pidi-galerie' },
    { id: 'spokojeni', html: '/spokojeni-pidilidi/spokojeni-pidilidi.html',    css: '/spokojeni-pidilidi/spokojeni-pidilidi.css',    js: '/spokojeni-pidilidi/spokojeni-pidilidi.js',    selector: '.pidi-spokojeni, .pidi-reviews' },
    { id: 'ozvete',    html: '/ozvete-se-nam/ozvete-se-nam.html',              css: '/ozvete-se-nam/ozvete-se-nam.css',              js: '/ozvete-se-nam/ozvete-se-nam.js',              selector: '.pidi-kontakt, .pidi-ozvete' },
  ];
  const byId = Object.fromEntries(ALL.map(s => [s.id, s]));
  const selectors = Object.fromEntries(ALL.map(s => [s.id, s.selector]));

  const path = location.pathname.replace(/\/+$/, '').toLowerCase();
  let currentId = 'index';
  if (path.includes('/domu/')) currentId = 'domu';
  else if (path.includes('/nase-pidichaloupky/')) currentId = 'nase';
  else if (path.includes('/galerie/')) currentId = 'galerie';
  else if (path.includes('/spokojeni-pidilidi/')) currentId = 'spokojeni';
  else if (path.includes('/ozvete-se-nam/')) currentId = 'ozvete';

  const ids = ALL.map(s => s.id);
  const anchorId = (currentId === 'index') ? 'domu' : currentId;
  const idx = ids.indexOf(anchorId);

  const nextQueue = (idx === -1) ? ALL.slice() : ALL.slice(idx + 1);
  const prevQueue = (idx === -1) ? [] : ALL.slice(0, idx).reverse();

  if (!document.getElementById('section-loader-style')) {
    const st = document.createElement('style');
    st.id = 'section-loader-style';
    st.textContent = `
      .section-wrap{opacity:0;transform:translateY(12px);transition:opacity .45s ease,transform .45s ease}
      .section-wrap.reveal{opacity:1;transform:none}
      .section-divider{width:100%;height:1px;background:var(--accent);opacity:.7}
    `;
    document.head.appendChild(st);
  }

  const main = document.querySelector('main') || document.body;

  let mountBottom = document.getElementById('sections-root');
  if (!mountBottom) {
    mountBottom = document.createElement('div');
    mountBottom.id = 'sections-root';
    main.appendChild(mountBottom);
  }

  let mountTop = document.getElementById('sections-root-top');
  if (!mountTop) {
    mountTop = document.createElement('div');
    mountTop.id = 'sections-root-top';
    const firstDivider = main.querySelector('.section-divider');
    if (firstDivider && firstDivider.parentNode) {
      firstDivider.insertAdjacentElement('afterend', mountTop);
    } else {
      main.insertBefore(mountTop, main.firstChild);
    }
  }

  const ensureCSS = (href)=>{
    if (!href) return;
    if (document.querySelector(`link[data-href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-href', href);
    document.head.appendChild(l);
  };
  const ensureJS = (src)=>{
    if (!src) return;
    if (document.querySelector(`script[data-src="${src}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-src', src);
    document.body.appendChild(s);
  };

  const sentinelBottom = document.createElement('div');
  sentinelBottom.className = 'section-sentinel-bottom';
  mountBottom.appendChild(sentinelBottom);

  const sentinelTopInitial = document.createElement('div');
  sentinelTopInitial.className = 'section-sentinel-top';
  mountTop.appendChild(sentinelTopInitial);

  const loaded = new Set();

  async function loadSpec(spec){
    try{
      ensureCSS(spec.css);
      const res = await fetch(spec.html, { cache: 'no-cache' });
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');
      const sec  = doc.querySelector(spec.selector);
      return sec || null;
    }catch(e){
      console.error('Načítání sekce selhalo:', spec.id, e);
      return null;
    }
  }
  function wrapWithFade(el){ const w=document.createElement('div'); w.className='section-wrap'; w.appendChild(el); requestAnimationFrame(()=>w.classList.add('reveal')); return w; }
  function makeDivider(){ const d=document.createElement('div'); d.className='section-divider'; return d; }

  const ioDown = new IntersectionObserver(async (entries)=>{
    for (const entry of entries){
      if (!entry.isIntersecting) continue;
      if (!nextQueue.length) continue;

      const spec = nextQueue.shift();
      if (loaded.has(spec.id)) continue;

      const sec = await loadSpec(spec);
      if (sec){
        const divider = makeDivider();
        const wrap = wrapWithFade(sec);
        entry.target.replaceWith(divider, wrap);

        const newSentinel = document.createElement('div');
        newSentinel.className = 'section-sentinel-bottom';
        mountBottom.appendChild(newSentinel);
        ioDown.observe(newSentinel);

        ensureJS(spec.js);
        loaded.add(spec.id);
      }
    }
  }, { rootMargin: '200px 0px 200px 0px' });
  ioDown.observe(sentinelBottom);

  let lastY = window.scrollY;
  window.addEventListener('scroll', ()=>{ lastY = window.scrollY; }, { passive:true });

  const ioUp = new IntersectionObserver(async (entries)=>{
    for (const entry of entries){
      if (!entry.isIntersecting) continue;

      const nowY = window.scrollY;
      const atTop = nowY <= 5;
      const scrollingUp = nowY < lastY;
      lastY = nowY;

      if (!scrollingUp && !atTop) continue;
      if (!prevQueue.length) continue;

      const spec = prevQueue.shift();
      if (loaded.has(spec.id)) continue;

      const sec = await loadSpec(spec);
      if (sec){
        const divider = makeDivider();
        const wrap = wrapWithFade(sec);
        entry.target.replaceWith(wrap, divider);

        const newTopSentinel = document.createElement('div');
        newTopSentinel.className = 'section-sentinel-top';
        mountTop.insertBefore(newTopSentinel, mountTop.firstChild);
        ioUp.observe(newTopSentinel);

        ensureJS(spec.js);
        loaded.add(spec.id);
      }
    }
  }, { rootMargin: '200px 0px 0px 0px' });
  ioUp.observe(sentinelTopInitial);

  async function loadPrevNow(){
    if (!prevQueue.length) return false;
    const spec = prevQueue.shift();
    if (loaded.has(spec.id)) return true;

    const sec = await loadSpec(spec);
    if (!sec) return false;

    const divider = makeDivider();
    const wrap = wrapWithFade(sec);

    const liveTop = mountTop.querySelector('.section-sentinel-top');
    if (liveTop && liveTop.isConnected) {
      liveTop.replaceWith(wrap, divider);
    } else {
      mountTop.insertBefore(wrap, mountTop.firstChild || null);
      mountTop.insertBefore(divider, wrap.nextSibling || null);
    }

    const newTopSentinel = document.createElement('div');
    newTopSentinel.className = 'section-sentinel-top';
    mountTop.insertBefore(newTopSentinel, mountTop.firstChild);
    ioUp.observe(newTopSentinel);

    ensureJS(spec.js);
    loaded.add(spec.id);
    return true;
  }

  async function loadNextNow(){
    if (!nextQueue.length) return false;
    const spec = nextQueue.shift();
    if (loaded.has(spec.id)) return true;

    const sec = await loadSpec(spec);
    if (!sec) return false;

    const divider = makeDivider();
    const wrap = wrapWithFade(sec);

    const liveBottom = mountBottom.querySelector('.section-sentinel-bottom');
    if (liveBottom && liveBottom.isConnected) {
      liveBottom.replaceWith(divider, wrap);
    } else {
      mountBottom.appendChild(divider);
      mountBottom.appendChild(wrap);
    }

    const newBottomSentinel = document.createElement('div');
    newBottomSentinel.className = 'section-sentinel-bottom';
    mountBottom.appendChild(newBottomSentinel);
    ioDown.observe(newBottomSentinel);

    ensureJS(spec.js);
    loaded.add(spec.id);
    return true;
  }

  function headerHeight(){
    const v = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
    return parseFloat(v) || 80;
  }

  function scrollToEl(el){
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() - 8;
    window.scrollTo({ top, behavior:'smooth' });
  }

  function getSectionElById(id){
    const sel = selectors[id];
    return sel ? document.querySelector(sel) : null;
  }

  async function loadSection(id){
    if (!byId[id]) return false;

    if (getSectionElById(id)) return true;

    const inPrev = prevQueue.some(s => s.id === id);
    const inNext = nextQueue.some(s => s.id === id);

    if (inPrev){
      while (!getSectionElById(id) && prevQueue.length){ await loadPrevNow(); }
    } else if (inNext){
      while (!getSectionElById(id) && nextQueue.length){ await loadNextNow(); }
    } else {
      let steps = 0;
      while (!getSectionElById(id) && prevQueue.length && steps < 5){ await loadPrevNow(); steps++; }
      steps = 0;
      while (!getSectionElById(id) && nextQueue.length && steps < 5){ await loadNextNow(); steps++; }
    }

    return !!getSectionElById(id);
  }

  async function scrollToSection(id){
    scrollToEl(getSectionElById(id));
  }

  async function loadAndScroll(id){
    const ok = await loadSection(id);
    if (ok) await scrollToSection(id);
    return ok;
  }

  window.PIDI = window.PIDI || {};
  window.PIDI.loadSection     = loadSection;
  window.PIDI.scrollToSection = scrollToSection;
  window.PIDI.loadAndScroll   = loadAndScroll;

  try{
    const usp = new URLSearchParams(location.search);
    const go = usp.get('go');
    if (go && byId[go]) {
      setTimeout(()=> loadAndScroll(go), 50);
    }
  }catch(_){}

  function tryLoadPrevAtTop(){
    if (window.scrollY > 5) return;
    if (!prevQueue.length) return;
    if (loaded.has(prevQueue[0]?.id)) return;
    (async ()=>{ await loadPrevNow(); })();
  }
  window.addEventListener('wheel', (e)=>{
    if (e.deltaY < 0) tryLoadPrevAtTop();
  }, { passive:true });
  let touchStartY = 0;
  window.addEventListener('touchstart', (e)=>{
    if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
  }, { passive:true });
  window.addEventListener('touchmove', (e)=>{
    const y = e.touches && e.touches.length ? e.touches[0].clientY : touchStartY;
    const dy = y - touchStartY;
    if (dy > 10) tryLoadPrevAtTop();
  }, { passive:true });

})();













