(function(){
  const IMG_COUNT = 20;
  const SRC = (i)=> `/img/galerie-${i}.jpg`; 

  const viewport = document.querySelector('.gallery-viewport');
  const track    = document.getElementById('galleryTrack');
  if (!viewport || !track) return;

  function setGalleryHeight(){
    const sec = document.querySelector('.pidi-galerie');
    if (!sec) return;
    const rs = getComputedStyle(document.documentElement);
    const headerH = parseFloat(rs.getPropertyValue('--header-h')) || 80;

    const cs = getComputedStyle(sec);
    const padTop    = parseFloat(cs.paddingTop)    || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;

    const avail = window.innerHeight - headerH - padTop - padBottom;

    const h = Math.max(320, Math.floor(avail));
    sec.style.setProperty('--gallery-h', `${h}px`);
  }
  setGalleryHeight();
  let rh = 0;
  window.addEventListener('resize', ()=>{
    cancelAnimationFrame(rh);
    rh = requestAnimationFrame(setGalleryHeight);
  });

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.innerHTML = `
    <button class="lb__close" aria-label="Zavřít (Esc)">✕</button>
    <button class="lb__nav prev" aria-label="Předchozí (←)">‹</button>
    <img class="lb__img" alt="">
    <button class="lb__nav next" aria-label="Další (→)">›</button>
  `;
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('.lb__img');

  const prevBtn = document.querySelector('.gallery-btn.prev');
  const nextBtn = document.querySelector('.gallery-btn.next');

  const autoplayMs = Math.max(1000, Number(document.querySelector('.gallery')?.dataset.autoplayMs || 5000));

  let perView     = getPerView();
  let clonesEach  = perView + 1;
  let logical     = Array.from({length: IMG_COUNT}, (_,i)=> i+1); 
  let physical    = [];
  let index       = clonesEach; 
  let stepPx      = 0;
  let gapPx       = 0;
  let autoTimer   = null;
  let isPaused    = false;
  let isHover     = false;
  let isIntersect = true; 

  rebuild();

  viewport.addEventListener('mouseenter', ()=>{ isHover = true; refreshAutoplay(); });
  viewport.addEventListener('mouseleave', ()=>{ isHover = false; refreshAutoplay(); });
  viewport.addEventListener('focusin',  ()=>{ isPaused = true;  refreshAutoplay(); });
  viewport.addEventListener('focusout', ()=>{ isPaused = false; refreshAutoplay(); });

  const io = new IntersectionObserver((entries)=>{
    isIntersect = entries[0]?.isIntersecting ?? true;
    refreshAutoplay();
  }, {threshold: .2});
  io.observe(viewport);

  nextBtn?.addEventListener('click', ()=> go(+1));
  prevBtn?.addEventListener('click', ()=> go(-1));

  viewport.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight') { e.preventDefault(); go(+1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  });

  let rAf = 0;
  window.addEventListener('resize', ()=>{
    cancelAnimationFrame(rAf);
    rAf = requestAnimationFrame(()=> rebuild(true));
  });

  let startX = 0, startY = 0, moved = false;
  viewport.addEventListener('pointerdown', (e)=>{
    startX = e.clientX;
    startY = e.clientY;
    moved = false;
    stopAutoplay();
  });
  viewport.addEventListener('pointermove', (e)=>{
    if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) moved = true;
  });
  viewport.addEventListener('pointerup', (e)=>{
    if (!moved) { refreshAutoplay(); return; }
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      go(dx < 0 ? +1 : -1);
    }
    refreshAutoplay();
  });
  viewport.addEventListener('pointercancel', ()=>{ refreshAutoplay(); });

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

    gapPx  = parseFloat(getComputedStyle(track).gap || '0') || 0;
    stepPx = track.querySelector('.gallery-item')?.getBoundingClientRect().width + gapPx || 0;

    index = clonesEach + (keepNearest ? nearestIndexForLogical(realBefore) : 0);
    jumpTo(index);
    refreshAutoplay();
  }

  function render(){
    track.innerHTML = '';
    physical.forEach((n)=>{
      const li  = document.createElement('li');
      li.className = 'gallery-item';
      li.dataset.logical = String(n);

      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = SRC(n);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = `Fotografie ${n} z galerie`;
      img.addEventListener('click', ()=> openLB(n));

      fig.appendChild(img);
      li.appendChild(fig);
      track.appendChild(li);
    });
    track.querySelectorAll('.gallery-item').forEach(li=>{
      li.addEventListener('click', (e)=>{
        if (e.target.tagName.toLowerCase() !== 'img') {
          const n = Number(li.dataset.logical);
          openLB(n);
        }
      });
    });
  }

  function getPerView(){
    const w = window.innerWidth;
    if (w >= 1440) return 4;
    if (w <= 768)  return 1;
    if (w <= 1024) return 3;
    return 3;
  }

  function go(dir){
    const target = index + (dir > 0 ? 1 : -1);
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
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  function refreshAutoplay(){
    stopAutoplay();
    if (isHover || isPaused || !isIntersect) return;
    autoTimer = setInterval(()=> go(+1), autoplayMs);
  }

  let currentLB = 1;
  function openLB(logicalIndex){
    currentLB = clampLogical(logicalIndex);
    lbImg.src = SRC(currentLB);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    stopAutoplay();
  }
  function closeLB(){
    lb.classList.remove('open');
    document.body.style.overflow = '';
    refreshAutoplay();
  }
  function prevLB(){ openLB(currentLB - 1); }
  function nextLB(){ openLB(currentLB + 1); }

  lb.querySelector('.lb__close').addEventListener('click', closeLB);
  lb.querySelector('.lb__nav.prev').addEventListener('click', prevLB);
  lb.querySelector('.lb__nav.next').addEventListener('click', nextLB);
  lb.addEventListener('click', (e)=>{ if (e.target === lb) closeLB(); });
  window.addEventListener('keydown', (e)=>{
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLB();
    if (e.key === 'ArrowLeft')  prevLB();
    if (e.key === 'ArrowRight') nextLB();
  });

  function toLogical(physicalIndex){
    const realIdx = (physicalIndex - clonesEach);
    const n = ((realIdx % logical.length) + logical.length) % logical.length; 
    return logical[n];
  }
  function nearestIndexForLogical(logicalN){
    const base = clonesEach; 
    const offset = logical.indexOf(logicalN);
    return base + (offset >= 0 ? offset : 0);
  }
  function clampLogical(n){
    if (n < 1) return IMG_COUNT;
    if (n > IMG_COUNT) return 1;
    return n;
  }
})();


