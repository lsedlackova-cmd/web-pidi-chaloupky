// Naše PidiChaloupky – Kniha s obálkou
// OPRAVY: zpětné listování, plné fotostrany, automatické stránkování textu,
// foliování stránek („Pohádka o Pidichaloupkách — strana X“), stálá výška bez svislého scrollu.
(function(){
  const qs  = (sel, root=document)=> root.querySelector(sel);
  const qsa = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
  const byId = id => document.getElementById(id);

  const root   = qs('.pidi-section');
  if (!root) return;

  const book   = qs('.book', root);
  const btnPrev= qs('.book__nav--prev', root);
  const btnNext= qs('.book__nav--next', root);

  const textPaper   = qs('.page--text .page__paper', root);
  const photosPaper = qs('.page--photos .page__paper', root);
  const textEl      = byId('textPage');
  const photosEl    = byId('photosPage');
  const textFolio   = byId('textFolio');
  const photosFolio = byId('photosFolio');
  const lbl         = byId('bookLabel');

  // Šablony
  const tpl = {
    cover : byId('tpl-cover'),
    t1    : byId('tpl-text-1'),
    t2    : byId('tpl-text-2'),
    t3    : byId('tpl-text-3'),
    photos: byId('tpl-photos-all'),
  };

  // --- Sestavíme master seznam odstavců (p) z více šablon ---
  function collectParagraphs(){
    const frags = [tpl.t1, tpl.t2, tpl.t3].filter(Boolean).map(t => t.content.cloneNode(true));
    const dummy = document.createElement('div');
    frags.forEach(f => dummy.appendChild(f));
    return qsa('p', dummy).map(p => p.cloneNode(true));
  }

  // --- Automatické stránkování textu do víc stran tak, aby se VEŠEL do stálé výšky ---
  function paginateText(paragraphs){
    const pages = [];
    // připrav měřící prostředí – vypneme obálku, aby měl text reálné rozměry
    const wasCover = book.classList.contains('is-cover');
    book.classList.remove('is-cover');

    // Reset
    textEl.innerHTML = '';

    let current = document.createDocumentFragment();

    // Pomocné: vlož a otestuj, zda přeteklo
    const fitsAfterAppend = (node) => {
      textEl.appendChild(node);
      const overflow = textEl.scrollHeight > textEl.clientHeight;
      textEl.removeChild(node);
      return !overflow;
    };

    for (const p of paragraphs){
      if (fitsAfterAppend(p.cloneNode(true))){
        current.appendChild(p.cloneNode(true));
        // commit do DOM a pokračuj (aby měření dalších p bylo korektní)
        textEl.appendChild(p.cloneNode(true));
      } else {
        // uzavři stránku (aktuální fragment nesmí být prázdný)
        if (current.childNodes.length){
          pages.push(current);
          // reset DOM pro další měření
          textEl.innerHTML = '';
          // nový fragment začíná tímto odstavcem (ten NEMÁ přetéct)
          current = document.createDocumentFragment();
          if (fitsAfterAppend(p.cloneNode(true))){
            current.appendChild(p.cloneNode(true));
            textEl.appendChild(p.cloneNode(true));
          } else {
            // extrémně dlouhý odstavec – fallback: přesto ho dáme na samostatnou stránku
            current.appendChild(p.cloneNode(true));
            textEl.innerHTML = '';
            textEl.appendChild(p.cloneNode(true));
            pages.push(current);
            current = document.createDocumentFragment();
            textEl.innerHTML = '';
          }
        } else {
          // kdyby první odstavec sám o sobě přetékal (velmi nepravděpodobné)
          const one = document.createDocumentFragment();
          one.appendChild(p.cloneNode(true));
          pages.push(one);
          textEl.innerHTML = '';
        }
      }
    }

    // poslední fragment?
    if (current.childNodes.length){
      pages.push(current);
    }

    // vyčisti DOM po měření
    textEl.innerHTML = '';
    if (wasCover) book.classList.add('is-cover');
    return pages;
  }

  // --- Vytvoř obsah fotostrany (vždy 4 fotky, aby byla stránka plná) ---
  function buildPhotosFragment(){
    const frag = document.importNode(tpl.photos.content, true);
    return frag;
  }

  // --- Poskládáme stránkovou sekvenci ---
  let textPages = [];           // Array<Fragment>
  let mobilePages = [];         // [{kind:'cover'|'text'|'photos', idx:number}]
  let totalMobile = 0;
  let totalSpreads = 0;         // desktop: cover + N spreadů (text|photos)

  function buildPagination(){
    const paragraphs = collectParagraphs();
    textPages = paginateText(paragraphs); // může být 2–5+ stránek podle výšky

    // Mobile: COVER, pak [text, photos] * N
    mobilePages = [{ kind:'cover', idx: -1 }];
    for (let i=0;i<textPages.length;i++){
      mobilePages.push({ kind:'text',   idx:i });
      mobilePages.push({ kind:'photos', idx:i }); // fotky stejné na každé fotostránce (plné 4)
    }
    totalMobile = mobilePages.length;

    // Desktop: COVER + N spreadů (každý spread = text(i) | photos(i))
    totalSpreads = 1 + textPages.length;
  }

  // --- Stav a responsivita ---
  const mqMobile = window.matchMedia('(max-width: 768px)');
  let isMobile = mqMobile.matches;

  mqMobile.addEventListener?.('change', ()=>{
    isMobile = mqMobile.matches;
    // přepočítej stránkování kvůli jiným metrikám řádkování/šířky
    buildPagination();
    clampIndex();
    render(true);
  });

  let pageIndex = 0; // mobilní index (cover=0); na desktopu se mapuje na spread
  function clampIndex(){
    if (isMobile){
      pageIndex = Math.max(0, Math.min(totalMobile - 1, pageIndex));
    } else {
      // desktop: držet na začátku spreadu (sudé číslo po coveru)
      const maxStart = (totalSpreads - 1) * 2; // 0,2,4...
      pageIndex = Math.min(pageIndex, maxStart);
      pageIndex = Math.floor(pageIndex / 2) * 2;
    }
  }

  // --- Render stránek + foliování ---
  function setFolio(el, n){
    if (!el) return;
    if (n == null) { el.textContent = ''; return; }
    el.textContent = `Pohádka o Pidichaloupkách — strana ${n}`;
  }

  function renderText(idx, initial){
    const frag = textPages[idx];
    if (!frag) { textEl.innerHTML = ''; setFolio(textFolio, null); return; }

    animateSwap(textEl, frag, true, initial);
  }
  function renderPhotos(initial){
    const frag = buildPhotosFragment();
    animateSwap(photosEl, frag, false, initial);

    // lazy fade-in
    qsa('img', photosEl).forEach(img=>{
      const ready = ()=> img.classList.add('is-ready');
      if (img.complete) requestAnimationFrame(ready);
      else if (img.decode) img.decode().then(ready).catch(()=>ready());
      else img.addEventListener('load', ready, { once:true });
    });
  }

  function showTextPaper(show){
    textPaper.style.display = show ? '' : 'none';
  }
  function showPhotosPaper(show){
    photosPaper.style.display = show ? '' : 'none';
  }

  function render(initial=false){
    clampIndex();

    // vždy odemkni papíry (ať nezůstanou skryté z minula)
    showTextPaper(true);
    showPhotosPaper(true);

    if (!isMobile){
      // desktop: spready
      const spread = Math.floor(pageIndex / 2);
      if (spread === 0){
        // obálka
        book.classList.add('is-cover');
        renderCover(initial);
        // pravá prázdná (drží layout), ale bez obsahu
        photosEl.innerHTML = '';
        setFolio(photosFolio, null);
        btnPrev.disabled = true;
        btnNext.disabled = (totalSpreads <= 1);
        lbl.textContent  = `Obálka • 1 / ${totalSpreads}`;
        return;
      }
      book.classList.remove('is-cover');

      const textIdx = spread - 1; // 0..textPages.length-1
      renderText(textIdx, initial);
      renderPhotos(initial);

      // foliování (číslování stran: 1. textová = 1, 1. foto = 2, atd.)
      const leftNo  = 2*spread - 1;
      const rightNo = 2*spread;
      setFolio(textFolio,   leftNo);
      setFolio(photosFolio, rightNo);

      btnPrev.disabled = (spread <= 0);
      btnNext.disabled = (spread >= totalSpreads - 1);
      lbl.textContent  = `Dvoustrana ${spread+1} / ${totalSpreads}`;
      return;
    }

    // === mobil: po jedné stránce ===
    const def = mobilePages[pageIndex];
    book.classList.toggle('is-cover', def.kind === 'cover');

    if (def.kind === 'cover'){
      renderCover(initial);
      showPhotosPaper(false);
      setFolio(textFolio, null);
      lbl.textContent = `Obálka • 1 / ${totalMobile}`;
    } else if (def.kind === 'text'){
      showPhotosPaper(false);
      renderText(def.idx, initial);
      // mobilní číslování: cover (0) nepočítáme => strana = pageIndex
      setFolio(textFolio, pageIndex);
      lbl.textContent = `Stránka ${pageIndex+1} / ${totalMobile}`;
    } else {
      showTextPaper(false);
      renderPhotos(initial);
      setFolio(photosFolio, pageIndex);
      lbl.textContent = `Stránka ${pageIndex+1} / ${totalMobile}`;
    }

    btnPrev.disabled = (pageIndex === 0);
    btnNext.disabled = (pageIndex >= (isMobile ? totalMobile - 1 : (totalSpreads - 1)*2));
  }

  function renderCover(initial){
    const frag = document.importNode(tpl.cover.content, true);
    animateSwap(textEl, frag, true, initial);
  }

  function animateSwap(container, fragment, toLeft, initial){
    const paper = container.closest('.page__paper');
    if (initial){
      container.innerHTML = '';
      container.appendChild(fragment);
      return;
    }
    paper.classList.remove('swap-in','active','swap-out-left','swap-out-right');
    paper.classList.add(toLeft ? 'swap-out-left' : 'swap-out-right');

    const dur = parseInt(getComputedStyle(root).getPropertyValue('--anim-ms')) || 280;
    setTimeout(()=>{
      container.innerHTML = '';
      container.appendChild(fragment);
      paper.classList.remove('swap-out-left','swap-out-right');
      paper.classList.add('swap-in');
      requestAnimationFrame(()=> paper.classList.add('active'));
      setTimeout(()=> paper.classList.remove('swap-in','active'), dur + 30);
    }, dur);
  }

  // --- Navigace (vpřed/vzad) ---
  function goPrev(){ if (isMobile){ if (pageIndex>0) pageIndex--; } else { if (pageIndex>=2) pageIndex-=2; } render(); }
  function goNext(){
    if (isMobile){
      if (pageIndex < totalMobile - 1) pageIndex++;
    } else {
      if (pageIndex < (totalSpreads - 1) * 2) pageIndex += 2;
    }
    render();
  }

  btnPrev.addEventListener('click', goPrev);
  btnNext.addEventListener('click', goNext);

  // Klik na levý/pravý okraj
  root.addEventListener('click', (e)=>{
    const host = e.target.closest('.book');
    if (!host) return;

    const startBtn = e.target.closest('[data-start]');
    if (startBtn) { goNext(); return; }

    const r = host.getBoundingClientRect();
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

  // Swipe (mobil)
  let tX=0, tY=0, swiping=false;
  root.addEventListener('touchstart', (e)=>{
    if (!e.touches?.length) return;
    tX = e.touches[0].clientX;
    tY = e.touches[0].clientY;
    swiping = true;
  }, {passive:true});
  root.addEventListener('touchmove', (e)=>{
    if (!swiping || !e.touches?.length) return;
    const dx = e.touches[0].clientX - tX;
    const dy = e.touches[0].clientY - tY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40){
      (dx > 0) ? goPrev() : goNext();
      swiping = false;
    }
  }, {passive:true});
  root.addEventListener('touchend', ()=> swiping=false, {passive:true});

  // Rebuild pagination na resize (debounce)
  let rAF = 0;
  window.addEventListener('resize', ()=>{
    if (rAF) cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(()=>{
      const pBefore = isMobile ? pageIndex : Math.floor(pageIndex/2);
      buildPagination();
      if (isMobile){
        pageIndex = Math.min(pageIndex, totalMobile-1);
      } else {
        // přibližně zachovej spread
        const newMax = totalSpreads - 1;
        const keep = Math.min(pBefore, newMax);
        pageIndex = keep * 2;
      }
      render(true);
    });
  });

  // Init
  buildPagination();
  render(true);
})();






