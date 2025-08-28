// Header: menu + přesná navigace na sekce přes PIDI.loadAndScroll
(async function () {
  const mount = document.getElementById('header-root');
  if (!mount) return;

  try{
    const res = await fetch('/header/header.html', { cache: 'no-cache' });
    mount.innerHTML = await res.text();
  } catch (e){
    console.error('Načtení headeru selhalo:', e);
    return;
  }

  const header = mount.querySelector('.pidi-header');
  const inner  = mount.querySelector('.pidi-header__inner');
  const btn    = mount.querySelector('.pidi-menu');
  const bars   = mount.querySelector('.pidi-menu__bars');
  const drawer = mount.querySelector('.pidi-drawer');
  if (!header || !inner || !btn || !bars || !drawer) return;

  const mqMobile = window.matchMedia('(max-width: 480px)');
  const px = (v) => { const n = parseFloat(v || '0'); return Number.isFinite(n) ? n : 0; };
  const padLeft = (el) => px(getComputedStyle(el).paddingLeft);

  function positionDrawer() {
    const wasOpen = drawer.classList.contains('open');
    if (!wasOpen) { drawer.style.visibility='hidden'; drawer.classList.add('open'); }

    const rHeader = header.getBoundingClientRect();
    const rInner  = inner.getBoundingClientRect();
    const rBars   = bars.getBoundingClientRect();

    const top = Math.round(rHeader.bottom - rInner.top);
    drawer.style.top = `${top}px`;

    if (mqMobile.matches) {
      drawer.style.left = `${Math.round(padLeft(inner))}px`;
    } else {
      let left = Math.round(rBars.left - rInner.left);
      drawer.style.left = `${left}px`;
      void drawer.offsetWidth;
      const rDrawer = drawer.getBoundingClientRect();
      const delta = Math.round(rDrawer.left - rBars.left);
      if (delta !== 0) { left = left - delta; drawer.style.left = `${left}px`; }
    }

    if (!wasOpen) { drawer.classList.remove('open'); drawer.style.visibility=''; }
  }

  function toggleMenu() { positionDrawer(); drawer.classList.toggle('open'); }
  function closeMenu()  { drawer.classList.remove('open'); }

  btn.addEventListener('click', toggleMenu);

  // --- mapování <a> -> ID sekce (pro SPA navigaci) ---
  function linkToId(a){
    try{
      const u = new URL(a.href, location.href);
      const p = u.pathname.toLowerCase();
      if (p.includes('/domu/'))               return 'domu';
      if (p.includes('/nase-pidichaloupky/')) return 'nase';
      if (p.includes('/galerie/'))            return 'galerie';
      if (p.includes('/spokojeni-pidilidi/')) return 'spokojeni';
      if (p.includes('/ozvete-se-nam/'))      return 'ozvete';   // ← přidáno
    }catch(_){}
    const t = (a.textContent || '').trim().toLowerCase();
    if (t.includes('domů'))                    return 'domu';
    if (t.includes('naše pidichaloupky'))      return 'nase';
    if (t.includes('galerie'))                 return 'galerie';
    if (t.includes('spokojení pidilidi') ||
        t.includes('spokojeni pidilidi'))      return 'spokojeni';
    if (t.includes('ozvěte se nám') ||
        t.includes('ozvete se nam'))           return 'ozvete';  // ← přidáno
    return null;
  }

  // Klik v menu (drawer) – SPA nebo fallback full redirect
  drawer.addEventListener('click', async (e)=>{
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;

    const id = linkToId(a);
    if (!id) return;

    e.preventDefault();
    requestAnimationFrame(closeMenu);

    const ready = ()=> !!(window.PIDI && typeof window.PIDI.loadAndScroll === 'function');
    const ok = await new Promise(res=>{
      if (ready()) return res(true);
      const t0 = performance.now();
      const iv = setInterval(()=>{
        if (ready() || performance.now() - t0 > 4000){ clearInterval(iv); res(ready()); }
      }, 50);
    });

    if (ok){
      await window.PIDI.loadAndScroll(id);
    } else {
      // Fallback cesty (doplněna 'ozvete')
      const targetPath =
        id === 'domu'      ? '/domu/domu.html' :
        id === 'nase'      ? '/nase-pidichaloupky/nase-pidichaloupky.html' :
        id === 'spokojeni' ? '/spokojeni-pidilidi/spokojeni-pidilidi.html' :
        id === 'ozvete'    ? '/ozvete-se-nam/ozvete-se-nam.html' :
                             '/galerie/galerie.html';
      const url = `${targetPath}?go=${encodeURIComponent(id)}`;
      setTimeout(()=>{ window.location.assign(url); }, 0);
    }
  }, true);

  // UX kosmetika (hover)
  drawer.addEventListener('pointerenter', (e)=>{ const a=e.target.closest('a'); if(a) a.classList.add('is-hover'); });
  drawer.addEventListener('pointerleave', (e)=>{ const a=e.target.closest('a'); if(a) a.classList.remove('is-hover'); });
  drawer.addEventListener('touchstart', (e)=>{ const a=e.target.closest('a'); if(a) a.classList.add('is-hover'); }, {passive:true});
  ['touchend','touchcancel'].forEach(ev=>{
    drawer.addEventListener(ev, (e)=>{ const a=e.target.closest('a'); if(a) a.classList.remove('is-hover'); }, {passive:true});
  });

  ['resize','scroll'].forEach(ev =>
    window.addEventListener(ev, ()=>{ if (drawer.classList.contains('open')) positionDrawer(); })
  );

  document.addEventListener('click', (e)=>{
    if (!drawer.classList.contains('open')) return;
    const inside = e.target.closest('.pidi-drawer');
    const onBtn  = e.target.closest('.pidi-menu');
    if (!inside && !onBtn) closeMenu();
  });
})();

// --- PIDI: přesměrování v rámci single-page (klik na běžné odkazy) ---
document.addEventListener('click', (e)=>{
  const a = e.target.closest('a[href]');
  if (!a) return;

  // Mapuj na ID sekce
  const href = a.getAttribute('href') || '';
  let id = null;
  if (href.includes('/galerie/'))                id = 'galerie';
  else if (href.includes('/nase-pidichaloupky/')) id = 'nase';
  else if (href.includes('/spokojeni-pidilidi/')) id = 'spokojeni';
  else if (href.includes('/ozvete-se-nam/'))      id = 'ozvete';     // ← přidáno
  else if (href.includes('/domu/'))               id = 'domu';

  // Použij pouze na indexu (kde existuje sections-root) + jen pokud je dostupné PIDI API
  const onIndex = !!document.getElementById('sections-root');
  if (!id || !onIndex || !window.PIDI?.loadAndScroll) return;

  e.preventDefault();
  // zavři menu (pokud je otevřené)
  document.querySelector('.pidi-menu')?.click();
  // načti a posuň
  window.PIDI.loadAndScroll(id);
});

















