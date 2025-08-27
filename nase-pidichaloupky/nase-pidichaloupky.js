// Desktop: obálka -> Spread A (1|2) -> Spread B (3|konec).
// Mobil: obálka -> 1 -> 2 -> 3 -> 4 -> 5 (konec).
// Na mobilu: stránky 1,2,3,4 mají layout "text nahoře, fotka vyplní zbytek" (flex).
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

  // Šablony (desktop a část mobilu je bere z HTML)
  const tpl = {
    cover : byId('tpl-cover'),
    end   : byId('tpl-end'),
    p1    : byId('tpl-page-1'),
    p2    : byId('tpl-page-2'),
    p3    : byId('tpl-page-3'),
  };

  // ===== helpers =====
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

  // ===== Mobilní stránky jako flex (text nahoře, foto vyplní zbytek) =====
  // Strana 1 (text + foto 1)
  function mobilePage1(){
    return htmlFrag(`
      <div class="content" style="display:flex; flex-direction:column; height:100%; gap:60px;">
        <div class="content__text">
          <p>Bylo, nebylo . . .</p>
          <p>Za lesem, na kraji malé vesničky, stávala chaloupka jako z pohádky. V té chaloupce žili dědeček Míra a babička Ivča. Nebyla to obyčejná chaloupka, sami si ji před pár lety postavili, prkno po prknu, hřebík po hřebíku. Když byla hotová, usadili se v ní a hned cítili, že našli svůj domov.</p>
        </div>
        <div class="content__media content__media--one" style="flex:1 1 auto; min-height:0;">
          <figure class="photo">
            <img src="/img/nase-pidichaloupky-1.jpg" alt="Pidichaloupka – ručně vyráběná mini chaloupka" loading="lazy" decoding="async">
          </figure>
        </div>
      </div>
    `);
  }

  // Strana 2 (text + foto 4)
  function mobilePage2(){
    return htmlFrag(`
      <div class="content" style="display:flex; flex-direction:column; height:100%; gap:60px;">
        <div class="content__text">
          <p>Nebyla to země na mapě, ale kouzelný svět ukrytý v jejich dílně. Tam, mezi šuplíky plnými hřebíčků a poličkami plnými barevných kelímků, vznikaly malé chaloupky. Každá z nich byla ručně vyrobená, jedinečná, a když jste k ní přivoněli, cítili jste vůni lesa i lásku, s jakou byla vytvořena.</p>
        </div>
        <div class="content__media content__media--one" style="flex:1 1 auto; min-height:0;">
          <figure class="photo">
            <img src="/img/nase-pidichaloupky-4.jpg" alt="Dílna – kde vznikají malé chaloupky" loading="lazy" decoding="async">
          </figure>
        </div>
      </div>
    `);
  }

  // Strana 3 (text + JEN foto 5) – už ověřený layout
  function mobilePage3(){
    return htmlFrag(`
      <div class="content" style="display:flex; flex-direction:column; height:100%; gap:8px;">
        <div class="content__text">
          <p>Kdo si je postavil na poličku, ten brzy zjistil, že PidiChaloupka není jen hračka. Byl to malý kousek kouzla, připomínka, že radost se schovává v maličkostech, v otevřeném okénku, v dřevěné stoličce, nebo v malovaném srdíčku nad dveřmi.</p>
        </div>
        <div class="content__media content__media--one" style="flex:1 1 auto; min-height:0;">
          <figure class="photo">
            <img src="/img/nase-pidichaloupky-5.jpg" alt="Detail miniaturních doplňků chaloupek" loading="lazy" decoding="async">
          </figure>
        </div>
      </div>
    `);
  }

  // Strana 4 (NEJDŘÍV fotka 6, pak text; foto vyplní zbytek)
  function mobilePage4(){
    return htmlFrag(`
      <div class="content" style="display:flex; flex-direction:column; height:100%; gap:130px;">
        <div class="content__media content__media--one" style="flex:1 1 auto; min-height:0;">
          <figure class="photo">
            <img style="border-radius:12px;" src="/img/nase-pidichaloupky-6.jpg" alt="Malé radosti – okénko, stolička, srdíčko nad dveřmi" loading="lazy" decoding="async">
          </figure>
        </div>
        <div class="content__text" style="flex:0 0 auto;">
          <p>A tak se stalo, že dědeček Míra s babičkou Ivčou rozdávali radost dál a dál. Jejich chaloupky se dostaly do mnoha domovů, a kdo je uviděl, ten si nemohl pomoct a musel se pousmát.</p>
        </div>
      </div>
    `);
  }

  // Strana 5 (text závěr + CTA)
  function mobilePage5(){
    return htmlFrag(`
      <div class="content content--center" style="display:flex; flex-direction:column; height:100%; gap:66px; justify-content:center;">
        <div class="content__text">
          <p>Protože PidiChaloupka není jen o domečcích. Je to připomínka, že štěstí se někdy ukrývá v tom nejmenším. A jestli někdy půjdeš kolem té vesničky a ucítíš vůni dřeva, možná uslyšíš i ťukání kladívka. To zrovna dědeček Míra s babičkou Ivčou staví další chaloupku, aby mohl . . .</p>
          <p class="final-line" style="margin-top:18px; text-align:center;">. . . začít nový příběh. . .</p>
          <div class="end-actions" style="margin-top:144px; text-align:center;">
            <button class="cover__cta" data-restart>Přečíst znovu</button>
          </div>
        </div>
      </div>
    `);
  }

  // ===== Render =====
  function render(initial=false){
    // Reset režimových tříd
    book.classList.remove('is-cover','is-last','is-end');

    if (isDesktop){
      // === DESKTOP – SPREADS ===
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

    // 1..5
    let frag, folio;
    if (i === 1){ frag = mobilePage1(); folio = 1; }
    else if (i === 2){ frag = mobilePage2(); folio = 2; }
    else if (i === 3){ frag = mobilePage3(); folio = 3; }
    else if (i === 4){ frag = mobilePage4(); folio = 4; }
    else              { frag = mobilePage5(); folio = 5; }

    swapInto(paperLeft, leftHost, frag, true, initial);
    setFolio(leftFolio, folio);
    label.textContent = '';

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

















