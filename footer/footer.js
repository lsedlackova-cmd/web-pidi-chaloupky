(async function(){
  const mount = document.getElementById('footer-root');
  if (!mount) return;

  // DŮLEŽITÉ: absolutní cesta → funguje z / i z /domu/
  try{
    const res = await fetch('/footer/footer.html', { cache: 'no-cache' });
    mount.innerHTML = await res.text();
  }catch(e){
    console.error('Nepodařilo se načíst footer:', e);
  }
})();






