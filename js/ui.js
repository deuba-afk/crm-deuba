/* =====================================================================
   UI — Helpers compartilhados (modal, toast, formatação)
   ===================================================================== */
const UI = (() => {
  /* ---------- Modal ---------- */
  function openModal(title, html, wide){
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    const m = document.getElementById('modal');
    m.classList.toggle('wide', !!wide);
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }
  function closeModal(){ document.getElementById('modal-backdrop').classList.add('hidden'); }

  /* ---------- Toast ---------- */
  function toast(msg, icon='✓'){
    const wrap = document.getElementById('toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${icon}</span><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(40px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, 2800);
  }

  /* ---------- Helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function initials(name){
    return String(name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  }

  function avatar(c, size=44){
    const fs = Math.round(size*0.38);
    if(c && c.foto){
      return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${esc(c.foto)}');background-size:cover;background-position:center;flex-shrink:0;border:2px solid var(--gold-100)"></div>`;
    }
    const grad = c && c.classificacao==='Mantenedor' ? 'var(--gold-500),var(--gold-600)' : 'var(--green-600),var(--green-500)';
    return `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:${fs}px;background:linear-gradient(150deg,${grad});flex-shrink:0">${initials(c?.nome)}</div>`;
  }

  function stars(n){
    n = n||0; let s='';
    for(let i=1;i<=5;i++) s += `<span class="${i<=n?'':'off'}">★</span>`;
    return `<span class="stars" title="Nível ${n}/5">${s}</span>`;
  }

  const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function fmtDate(iso){
    if(!iso) return '—';
    const p = iso.slice(0,10).split('-');
    return `${p[2]} ${MESES[(+p[1])-1]} ${p[0]}`;
  }
  function fmtDateShort(iso){
    if(!iso) return '—';
    const p = iso.slice(0,10).split('-');
    return `${p[2]}/${p[1]}`;
  }
  function daysFromNow(iso){
    if(!iso) return null;
    const a = new Date(iso.slice(0,10)+'T00:00:00');
    const b = new Date(); b.setHours(0,0,0,0);
    return Math.round((a-b)/86400000);
  }
  function relativeDays(iso){
    const n = daysFromNow(iso);
    if(n===null) return '';
    if(n===0) return 'hoje';
    if(n===1) return 'amanhã';
    if(n===-1) return 'ontem';
    if(n>1) return `em ${n} dias`;
    return `há ${Math.abs(n)} dias`;
  }
  function brl(v){
    return (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  }

  const CAT_ICON = {
    'Deputado':'🏛️','Senador':'🏛️','Vereador':'🏛️','Prefeito':'🏙️','Secretário':'📋',
    'Imprensa':'📰','Empresário':'💼','Patrocinador':'🤝','Parceiro':'🤝','Médico':'⚕️',
    'Voluntário':'🙌','Doador':'💚','Liderança':'⭐','Influenciador':'📣','Associado':'👥',
    'Instituição':'🏢','Fornecedor':'📦'
  };
  const catIcon = (c) => CAT_ICON[c] || '👤';

  function prioTag(p){
    const map = {'Alta':'tag-red','Média':'tag-amber','Baixa':'tag-green'};
    return `<span class="tag ${map[p]||'tag'}">${esc(p)}</span>`;
  }

  /* ---------- Form serializer ---------- */
  function readForm(formEl){
    const data = {};
    formEl.querySelectorAll('[name]').forEach(el=>{
      if(el.type==='checkbox') data[el.name]=el.checked;
      else data[el.name]=el.value.trim();
    });
    return data;
  }

  /* ---------- Confirm ---------- */
  function confirmAction(msg, onYes){
    openModal('Confirmar', `
      <p style="margin-bottom:20px">${esc(msg)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-danger" id="confirm-yes">Confirmar</button>
      </div>`);
    document.getElementById('confirm-yes').onclick = () => { closeModal(); onYes(); };
  }

  // botão de ditado por voz para um campo (textarea/input) com id informado
  const mic = (targetId) => `<button type="button" class="mic-btn" data-mic="${targetId}" title="Ditar por voz" aria-label="Ditar por voz">🎤</button>`;

  return { openModal, closeModal, toast, esc, initials, avatar, stars, fmtDate, fmtDateShort,
           daysFromNow, relativeDays, brl, catIcon, prioTag, readForm, confirmAction, mic };
})();
