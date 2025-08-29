// Ozvěte se nám – malinké UX: klik na řádek kontaktu krátce „blikne“
(function(){
  const root = document.querySelector('.pidi-ozvete');
  if (!root) return;

  root.querySelectorAll('.contact-row').forEach(row=>{
    row.addEventListener('click', ()=>{
      row.classList.add('is-active');
      setTimeout(()=> row.classList.remove('is-active'), 220);
    });
  });
})();


