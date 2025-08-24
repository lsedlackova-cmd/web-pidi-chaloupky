// Zvukové tlačítko pro úvodní video (mute/unmute)
(function(){
  const video = document.getElementById('pidiVideo');
  const btn   = document.getElementById('soundToggle');
  if(!video || !btn) return;

  function setUI(){
    if(video.muted || video.volume === 0){
      btn.textContent = '🔇';
      btn.setAttribute('aria-pressed','false');
      btn.setAttribute('aria-label','Zapnout zvuk');
      btn.title = 'Zapnout zvuk';
    }else{
      btn.textContent = '🔊';
      btn.setAttribute('aria-pressed','true');
      btn.setAttribute('aria-label','Vypnout zvuk');
      btn.title = 'Vypnout zvuk';
    }
  }

  async function toggleSound(){
    try{
      if(video.muted || video.volume === 0){
        video.muted = false;
        video.volume = 1;
        await video.play();   // klik je uživatelská interakce → projde
      }else{
        video.muted = true;
      }
    }catch(e){
      video.muted = true;
      console.warn('Audio nebylo možné přehrát bez interakce:', e);
    }finally{
      setUI();
    }
  }

  // Inicializace
  video.muted = true; // jistota pro autoplay
  setUI();

  btn.addEventListener('click', toggleSound);
  ['volumechange','play','pause'].forEach(ev => video.addEventListener(ev, setUI));
})();


