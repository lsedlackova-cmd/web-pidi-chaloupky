(function(){
  const ALL = [
    { id: 'domu', html: '/domu/domu.html', css: '/domu/domu.css', js: '/domu/domu.js', selector: '.pidi-home' },
    { id: 'nase', html: '/nase-pidichaloupky/nase-pidichaloupky.html', css: '/nase-pidichaloupky/nase-pidichaloupky.css', js: '/nase-pidichaloupky/nase-pidichaloupky.js', selector: '.pidi-section' },
  ];

  const path = location.pathname.replace(/\/+$/, '');
  let currentId = 'index';
  if (path.includes('/domu/')) currentId = 'domu';
  else if (path.includes('/nase-pidichaloupky/')) currentId = 'nase';

  const ids = ALL.map(s => s.id);
  const anchorId = (currentId === 'index') ? 'domu' : currentId; 
  const idx = ids.indexOf(anchorId);

  const nextQueue = (idx === -1) ? ALL.slice() : ALL.slice(idx + 1);  
  const prevQueue = (idx === -1) ? [] : ALL.slice(0, idx).reverse();  

  if (nextQueue.length === 0 && prevQueue.length === 0) return;

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

  const sentinelTop = document.createElement('div');
  sentinelTop.className = 'section-sentinel-top';
  mountTop.appendChild(sentinelTop);

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
      const scrollingUp = nowY < lastY;
      lastY = nowY;
      if (!scrollingUp) continue;
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
  ioUp.observe(sentinelTop);

  function tryLoadPrevAtTop(){
    if (window.scrollY > 5) return;
    if (!prevQueue.length) return;
    if (loaded.has(prevQueue[0]?.id)) return;

    window.scrollTo({ top: 0 }); 
    (async ()=>{
      const spec = prevQueue.shift();
      if (!spec) return;
      const sec = await loadSpec(spec);
      if (!sec) return;

      const divider = makeDivider();
      const wrap = wrapWithFade(sec);
      sentinelTop.replaceWith(wrap, divider);

      const newTopSentinel = document.createElement('div');
      newTopSentinel.className = 'section-sentinel-top';
      mountTop.insertBefore(newTopSentinel, mountTop.firstChild);
      ioUp.observe(newTopSentinel);

      ensureJS(spec.js);
      loaded.add(spec.id);
    })();
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








