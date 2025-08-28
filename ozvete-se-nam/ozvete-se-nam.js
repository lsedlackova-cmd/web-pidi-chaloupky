// Ozvěte se nám – skript je záměrně minimalistický.
// (Necháváme prostor do budoucna např. pro kopírování tel/emailu apod.)
(function(){
  const root = document.querySelector('.pidi-ozvete');
  if (!root) return;

  // Malý UX detail: při kliku na kontakt přidáme krátké zvýraznění.
  root.querySelectorAll('.contact-row').forEach(row=>{
    row.addEventListener('click', ()=>{
      row.classList.add('is-active');
      setTimeout(()=> row.classList.remove('is-active'), 220);
    });
  });
})();
