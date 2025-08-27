(function(){
  // ---- Data hodnocení ------------------------------------------------------
  const REVIEWS = [
    {
      text: `Domeček jsme umístili na polici v obýváku a působí jako malý svět plný kouzel. Každý večer se těšíme, až ho rozsvítíme, a ta atmosféra nám přináší klid a radost po celém dni. Byli jsme překvapeni i ukrytou mincí, kterou jsme našli. Takové maličkosti dělají tenhle kousek výjimečným.`,
      name: 'Lucie S.',
      meta: 'únor 2025 – Praha',
      coins: 5
    },
    {
      text: `Děti si domeček postavily na noční stolek a pokaždé, když ho rozsvítí, mají pocit, že u nich opravdu bydlí malí Pidilidi. Objevili i malou zlatou minci uvnitř a měli z ní obrovskou radost. Teď si vymýšlejí příběhy, co tam jejich Pidilidi dělají.`,
      name: 'Martin K.',
      meta: 'leden 2025 – Kytlice burza',
      coins: 5
    },
    {
      text: `Můj domeček stojí v pracovně a pokaždé, když se cítím unavená, stačí se na něj podívat a hned se mi vybaví klid a teplo domova. Rozsvícené okénko navozuje pocit, že tam někdo opravdu bydlí. Je to kouzelné a hrozně osobní.`,
      name: 'Petra L.',
      meta: 'prosinec 2024 – sousedka',
      coins: 5
    },
    {
      text: `Dali jsme domeček na poličku v kuchyni a působí jako malý rituál – když se setmí, rozsvítíme ho a máme pocit, že jsme v pohádce. Našli jsme i schovaný malý klíček a bavíme se tím, co asi otevírá. Je to skvělé, jak takový detail dokáže udělat radost celé rodině.`,
      name: 'Andrea V.',
      meta: 'únor 2025 – kamarádka',
      coins: 5
    }
  ];

  // ---- DOM odkazy ----------------------------------------------------------
  const viewport = document.querySelector('.reviews-viewport');
  const track    = document.getElementById('reviewsTrack');
  const wrap     = document.querySelector('.reviews');
  if (!viewport || !track || !wrap) return;

  const btnPrev  = wrap.querySelector('.reviews-btn.prev');
  const btnNext  = wrap.querySelector('.reviews-btn.next');

  const autoplayMs = Math.max(1200, Number(wrap.dataset.autoplayMs || 6000));

  // ---- Stav & konfigurace --------------------------------------------------
  let perView    = getPerView();
  let clonesEach = perView + 1;
  let logical    = REVIEWS.map((_, i) => i); // 0..n-1
  let physical   = [];
  let index      = clonesEach; // budeme stát na 1. reálné kartě
  let stepPx     = 0;
  let gapPx      = 0;

  let autoTimer  = null;
  let isHover    = false;
  let isPaused   = false;
  let isIntersect= true;

  // ---- Build ---------------------------------------------------------------
  rebuild();

  // UX – hover/focus pauzuje
  viewport.addEventListener('mouseenter', ()=>{ isHover = true;  refreshAutoplay(); });
  viewport.addEventListener('mouseleave', ()=>{ isHover = false; refreshAutoplay(); });
  viewport.addEventListener('focusin',  ()=>{ isPaused = true;  refreshAutoplay(); });
  viewport.addEventListener('focusout', ()=>{ isPaused = false; refreshAutoplay(); });

  // Intersection pause
  const io = new IntersectionObserver((entries)=>{
    isIntersect = entries[0]?.isIntersecting ?? true;
    refreshAutoplay();
  }, {threshold:.2});
  io.observe(viewport);

  // Navigace
  btnNext?.addEventListener('click', ()=> go(+1));
  btnPrev?.addEventListener('click', ()=> go(-1));

  // Klávesy
  viewport.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight') { e.preventDefault(); go(+1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  });

  // Swipe (bez blokace vertikálního scrollu)
  let startX=0, startY=0, moved=false;
  viewport.addEventListener('pointerdown', (e)=>{ startX=e.clientX; startY=e.clientY; moved=false; stopAutoplay(); });
  viewport.addEventListener('pointermove', (e)=>{
    if (Math.abs(e.clientX-startX)>8 || Math.abs(e.clientY-startY)>8) moved = true;
  });
  viewport.addEventListener('pointerup', (e)=>{
    if (!moved) { refreshAutoplay(); return; }
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) go(dx<0 ? +1 : -1);
    refreshAutoplay();
  });
  viewport.addEventListener('pointercancel', ()=> refreshAutoplay());

  // Resize
  let rAf = 0;
  window.addEventListener('resize', ()=>{
    cancelAnimationFrame(rAf);
    rAf = requestAnimationFrame(()=> rebuild(true));
  });

  // ---- Funkce --------------------------------------------------------------
  function rebuild(keepNearest=false){
    const realBefore = toLogical(index);

    perView    = getPerView();
    clonesEach = perView + 1;

    physical = [
      ...logical.slice(-clonesEach),
      ...logical,
      ...logical.slice(0, clonesEach)
    ];

    render();

    // spočítat krok = šířka položky + mezera
    gapPx  = parseFloat(getComputedStyle(track).gap || '0') || 0;
    stepPx = track.querySelector('.review-item')?.getBoundingClientRect().width + gapPx || 0;

    index = clonesEach + (keepNearest ? nearestIndexForLogical(realBefore) : 0);
    jumpTo(index);
    refreshAutoplay();
  }

  function render(){
    track.innerHTML = '';
    physical.forEach((n)=>{
      const r = REVIEWS[n];
      const li = document.createElement('li');
      li.className = 'review-item';
      li.dataset.logical = String(n);

      const card = document.createElement('article');
      card.className = 'review-card';

      // text
      const text = document.createElement('div');
      text.className = 'review-text';
      text.innerHTML = `<p>${escapeHtml(r.text)}</p>`;

      // footer
      const foot = document.createElement('div');
      foot.className = 'review-footer';

      const meta = document.createElement('div');
      meta.className = 'review-meta';
      meta.innerHTML = `
        <div class="review-name">${escapeHtml(r.name)}</div>
        <div class="review-place">${escapeHtml(r.meta)}</div>
      `;

      const rating = document.createElement('div');
      rating.className = 'review-rating';
      rating.setAttribute('aria-label', `${r.coins} zlatých mincí`);
      for (let i=0;i<r.coins;i++){
        const c = document.createElement('span');
        c.className = 'coin';
        c.setAttribute('aria-hidden','true');
        rating.appendChild(c);
      }

      foot.appendChild(meta);
      foot.appendChild(rating);
      card.appendChild(text);
      card.appendChild(foot);
      li.appendChild(card);
      track.appendChild(li);
    });
  }

  function getPerView(){
    const w = window.innerWidth;
    if (w <= 768)  return 1;
    if (w <= 1280) return 2;
    return 3;
  }

  function go(dir){
    const target = index + (dir>0 ? 1 : -1);
    smoothTo(target, ()=>{
      if (target >= physical.length - clonesEach) {
        index = clonesEach;
        jumpTo(index);
      } else if (target < clonesEach) {
        index = physical.length - clonesEach - 1;
        jumpTo(index);
      }
    });
  }

  function smoothTo(targetIndex, after){
    index = targetIndex;
    viewport.scrollTo({ left: index * stepPx, behavior: 'smooth' });
    clearTimeout(scrollEdgeTmr);
    scrollEdgeTmr = setTimeout(after, 420);
  }
  let scrollEdgeTmr = 0;

  function jumpTo(targetIndex){
    viewport.scrollTo({ left: targetIndex * stepPx, behavior: 'auto' });
  }

  function stopAutoplay(){
    if (autoTimer){ clearInterval(autoTimer); autoTimer = null; }
  }
  function refreshAutoplay(){
    stopAutoplay();
    if (isHover || isPaused || !isIntersect) return;
    autoTimer = setInterval(()=> go(+1), autoplayMs);
  }

  // Helpers
  function toLogical(physicalIndex){
    const realIdx = (physicalIndex - clonesEach);
    const n = ((realIdx % logical.length) + logical.length) % logical.length;
    return logical[n];
  }
  function nearestIndexForLogical(logicalN){
    const base = clonesEach;
    const off  = logical.indexOf(logicalN);
    return base + (off >= 0 ? off : 0);
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (m)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
})();

