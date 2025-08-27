// Desktop: obálka -> Spread A (1|2) -> Spread B (3|konec).
// Mobil: obálka -> 1 -> 2 -> 3 -> konec.
// Folia: jen 1–3; konec bez folia. Stavový štítek: desktop skrytý, mobil „1/4 … 4/4“.
// „Přečíst znovu“ vrací na obálku. Šipka vpřed skrytá na posledním spreadu/stavu.

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
  const paperRight  = rightHost.closest('.page__paper');

  const btnPrev     = qs('.book__nav--prev', book);
  const btnNext     = qs('.book__nav--next', book);
  const label       = byId('bookLabel');

  // Šablony
  const tpl = {
    cover : byId('tpl-cover'),
    end   : byId('tpl-end'),
    p1    : byId('tpl-page-1'),
    p2    : byId('tpl-page-2'),
    p3    : byId('tpl-page-3'),
  };

  // Stav + responsivita
  const mqDesktop = window.matchMedia('(min-width: 769px)');
  let isDesktop = mqDesktop.matches;

  // Desktop: 0=obálka, 1=spread A (1|2), 2=spread B (3|konec)
  let spreadIndex = 0;

  // Mobil: 0=obálka, 1=1, 2=2, 3=3, 4=konec
  let pageIndex = 0;

  mqDesktop.addEventListener?.('change', ()=>{ isDesktop = mqDesktop.matches; render(true); });

  // Pomůcky
  function setFolio(el, n){
    if (!el) return;
    el.textContent = (typeof n === 'number')
      ? `Pohádka o Pidichaloupkách — strana ${n}`
      : '';
  }
  function clear(el){ el.innerHTML = ''; }
  function useTemplate(t){ return document.importNode(t.content, true); }

  function swapInto(paper, host, frag, toLeft, initial){
    const dur = parseInt(getComputedStyle(paper).getPropertyValue('--anim-ms')) || 0;
    const outCls = toLeft ? 'swap-out-left' : 'swap-out-right';
    if (initial || dur === 0){
      clear(host); host.appendChild(frag);
      afterSwap(host);
      return;
    }
    paper.classList.remove('swap-in','active','swap-out-left','swap-out-right');
    paper.classList.add(outCls);
    setTimeout(()=>{
      clear(host); host.appendChild(frag);
      paper.classList.remove('swap-out-left','swap-out-right');
      paper.classList.add('swap-in');
      requestAnimationFrame(()=> paper.classList.add('active'));
      setTimeout(()=>{
        paper.classList.remove('swap-in','active');
        afterSwap(host);
      }, dur + 30);
    }, dur);
  }

  function afterSwap(scope){
    // CTA
    const startBtn   = scope.querySelector('[data-start]');
    const restartBtn = scope.querySelector('[data-restart]');
    if (startBtn)   startBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); goNext(); });
    if (restartBtn) restartBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); goRestart(); });
  }

  function render(initial=false){
    // Reset režimových tříd
    book.classList.remove('is-cover','is-last','is-end');

    if (isDesktop){
      // === DESKTOP – SPREADS ===
      const s = spreadIndex;

      if (s === 0){
        // Obálka uprostřed (jen levá strana přes celé)
        book.classList.add('is-cover');
        swapInto(paperLeft, leftHost,  useTemplate(tpl.cover), true, initial);
        clear(rightHost); setFolio(leftFolio, null); setFolio(rightFolio, null);
        label.textContent = ''; // žádný status na obálce
        btnPrev.disabled = true;
        btnNext.disabled = false;
        return;
      }

      // Spread A (1|2) nebo Spread B (3|konec)
      const leftDef  = (s === 1) ? tpl.p1 : tpl.p3;
      const rightDef = (s === 1) ? tpl.p2 : tpl.end;

      swapInto(paperLeft,  leftHost,  useTemplate(leftDef),  true,  initial);
      swapInto(paperRight, rightHost, useTemplate(rightDef), false, initial);

      // Folia: 1|2, 3|— (konec bez folia)
      if (s === 1){ setFolio(leftFolio, 1); setFolio(rightFolio, 2); }
      else         { setFolio(leftFolio, 3); setFolio(rightFolio, null); }

      // DESKTOP: status/štítek NEZOBRAZUJEME
      label.textContent = '';

      // Šipky: poslední spread skryje „vpřed“
      const last = (s === 2);
      book.classList.toggle('is-last', last);
      btnPrev.disabled = false;
      btnNext.disabled = last;
      return;
    }

    // === MOBIL – JEDNA STRANA ===
    const i = pageIndex;

    if (i === 0){
      book.classList.add('is-cover');
      swapInto(paperLeft, leftHost, useTemplate(tpl.cover), true, initial);
      setFolio(leftFolio, null);
      label.textContent = '';
      btnPrev.disabled = true;
      btnNext.disabled = false;
      return;
    }

    // 1,2,3,4(konec)
    let def, folio;
    if (i === 1){ def = tpl.p1; folio = 1; }
    else if (i === 2){ def = tpl.p2; folio = 2; }
    else if (i === 3){ def = tpl.p3; folio = 3; }
    else { def = tpl.end; folio = null; }

    swapInto(paperLeft, leftHost, useTemplate(def), true, initial);
    setFolio(leftFolio, folio);

    // Status: jen na obsahových 1–4 (obálka bez)
    label.textContent = `Strana ${Math.min(i,4)} / 4`;

    // Šipky
    btnPrev.disabled = (i === 0);
    btnNext.disabled = (i === 4);
  }

  // Navigace
  function goPrev(){
    if (isDesktop){ if (spreadIndex > 0) spreadIndex--; }
    else { if (pageIndex > 0) pageIndex--; }
    render();
  }
  function goNext(){
    if (isDesktop){ if (spreadIndex < 2) spreadIndex++; }
    else { if (pageIndex < 4) pageIndex++; }
    render();
  }
  function goRestart(){
    if (isDesktop){ spreadIndex = 0; }
    else { pageIndex = 0; }
    render();
  }

  btnPrev.addEventListener('click', (e)=>{ e.stopPropagation(); goPrev(); });
  btnNext.addEventListener('click', (e)=>{ e.stopPropagation(); goNext(); });

  // Klik na okraje (celé plátno)
  book.addEventListener('click', (e)=>{
    if (e.target.closest('button, a, input, textarea, select, [data-start], [data-restart]')) return;
    const r = book.getBoundingClientRect();
    const x = e.clientX - r.left;
    const leftZone  = r.width * 0.22;
    const rightZone = r.width * 0.78;
    if (x <= leftZone) goPrev();
    else if (x >= rightZone) goNext();
  });

  // Šipky na klávesnici
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft')  goPrev();
    if (e.key === 'ArrowRight') goNext();
  }, { passive:true });

  // Swipe (mobil)
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

  // Init
  render(true);
})();












