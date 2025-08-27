// Desktop: obálka -> Spread A (1|2) -> Spread B (3|konec).
// Mobil: obálka -> 1 -> 2 -> 3 -> 4 -> 5 (konec).
// Folia: mobil 1–5; konec bez folia. Stavový štítek na mobilu neukazujeme.
// „Přečíst znovu“ vrací na obálku. Šipka vpřed skrytá na posledním stavu.

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

  // Šablony (HTML už je má)
  const tpl = {
    cover : byId('tpl-cover'),
    end   : byId('tpl-end'),
    p1    : byId('tpl-page-1'),
    p2    : byId('tpl-page-2'),
    p3    : byId('tpl-page-3'),
  };

  // ===== helpery =====
  function setFolio(el, n){
    if (!el) return;
    el.textContent = (typeof n === 'number')
      ? `Pohádka o Pidichaloupkách — strana ${n}`
      : '';
  }
  function clear(el){ el.innerHTML = ''; }
  function useTemplate(t){ return document.importNode(t.content, true); }
  function htmlFrag(str){
    const t = document.createElement('template'); t.innerHTML = str.trim();
    return t.content;
  }

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
    const startBtn   = scope.querySelector('[data-start]');
    const restartBtn = scope.querySelector('[data-restart]');
    if (startBtn)   startBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); goNext(); });
    if (restartBtn) restartBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); goRestart(); });
  }

  // ===== Stav + responsivita =====
  const mqDesktop = window.matchMedia('(min-width: 769px)');
  let isDesktop = mqDesktop.matches;

  // Desktop: 0=obálka, 1=spread A (1|2), 2=spread B (3|konec)
  let spreadIndex = 0;

  // Mobil: 0=obálka, 1=1, 2=2, 3=3, 4=4, 5=5 (konec)
  let pageIndex = 0;

  mqDesktop.addEventListener?.('change', ()=>{ isDesktop = mqDesktop.matches; render(true); });

  // ===== Mobilní stránky 3–5 jako fragmenty (bez zásahu do HTML) =====

  // Strana 3 (text + JEN foto 5) – výrazně větší a trochu blíž k textu, bez ořezu
 function mobilePage3(){
  return htmlFrag(`
    <div class="content"
         style="display:flex; flex-direction:column; height:100%; gap:8px;">
      <div class="content__text">
        <p>Kdo si je postavil na poličku, ten brzy zjistil, že PidiChaloupka není jen hračka. Byl to malý kousek kouzla, připomínka, že radost se schovává v maličkostech, v otevřeném okénku, v dřevěné stoličce, nebo v malovaném srdíčku nad dveřmi.</p>
      </div>
      <div class="content__media content__media--one"
           style="flex:1 1 auto; min-height:0; margin-top:0;">
        <figure class="photo">
          <img src="/img/nase-pidichaloupky-5.jpg"
               alt="Detail miniaturních doplňků chaloupek"
               loading="lazy" decoding="async">
        </figure>
      </div>
    </div>
  `);
}

  // Strana 4 (NEJDŘÍV fotka 6 úplně nahoře, pak text; posun celé dvojice výš, mezera mezi nimi zachována)
  function mobilePage4(){
    return htmlFrag(`
      <div class="content" style="gap:10px; margin-top:-30px;">
        <div class="content__media content__media--one" style="min-height:46vh;">
          <figure class="photo">
            <img src="/img/nase-pidichaloupky-6.jpg" alt="Malé radosti – okénko, stolička, srdíčko nad dveřmi" loading="lazy" decoding="async">
          </figure>
        </div>
        <div class="content__text">
          <p>A tak se stalo, že dědeček Míra s babičkou Ivčou rozdávali radost dál a dál. Jejich chaloupky se dostaly do mnoha domovů, a kdo je uviděl, ten si nemohl pomoct a musel se pousmát.</p>
        </div>
      </div>
    `);
  }

  // Strana 5 (jen text „Protože… nový příběh začít…“ + tlačítko; folio = 5)
  function mobilePage5(){
    return htmlFrag(`
      <div class="content content--center" style="gap:16px;">
        <div class="content__text">
          <p>Protože PidiChaloupka není jen o domečcích. Je to připomínka, že štěstí se někdy ukrývá v tom nejmenším. A jestli někdy půjdeš kolem té vesničky a ucítíš vůni dřeva, možná uslyšíš i ťukání kladívka. To zrovna dědeček Míra s babičkou Ivčou staví další chaloupku, aby mohl . . .</p>
          <p class="final-line" style="margin-top:18px; text-align:center;">. . . začít nový příběh . . .</p>
          <div class="end-actions" style="margin-top:24px; text-align:center;">
            <button class="cover__cta" data-restart>Přečíst znovu</button>
          </div>
        </div>
      </div>
    `);
  }

  // Po vložení obsahu jemně doladíme rozestupy na mobilu pro stranu 1 a 2 (posun fotky dolů)
