(function(){
  const qs  = (s, r=document)=> r.querySelector(s);
  const byId= (id)=> document.getElementById(id);

  const book        = qs('.book');
  if (!book) return;

  const leftHost    = byId('leftContent');
  const rightHost   = byId('rightContent');
  const leftFolio   = byId('leftFolio');
  const rightFolio  = byId('rightFolio');

  const paperLeft   = leftHost.closest('.page__paper');
  const paperRight  = rightHost?.closest('.page__paper');
  const pageRightEl = paperRight?.closest('.page');
  const spineEl     = qs('.book__spine', book);

  const btnPrev     = qs('.book__nav--prev', book);
  const btnNext     = qs('.book__nav--next', book);
  const label       = byId('bookLabel');

  // Obrázkové stránky
  const imgsDesktop = [
    '/img/nase-pidichaloupky-desktop-1.png',
    '/img/nase-pidichaloupky-desktop-2.png',
    '/img/nase-pidichaloupky-desktop-3.png',
    '/img/nase-pidichaloupky-desktop-4.png',
    '/img/nase-pidichaloupky-desktop-5.png',
    '/img/nase-pidichaloupky-desktop-6.png',
    '/img/nase-pidichaloupky-desktop-7.png',
  ];
  const imgsMobile = [
    '/img/nase-pidichaloupky-mobil-1.png',
    '/img/nase-pidichaloupky-mobil-2.png',
    '/img/nase-pidichaloupky-mobil-3.png',
    '/img/nase-pidichaloupky-mobil-4.png',
    '/img/nase-pidichaloupky-mobil-5.png',
    '/img/nase-pidichaloupky-mobil-6.png',
    '/img/nase-pidichaloupky-mobil-7.png',
  ];

  // Přednačtení
  [...imgsDesktop, ...imgsMobile].forEach(src => { const i=new Image(); i.src = src; });

  // Media query
  const mqDesktop = window.matchMedia('(min-width: 769px)');
  let isDesktop = mqDesktop.matches;

  // Index aktuální stránky
  let idx = 0;

  function enterSingleColumn(){
    if (pageRightEl) pageRightEl.style.display = 'none';
    if (spineEl)     spineEl.style.display     = 'none';
    book.style.gridTemplateColumns = '1fr';
  }

  function setFolio(el, n){ if (el) el.textContent = (typeof n==='number') ? `Pohádka o Pidichaloupkách — strana ${n}` : ''; }
  function clear(el){ el.innerHTML = ''; }
  function htmlFrag(str){ const t=document.createElement('template'); t.innerHTML=str.trim(); return t.content; }

  // Animovaný swap
  function swapInto(paper, host, frag, initial){
    const dur = 280;
    if (initial){
      clear(host); host.appendChild(frag);
      afterSwap(host);
      return;
    }
    paper.classList.remove('swap-in','active','swap-out-left','swap-out-right');
    paper.classList.add('swap-out-right');
    setTimeout(()=>{
      clear(host); host.appendChild(frag);
      paper.classList.remove('swap-out-right');
      paper.classList.add('swap-in');
      requestAnimationFrame(()=> paper.classList.add('active'));
      setTimeout(()=>{
        paper.classList.remove('swap-in','active');
        afterSwap(host);
      }, dur + 30);
    }, dur);
  }

  // Po dosazení navěsíme akce CTA
  function afterSwap(scope){
    const startBtn   = scope.querySelector('[data-start]');
    const restartBtn = scope.querySelector('[data-restart]');
    if (startBtn)   startBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); goNext(); });
    if (restartBtn) restartBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); goRestart(); });
  }

  // Vytvoř stránku s obrázkem a volitelným CTA
  function pageImage(src, withStart=false, withRestart=false){
    // CTA zarovnání (desktop řeší CSS třídami; na mobil doladíme později)
    const startBtn = withStart ? `
      <button class="cover__cta cta--center-bottom" data-start>Vstupte</button>
    ` : ``;

    const restartBtn = withRestart ? `
      <button class="cover__cta cta--center-center" data-restart>Přečíst znovu</button>
    ` : ``;

    return htmlFrag(`
      <figure class="photo" style="position:relative;">
        <img src="${src}" alt="" loading="lazy" decoding="async" />
        ${startBtn}
        ${restartBtn}
      </figure>
    `);
  }

  function currentImgs(){ return isDesktop ? imgsDesktop : imgsMobile; }

  // Render stránky
  function render(initial=false){
    enterSingleColumn();

    const imgs = currentImgs();
    if (idx < 0) idx = 0;
    if (idx > imgs.length - 1) idx = imgs.length - 1;

    setFolio(leftFolio,  null);
    setFolio(rightFolio, null);
    if (label) label.textContent = '';

    const isFirst = (idx === 0);
    const isLast  = (idx === imgs.length - 1);

    const frag = pageImage(imgs[idx], isFirst, isLast);
    swapInto(paperLeft, leftHost, frag, initial);

    btnPrev.disabled = isFirst;
    btnNext.disabled = isLast;
  }

  // Ovládání
  function goPrev(){ if (idx > 0){ idx--; render(); } }
  function goNext(){ if (idx < currentImgs().length - 1){ idx++; render(); } }
  function goRestart(){ idx = 0; render(); }

  qs('.book__nav--prev', book).addEventListener('click', (e)=>{ e.stopPropagation(); goPrev(); });
  qs('.book__nav--next', book).addEventListener('click', (e)=>{ e.stopPropagation(); goNext(); });

  // Klik-zóny
  book.addEventListener('click', (e)=>{
    if (e.target.closest('button, a, input, textarea, select, [data-start], [data-restart]')) return;
    const r = book.getBoundingClientRect();
    const x = e.clientX - r.left;
    const leftZone  = r.width * 0.22;
    const rightZone = r.width * 0.78;
    if (x <= leftZone) goPrev();
    else if (x >= rightZone) goNext();
  });

  // Klávesy
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft')  goPrev();
    if (e.key === 'ArrowRight') goNext();
  }, { passive:true });

  // Swipe
  let tX=0, tY=0, swiping=false;
  book.addEventListener('touchstart', (e)=>{
    if (!e.touches?.length) return;
    tX = e.touches[0].clientX; tY = e.touches[0].clientY; swiping = true;
  }, {passive:true});
  book.addEventListener('touchmove', (e)=>{
    if (!swiping || !e.touches?.length) return;
    const dx = e.touches[0].clientX - tX;
    const dy = e.touches[0].clientY - tY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40){
      (dx > 0) ? goPrev() : goNext();
      swiping = false;
    }
  }, {passive:true});
  book.addEventListener('touchend', ()=> swiping=false, {passive:true});

  // Reakce na změnu šířky
  const onMQ = ()=>{ isDesktop = mqDesktop.matches; render(true); };
  if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onMQ);
  else if (mqDesktop.addListener) mqDesktop.addListener(onMQ);

  // Start
  render(true);
})();




















