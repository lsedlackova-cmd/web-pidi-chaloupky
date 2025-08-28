// Ozvěte se nám – minimalistický skript + drobné zvýraznění po kliku
(function(){
  const root = document.querySelector('.pidi-kontakt, .pidi-ozvete');
  if (!root) return;

  // Krátké zvýraznění řádku po kliku (UX detail)
  root.querySelectorAll('.contact-row').forEach(row=>{
    row.addEventListener('click', ()=>{
      row.classList.add('is-active');
      setTimeout(()=> row.classList.remove('is-active'), 220);
    });
  });
})();

