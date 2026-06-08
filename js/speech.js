/* =====================================================================
   SPEECH — Ditado por voz (Speech-to-Text) via Web Speech API
   Funciona em Chrome, Edge e Safari (https). Português do Brasil.
   Botões com [data-mic="idDoCampo"] acionam a transcrição.
   ===================================================================== */
const Speech = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = () => !!SR;

  let rec=null, activeBtn=null, activeTarget=null, baseText='', finalText='';

  function init(){
    if(!supported()){ document.body.classList.add('no-speech'); }
    // delegação: um único listener para todos os botões de microfone
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-mic]');
      if(!btn) return;
      e.preventDefault(); e.stopPropagation();
      const target = document.getElementById(btn.dataset.mic);
      if(!target) return;
      if(activeBtn===btn){ stop(); return; }   // clicar de novo = parar
      start(btn, target);
    });
  }

  function start(btn, target){
    if(!supported()){ UI.toast('Ditado por voz indisponível neste navegador. Use Chrome, Edge ou Safari.','⚠'); return; }
    stop(); // encerra qualquer gravação anterior

    rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;

    activeBtn=btn; activeTarget=target;
    baseText = target.value ? target.value.replace(/\s+$/,'') + ' ' : '';
    finalText='';
    btn.classList.add('rec');
    target.focus();

    rec.onresult = (ev)=>{
      let interim=''; finalText='';
      for(let i=0;i<ev.results.length;i++){
        const t = ev.results[i][0].transcript;
        if(ev.results[i].isFinal) finalText += capitalizeFix(t) + ' ';
        else interim += t;
      }
      target.value = (baseText + finalText + interim).replace(/\s{2,}/g,' ');
      target.dispatchEvent(new Event('input'));
    };
    rec.onerror = (ev)=>{
      if(ev.error==='not-allowed' || ev.error==='service-not-allowed')
        UI.toast('Permita o uso do microfone no navegador para ditar.','⚠');
      else if(ev.error==='no-speech')
        UI.toast('Não captei áudio. Tente novamente mais perto do microfone.','⚠');
      stop();
    };
    rec.onend = ()=>{
      if(activeTarget){
        activeTarget.value = (baseText + finalText).replace(/\s{2,}/g,' ').trim();
        activeTarget.dispatchEvent(new Event('input'));
      }
      cleanup();
    };

    try{ rec.start(); UI.toast('🎙️ Gravando… fale e toque no microfone para parar'); }
    catch(e){ cleanup(); }
  }

  function stop(){ if(rec){ try{ rec.stop(); }catch(e){} } }
  function cleanup(){ if(activeBtn) activeBtn.classList.remove('rec'); activeBtn=null; activeTarget=null; rec=null; }

  // pequenos ajustes de pontuação faladas
  function capitalizeFix(t){
    return t
      .replace(/\s+vírgula\b/gi, ',')
      .replace(/\s+ponto final\b/gi, '.')
      .replace(/\s+ponto\b/gi, '.')
      .replace(/\s+nova linha\b/gi, '\n')
      .replace(/\s+parágrafo\b/gi, '\n');
  }

  return { init, supported };
})();
