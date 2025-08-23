// Desktop: submenu otevřít dolů+doprava a PRECIZNĚ dorovnat,
// aby levá hrana rámečku = levá hrana dvou čárek (toggle).
// Mobil (<=480px): left = vnitřní hrana (padding/čára).
(async function () {
  const mount = document.getElementById('header-root');
  if (!mount) return;

  const res = await fetch('header/header.html', { cache: 'no-cache' });
  mount.innerHTML = await res.text();

  const header = mount.querySelector('.pidi-header');
  const inner  = mount.querySelector('.pidi-header__inner');
  const btn    = mount.querySelector('.pidi-menu');
  const bars   = mount.querySelector('.pidi-menu__bars');
  const drawer = mount.querySelector('.pidi-drawer');
  if (!header || !inner || !btn || !bars || !drawer) return;

  const mqMobile = window.matchMedia('(max-width: 480px)');

  const px = (v) => {
    const n = parseFloat(v || '0');
    return Number.isFinite(n) ? n : 0;
  };
  const padLeft = (el) => px(getComputedStyle(el).paddingLeft);

  function positionDrawer() {
    const wasOpen = drawer.classList.contains('open');
    if (!wasOpen) { drawer.style.visibility='hidden'; drawer.classList.add('open'); }

    const rHeader = header.getBoundingClientRect();
    const rInner  = inner.getBoundingClientRect();
    const rBars   = bars.getBoundingClientRect();

    // TOP: přesně pod spodní čárou headeru
    const top = Math.round(rHeader.bottom - rInner.top);
    drawer.style.top = `${top}px`;

    if (mqMobile.matches) {
      // Mobil: zarovnání na vnitřní hranu (čára/padding)
      drawer.style.left = `${Math.round(padLeft(inner))}px`;
    } else {
      // Desktop krok 1: hrubé umístění levé hrany submenu na levou hranu čárek
      let left = Math.round(rBars.left - rInner.left);
      drawer.style.left = `${left}px`;

      // Desktop krok 2: přesné DO-ROVNÁNÍ po vykreslení (řeší border/padding/zaokrouhlení)
      // vynutíme reflow
      void drawer.offsetWidth;
      const rDrawer = drawer.getBoundingClientRect();
      const delta = Math.round(rDrawer.left - rBars.left); // kolik to ujelo
      if (delta !== 0) {
        left = left - delta; // posuneme zpět o přesnou odchylku
        drawer.style.left = `${left}px`;
      }
    }

    if (!wasOpen) { drawer.classList.remove('open'); drawer.style.visibility=''; }
  }

  function toggleMenu() { positionDrawer(); drawer.classList.toggle('open'); }
  function closeMenu()  { drawer.classList.remove('open'); }

  btn.addEventListener('click', toggleMenu);

  document.addEventListener('click', (e)=>{
    if (!drawer.classList.contains('open')) return;
    if (!drawer.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });

  // Repozice při změně okna/scrollu – jen když je otevřeno
  ['resize','scroll'].forEach(ev =>
    window.addEventListener(ev, ()=>{ if (drawer.classList.contains('open')) positionDrawer(); })
  );

  // Jednotné zvýraznění položek (funguje i na mobilech)
  drawer.querySelectorAll('a').forEach(a=>{
    a.addEventListener('pointerenter', ()=> a.classList.add('is-hover'));
    a.addEventListener('pointerleave', ()=> a.classList.remove('is-hover'));
    a.addEventListener('touchstart', ()=> a.classList.add('is-hover'), {passive:true});
    ['touchend','touchcancel'].forEach(ev =>
      a.addEventListener(ev, ()=> a.classList.remove('is-hover'), {passive:true})
    );
    a.addEventListener('click', ()=> closeMenu());
  });

  mqMobile.addEventListener?.('change', ()=>{
    if (drawer.classList.contains('open')) positionDrawer();
  });
})();