// Po vložení obsahu jemně doladíme rozestupy na mobilu (1,2) a přizpůsobíme fotku na 3
function tuneMobilePage(i){
  if (isDesktop) return;
  const paper = paperLeft;
  if (!paper) return;

  // Posun jen bloku s fotkou na 1 a 2 (text zůstává)
  const media = paper.querySelector('.content__media');
  if (media && i === 1){
    media.style.marginTop = '12px';
  } else if (media && i === 2){
    media.style.marginTop = '28px';
  }

  // === STRANA 3: dopočítej zbylou výšku a nastav ji jako výšku pro fotku ===
  if (i === 3){
    const content = paper.querySelector('.page__content');
    const text    = content?.querySelector('.content__text');
    const media3  = content?.querySelector('.content__media');

    if (content && text && media3){
      // zmenši rezervu na folio jen pro tuto stránku, ať je víc místa pro fotku
      paper.style.setProperty('--folio-space', '22px');

      // odečti výšku textu + mezeru řádků gridu a zbytek dej fotce
      const cs   = getComputedStyle(content);
      const gap  = parseFloat(cs.rowGap || '0');
      const avail = content.clientHeight - text.offsetHeight - gap;

      media3.style.marginTop  = '0';          // přisunout k textu
      media3.style.minHeight  = '0';          // zrušíme původní min-height
      media3.style.height     = Math.max(avail, 0) + 'px'; // fotka přesně vyplní zbytek
      // Obrázek už v CSS má object-fit: contain; max-width/height:100% => celý se vejde
    }
  } else {
    // pro ostatní strany vrať folio-space na výchozí
    paper.style.removeProperty('--folio-space');
  }
}

  // ===== Render =====
  function render(initial=false){
    // Reset režimových tříd
    book.classList.remove('is-cover','is-last','is-end');

    if (isDesktop){
      // === DESKTOP – SPREADS (BEZE ZMĚN OBSAHU) ===
      const s = spreadIndex;

      if (s === 0){
        book.classList.add('is-cover');
        swapInto(paperLeft, leftHost,  useTemplate(tpl.cover), true, initial);
        clear(rightHost); setFolio(leftFolio, null); setFolio(rightFolio, null);
        label.textContent = '';
        btnPrev.disabled = true;
        btnNext.disabled = false;
        return;
      }

      const leftDef  = (s === 1) ? tpl.p1 : tpl.p3;
      const rightDef = (s === 1) ? tpl.p2 : tpl.end;

      swapInto(paperLeft,  leftHost,  useTemplate(leftDef),  true,  initial);
      swapInto(paperRight, rightHost, useTemplate(rightDef), false, initial);

      if (s === 1){ setFolio(leftFolio, 1); setFolio(rightFolio, 2); }
      else         { setFolio(leftFolio, 3); setFolio(rightFolio, null); }

      label.textContent = '';

      const last = (s === 2);
      book.classList.toggle('is-last', last);
      btnPrev.disabled = false;
      btnNext.disabled = last;
      return;
    }

    // === MOBIL – JEDNA STRANA (PO UPRAVĚ) ===
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

    // 1,2,3,4,5 (konec) – upravené 3–5; 1 a 2 doladíme tuneMobilePage
    let frag, folio;
    if (i === 1){ frag = useTemplate(tpl.p1); folio = 1; }
    else if (i === 2){ frag = useTemplate(tpl.p2); folio = 2; }
    else if (i === 3){ frag = mobilePage3();      folio = 3; }   // větší foto 5
    else if (i === 4){ frag = mobilePage4();      folio = 4; }   // fotka nahoře + text
    else              { frag = mobilePage5();      folio = 5; }   // závěr s CTA

    swapInto(paperLeft, leftHost, frag, true, initial);
    setFolio(leftFolio, folio);
    label.textContent = '';

    // jemné doladění rozestupů na str. 1 a 2 (posun fotky níž)
    setTimeout(()=> tuneMobilePage(i), 0);

    // Šipky
    btnPrev.disabled = (i === 0);
    btnNext.disabled = (i === 5);
  }

  // Navigace
  function goPrev(){
    if (isDesktop){ if (spreadIndex > 0) spreadIndex--; }
    else { if (pageIndex > 0) pageIndex--; }
    render();
  }
  function goNext(){
    if (isDesktop){ if (spreadIndex < 2) spreadIndex++; }
    else { if (pageIndex < 5) pageIndex++; }
    render();
  }
  function goRestart(){
    if (isDesktop){ spreadIndex = 0; }
    else { pageIndex = 0; }
    render();
  }

  btnPrev.addEventListener('click', (e)=>{ e.stopPropagation(); goPrev(); });
  btnNext.addEventListener('click', (e)=>{ e.stopPropagation(); goNext(); });

  // Klik na okraje
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

















