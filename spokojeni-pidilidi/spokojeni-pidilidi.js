(function(){
  const root      = document.documentElement;
  const section   = document.querySelector('.pidi-spokojeni');
  const viewport  = document.querySelector('.pidi-spokojeni .reviews-viewport');
  const track     = document.getElementById('reviewsTrack');
  const btnPrev   = document.querySelector('.pidi-spokojeni .reviews-btn.prev');
  const btnNext   = document.querySelector('.pidi-spokojeni .reviews-btn.next');
  if (!section || !viewport || !track) return;

  // --- Data (4 reference) ---
  const DATA = [
    {
      text: `Domeček jsme umístili na polici v obýváku a působí jako malý svět plný kouzel. Každý večer se těšíme, až ho rozsvítíme, a ta atmosféra nám přináší klid a radost po celém dni. Byli jsme překvapeni i ukrytou mincí, kterou jsme našli. Takové maličkosti dělají tenhle kousek výjimečným.`,
      author: 'Lucie S.',
      date: 'únor 2025 – Praha',
      rating: 5
    },
    {
      text: `Děti si domeček postavily na noční stolek a pokaždé, když ho rozsvítí, mají pocit, že u nich opravdu bydlí malí Pidilidi. Objevili i malou zlatou minci uvnitř a měli z ní obrovskou radost. Teď si vymýšlejí příběhy, co tam jejich Pidilidi dělají.`,
      author: 'Martin K.',
      date: 'leden 2025 – Kytlice (burza)',
      rating: 5
    },
    {
      text: `Můj domeček stojí v pracovně a pokaždé, když se cítím unavená, stačí se na něj podívat a hned se mi vybaví klid a teplo domova. Rozsvícené okénko navozuje pocit, že tam někdo opravdu bydlí. Je to kouzelné a hrozně osobní.`,
      author: 'Petra L.',
      date: 'prosinec 2024 – sousedka',
      rating: 5
    },
    {
      text: `Dali jsme domeček na poličku v kuchyni a působí jako malý rituál – když se setmí, rozsvítíme ho a máme pocit, že jsme v pohádce. Našli jsme i schovaný malý klíček a bavíme se tím, co asi otevírá. Je to skvělé, jak takový detail dokáže udělat radost celé rodině.`,
      author: 'Andrea V.',
      date: 'únor 2025 – kamarádka',
      rating: 5
    },
  ];

  const autoplayMs = Math.max(1000, Number(section.querySelector('.reviews')?.dataset.autoplayMs || 5500));

  // --- Stav karuselu ---
  let perView     = getPerView();          // čteme z CSS --rv-per (fallback: 3/1)
  let clonesEach  = perView + 1;           // kvůli plynulému cyklu
  let logical     = DATA.map((_, i) => i + 1); // [1..N]
  let physical    = [];                    // s klony
  let index       = clonesEach;            // začátek reálné části
  let stepPx      = 0;                     // šířka jedné položky + mezera
  let gapPx       = 0;
  let autoTimer   = null;
  let isHover     = false;
  let isPaused    = false;
  let isIntersect = true;

  // --- Sestavení karuselu ---
  rebuild();

  // Interakce
  btnNext?.addEventListener('click', ()=> go(+1));
  btnPrev?.addEventListener('click', ()=> go(-1));

  viewport.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight'){ e.preventDefault(); go(+1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  viewport.addEventListener('mouseenter', ()=>{ isHover = true;  refreshAutoplay(); });
  viewport.addEventListener('mouseleave', ()=>{ isHover = false; refreshAutoplay(); });
  viewport.addEventListener('focusin',  ()=>{ isPaused = true;  refreshAutoplay(); });
  viewport.addEventListener('focusout', ()=>{ isPaused = false; refreshAutoplay(); });

  const io = new IntersectionObserver((entries)=>{
    isIntersect = entries[0]?.isIntersecting ?? true;
    refreshAutoplay();
  }, { threshold: .2 });
  io.observe(viewport);

  // Swipe (dotyk)
  let sx = 0, sy = 0, moved = false;
  viewport.addEventListener('pointerdown', (e)=>{ sx = e.clientX; sy = e.clientY; moved=false; stopAutoplay(); });
  viewport.addEventListener('pointermove', (e)=>{
    if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) moved = true;
  });
  viewport.addEventListener('pointerup', (e)=>{
    if (!moved){ refreshAutoplay(); return; }
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) go(dx < 0 ? +1 : -1);
    refreshAutoplay();
  });
  viewport.addEventListener('pointercancel', ()=> refreshAutoplay());

  // Resize → přepočet, ale zachovat nejbližší reálnou pozici
  let rAF = 0;
  window.addEventListener('resize', ()=>{
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(()=> rebuild(true));
  });

  // ===== Funkce =====
  function getPerView(){
    const cs = getComputedStyle(section);
    const v  = parseFloat(cs.getPropertyValue('--rv-per'));
    if (Number.isFinite(v) && v > 0) return Math.round(v);
    // fallback, kdyby proměnná nebyla v CSS:
    return window.innerWidth <= 768 ? 1 : 3;
  }

  function rebuild(keepNearest=false){
    const prevLogical = toLogical(index); // zapamatuj, ať po přepočtu "neskočíme"
    perView    = getPerView();
    clonesEach = perView + 1;

    physical = [
      ...logical.slice(-clonesEach),
      ...logical,
      ...logical.slice(0, clonesEach)
    ];
    renderPhysical();

    // spočítat krok = šířka položky + gap
    const csTrack = getComputedStyle(track);
    gapPx  = parseFloat(csTrack.columnGap || csTrack.gap || '0') || 0;
    const firstItem = track.querySelector('.review-item');
    const itemRect  = firstItem ? firstItem.getBoundingClientRect() : null;
    stepPx = itemRect ? (itemRect.width + gapPx) : 0;

    index = clonesEach + (keepNearest ? nearestIndexForLogical(prevLogical) : 0);
    jumpTo(index);
    refreshAutoplay();
  }

  function renderPhysical(){
    track.innerHTML = '';
    physical.forEach(n=>{
      const r = DATA[n - 1];
      const li = document.createElement('li');
      li.className = 'review-item';
      li.innerHTML = `
        <article class="review-card" tabindex="-1">
          <p class="review-text">${escapeHTML(r.text)}</p>
          <div class="review-author">${escapeHTML(r.author)}</div>
          <div class="review-date">${escapeHTML(r.date)}</div>
          <div class="review-rating" aria-label="${r.rating} z 5 mincí">${coinRow(r.rating)}</div>
        </article>
      `;
      track.appendChild(li);
    });
  }

  function coinRow(n){
    let s = '';
    for (let i=0;i<n;i++) s += '<span class="coin" aria-hidden="true"></span>';
    return s;
  }

  function go(dir){
    const target = index + (dir > 0 ? 1 : -1);
    smoothTo(target, ()=>{
      if (target >= physical.length - clonesEach){
        index = clonesEach;
        jumpTo(index);
      } else if (target < clonesEach){
        index = physical.length - clonesEach - 1;
        jumpTo(index);
      }
    });
  }

  function smoothTo(targetIndex, after){
    index = targetIndex;
    viewport.scrollTo({ left: index * stepPx, behavior: 'smooth' });
    clearTimeout(_edgeTmr);
    _edgeTmr = setTimeout(after, 420);
  }
  let _edgeTmr = 0;

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

  // --- Pomocné převody indexů ---
  function toLogical(physicalIndex){
    const realIdx = (physicalIndex - clonesEach);
    const n = ((realIdx % logical.length) + logical.length) % logical.length; // 0..len-1
    return logical[n];
  }
  function nearestIndexForLogical(logicalN){
    const base = clonesEach;
    const offset = logical.indexOf(logicalN);
    return base + (offset >= 0 ? offset : 0);
  }

  // --- Bezpečné HTML ---
  function escapeHTML(str){
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
})();



