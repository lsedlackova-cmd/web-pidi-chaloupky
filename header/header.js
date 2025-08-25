// Desktop: submenu pozice + otevírání/zavírání (beze změny navigace)
(async function () {
  const mount = document.getElementById('header-root');
  if (!mount) return;

  const res = await fetch('/header/header.html', { cache: 'no-cache' });
  mount.innerHTML = await res.text();

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

  // klik na odkaz: jen zavři menu, navigaci nech defaultně proběhnout
  drawer.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=> closeMenu());
    a.addEventListener('pointerenter', ()=> a.classList.add('is-hover'));
    a.addEventListener('pointerleave', ()=> a.classList.remove('is-hover'));
    a.addEventListener('touchstart', ()=> a.classList.add('is-hover'), {passive:true});
    ['touchend','touchcancel'].forEach(ev =>
      a.addEventListener(ev, ()=> a.classList.remove('is-hover'), {passive:true})
    );
  });

  ['resize','scroll'].forEach(ev =>
    window.addEventListener(ev, ()=>{ if (drawer.classList.contains('open')) positionDrawer(); })
  );
})();












