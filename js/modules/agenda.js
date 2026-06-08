/* =====================================================================
   MÓDULO — AGENDA
   Tipos: 'interna' | 'externa'
   Recorrência semanal por dias da semana
   Reuniões externas podem criar/vincular contatos automaticamente
   ===================================================================== */
const Agenda = (() => {

  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  /* ── Estado local da view ── */
  let calYear  = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  let selDate  = toDateStr(new Date()); // 'YYYY-MM-DD'

  /* ── Helpers de data ── */
  function toDateStr(d){ return d.toISOString().slice(0,10); }
  function parseDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
  function today(){ return toDateStr(new Date()); }

  /* Expande eventos recorrentes num intervalo de datas */
  function expandirEventos(dataInicio, dataFim){
    const eventos = Store.all('agenda_eventos');
    const resultado = [];

    const inicio = parseDate(dataInicio);
    const fim    = parseDate(dataFim);

    for(const ev of eventos){
      if(!ev.recorrente){
        const d = parseDate(ev.data);
        if(d >= inicio && d <= fim) resultado.push({ ...ev, dataReal: ev.data });
      } else {
        // percorre cada dia no intervalo
        const cursor = new Date(inicio);
        while(cursor <= fim){
          const dow = cursor.getDay(); // 0=Dom … 6=Sáb
          if(ev.diasSemana && ev.diasSemana.includes(dow)){
            const ds = toDateStr(cursor);
            // respeita data de início original e data de término
            if(ds >= ev.data && (!ev.recFim || ds <= ev.recFim)){
              resultado.push({ ...ev, dataReal: ds });
            }
          }
          cursor.setDate(cursor.getDate()+1);
        }
      }
    }

    resultado.sort((a,b)=>{
      if(a.dataReal !== b.dataReal) return a.dataReal.localeCompare(b.dataReal);
      return (a.hora||'').localeCompare(b.hora||'');
    });
    return resultado;
  }

  /* Dias que têm evento num mês (para pontinhos no mini-calendário) */
  function diasComEvento(ano, mes){
    const inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
    const ultimo = new Date(ano, mes+1, 0);
    const fim    = toDateStr(ultimo);
    const evs    = expandirEventos(inicio, fim);
    return new Set(evs.map(e=>e.dataReal));
  }

  /* ── Render principal ── */
  function render(){
    return `
    <div class="agenda-shell">
      <div class="agenda-sidebar">
        ${renderMiniCal()}
        ${renderLegenda()}
        ${renderResumoDia()}
      </div>
      <div class="agenda-main">
        <div class="agenda-topbar">
          <div class="agenda-topbar-left">
            <h2 class="agenda-titulo">Agenda</h2>
          </div>
          <button class="btn btn-primary" id="ag-novo">
            <span style="font-size:18px;line-height:1;margin-right:4px">+</span> Novo Evento
          </button>
        </div>
        <div class="agenda-lista" id="agenda-lista">
          ${renderLista()}
        </div>
      </div>
    </div>`;
  }

  /* ── Mini calendário ── */
  function renderMiniCal(){
    const comEvento = diasComEvento(calYear, calMonth);
    const primeiro  = new Date(calYear, calMonth, 1).getDay();
    const totalDias = new Date(calYear, calMonth+1, 0).getDate();
    const prevDias  = new Date(calYear, calMonth, 0).getDate();
    const td = today();

    let cells = '';
    // dias do mês anterior
    for(let i=primeiro-1; i>=0; i--){
      cells += `<div class="mc-day other">${prevDias-i}</div>`;
    }
    // dias do mês atual
    for(let d=1; d<=totalDias; d++){
      const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cls = [
        'mc-day',
        ds===td      ? 'hoje'    : '',
        ds===selDate ? 'sel'     : '',
        comEvento.has(ds) ? 'has-ev' : '',
      ].filter(Boolean).join(' ');
      cells += `<div class="${cls}" data-mc-date="${ds}">${d}</div>`;
    }
    // completar última linha
    const resto = (primeiro + totalDias) % 7;
    if(resto){ for(let d=1; d<=7-resto; d++) cells += `<div class="mc-day other">${d}</div>`; }

    return `
    <div class="mini-cal">
      <div class="mc-header">
        <button class="mc-nav" id="mc-prev">‹</button>
        <span class="mc-mes">${MESES[calMonth]} ${calYear}</span>
        <button class="mc-nav" id="mc-next">›</button>
      </div>
      <div class="mc-grid">
        ${DIAS.map(d=>`<div class="mc-dname">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
  }

  function renderLegenda(){
    return `
    <div class="ag-legenda">
      <div class="ag-leg-title">Tipos de Evento</div>
      <div class="ag-leg-item"><span class="ag-leg-dot interna"></span>Reunião Interna</div>
      <div class="ag-leg-item"><span class="ag-leg-dot externa"></span>Reunião Externa</div>
      <div class="ag-leg-item"><span class="ag-leg-dot recorrente"></span>Recorrente</div>
    </div>`;
  }

  function renderResumoDia(){
    const td = today();
    const evs = expandirEventos(td, td);
    const internas  = evs.filter(e=>e.tipo==='interna').length;
    const externas  = evs.filter(e=>e.tipo==='externa').length;
    const d = parseDate(td);
    return `
    <div class="ag-resumo">
      <div class="ag-resumo-title">Hoje — ${d.getDate()} ${MESES_CURTO[d.getMonth()]}</div>
      <div class="ag-resumo-row"><span>Total</span><strong>${evs.length}</strong></div>
      <div class="ag-resumo-row"><span>Internas</span><strong style="color:var(--info)">${internas}</strong></div>
      <div class="ag-resumo-row"><span>Externas</span><strong style="color:var(--green-700)">${externas}</strong></div>
    </div>`;
  }

  /* ── Lista de eventos (próximos 14 dias a partir de selDate) ── */
  function renderLista(){
    const inicio = selDate;
    const fimD   = parseDate(selDate);
    fimD.setDate(fimD.getDate()+13);
    const fim = toDateStr(fimD);

    const evs = expandirEventos(inicio, fim);

    if(!evs.length) return `<div class="ag-vazio">Nenhum evento nos próximos 14 dias.<br>Clique em <strong>+ Novo Evento</strong> para começar.</div>`;

    // agrupar por dataReal
    const grupos = {};
    evs.forEach(e=>{ (grupos[e.dataReal]||(grupos[e.dataReal]=[])).push(e); });

    const td = today();
    return Object.entries(grupos).map(([data, lista])=>{
      const d   = parseDate(data);
      const lab = data===td ? 'Hoje' : data===incrementDay(td) ? 'Amanhã' : `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
      return `
      <div class="ag-group">
        <div class="ag-group-head">
          <span class="ag-group-label">${lab}</span>
          <div class="ag-group-line"></div>
          <span class="ag-group-badge">${lista.length} evento${lista.length>1?'s':''}</span>
        </div>
        ${lista.map(ev=>renderCard(ev, data)).join('')}
      </div>`;
    }).join('');
  }

  function incrementDay(ds){
    const d = parseDate(ds);
    d.setDate(d.getDate()+1);
    return toDateStr(d);
  }

  function renderCard(ev, dataReal){
    const contato = ev.contatoId ? Store.byId('contatos', ev.contatoId) : null;
    const recTag  = ev.recorrente
      ? `<span class="ag-badge rec">↻ ${recLabel(ev.diasSemana)}</span>` : '';
    const tipoTag = `<span class="ag-badge ${ev.tipo}">${ev.tipo==='interna'?'Interna':'Externa'}</span>`;

    const clienteInfo = contato
      ? `<div class="ag-card-meta"><span class="ag-meta-ico">👤</span>${UI.esc(contato.nome)}${contato.telefone?` · ${UI.esc(contato.telefone)}`:''}</div>`
      : (ev.novoNome ? `<div class="ag-card-meta"><span class="ag-meta-ico">👤</span>${UI.esc(ev.novoNome)}${ev.novoTel?` · ${UI.esc(ev.novoTel)}`:''} <span style="color:var(--gold-600);font-size:11px">★ cadastrado pelo evento</span></div>` : '');

    const localInfo = ev.local
      ? `<div class="ag-card-meta"><span class="ag-meta-ico">📍</span>${UI.esc(ev.local)}</div>` : '';

    const descInfo = ev.descricao
      ? `<div class="ag-card-desc">${UI.esc(ev.descricao)}</div>` : '';

    return `
    <div class="ag-card ${ev.tipo}" data-id="${ev.id}" data-date="${dataReal}">
      <div class="ag-card-hora">
        <div class="ag-hora">${ev.hora||'—'}</div>
        ${ev.horaFim?`<div class="ag-duracao">${calcDuracao(ev.hora, ev.horaFim)}</div>`:''}
      </div>
      <div class="ag-card-sep"></div>
      <div class="ag-card-body">
        <div class="ag-card-top">
          <span class="ag-card-title">${UI.esc(ev.titulo)}</span>
          ${tipoTag}${recTag}
        </div>
        ${descInfo}${clienteInfo}${localInfo}
      </div>
      <div class="ag-card-actions">
        <button class="icon-btn ag-edit" data-id="${ev.id}" title="Editar">✎</button>
        <button class="icon-btn ag-del" data-id="${ev.id}" data-date="${dataReal}" title="Excluir">✕</button>
      </div>
    </div>`;
  }

  function recLabel(dias){
    if(!dias||!dias.length) return 'Recorrente';
    if(dias.length===5 && !dias.includes(0)&&!dias.includes(6)) return 'Dias úteis';
    if(dias.length===7) return 'Diário';
    return dias.map(d=>DIAS[d]).join(', ');
  }

  function calcDuracao(inicio, fim){
    if(!inicio||!fim) return '';
    const [h1,m1]=inicio.split(':').map(Number);
    const [h2,m2]=fim.split(':').map(Number);
    const tot = (h2*60+m2)-(h1*60+m1);
    if(tot<=0) return '';
    const h=Math.floor(tot/60), m=tot%60;
    return h&&m?`${h}h ${m}m`:h?`${h}h`:`${m}m`;
  }

  /* ── afterRender: eventos do DOM ── */
  function afterRender(){
    // mini cal nav
    document.getElementById('mc-prev')?.addEventListener('click',()=>{
      calMonth--; if(calMonth<0){calMonth=11;calYear--;} reRender();
    });
    document.getElementById('mc-next')?.addEventListener('click',()=>{
      calMonth++; if(calMonth>11){calMonth=0;calYear++;} reRender();
    });

    // clique nos dias do mini cal
    document.querySelectorAll('[data-mc-date]').forEach(el=>{
      el.addEventListener('click',()=>{ selDate=el.dataset.mcDate; reRender(); });
    });

    // botão novo
    document.getElementById('ag-novo')?.addEventListener('click',()=>abrirModal());

    // editar / deletar cards
    document.querySelectorAll('.ag-edit').forEach(btn=>{
      btn.addEventListener('click',(e)=>{ e.stopPropagation(); abrirModal(btn.dataset.id); });
    });
    document.querySelectorAll('.ag-del').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const ev = Store.byId('agenda_eventos', btn.dataset.id);
        if(!ev) return;
        const msg = ev.recorrente
          ? 'Este é um evento recorrente. Confirma excluir TODAS as ocorrências?'
          : 'Excluir este evento?';
        UI.confirmAction(msg, ()=>{ Store.remove('agenda_eventos', ev.id); reRender(); UI.toast('Evento excluído.'); });
      });
    });
  }

  function reRender(){
    const shell = document.querySelector('.agenda-shell');
    if(!shell) return;
    shell.querySelector('.agenda-sidebar').innerHTML =
      renderMiniCal() + renderLegenda() + renderResumoDia();
    shell.querySelector('.agenda-lista').innerHTML = renderLista();
    afterRender();
    // re-bind nav botões (estão dentro de sidebar)
    document.getElementById('mc-prev')?.addEventListener('click',()=>{
      calMonth--; if(calMonth<0){calMonth=11;calYear--;} reRender();
    });
    document.getElementById('mc-next')?.addEventListener('click',()=>{
      calMonth++; if(calMonth>11){calMonth=0;calYear++;} reRender();
    });
    document.querySelectorAll('[data-mc-date]').forEach(el=>{
      el.addEventListener('click',()=>{ selDate=el.dataset.mcDate; reRender(); });
    });
  }

  /* ── MODAL ── */
  function abrirModal(id){
    const ev = id ? Store.byId('agenda_eventos', id) : null;
    const contatos = Store.all('contatos');

    UI.openModal(ev ? 'Editar Evento' : 'Novo Evento', `
      <div class="ag-form">

        <!-- Tipo -->
        <div class="ag-form-group">
          <label class="ag-form-label">Tipo de Reunião</label>
          <div class="ag-type-sel">
            <div class="ag-type-card interna ${!ev||ev.tipo==='interna'?'sel':''}" data-tipo="interna">
              <div class="ag-type-ico" style="background:#e8f4f8">🏢</div>
              <div class="ag-type-name">Reunião Interna</div>
              <div class="ag-type-sub">Equipe ou uso pessoal</div>
            </div>
            <div class="ag-type-card externa ${ev&&ev.tipo==='externa'?'sel':''}" data-tipo="externa">
              <div class="ag-type-ico" style="background:var(--green-100)">🤝</div>
              <div class="ag-type-name">Reunião Externa</div>
              <div class="ag-type-sub">Com cliente ou parceiro</div>
            </div>
          </div>
        </div>

        <!-- Título -->
        <div class="ag-form-group">
          <label class="ag-form-label">Título *</label>
          <input id="ag-titulo" class="ag-input" type="text" placeholder="Ex: Alinhamento de equipe, Apresentação de proposta…" value="${ev?UI.esc(ev.titulo):''}">
        </div>

        <!-- Data e horário -->
        <div class="ag-form-row">
          <div class="ag-form-group">
            <label class="ag-form-label">Data *</label>
            <input id="ag-data" class="ag-input" type="date" value="${ev?ev.data:selDate}">
          </div>
          <div class="ag-form-group">
            <label class="ag-form-label">Início</label>
            <input id="ag-hora" class="ag-input" type="time" value="${ev&&ev.hora?ev.hora:'09:00'}">
          </div>
          <div class="ag-form-group">
            <label class="ag-form-label">Término</label>
            <input id="ag-horafim" class="ag-input" type="time" value="${ev&&ev.horaFim?ev.horaFim:'10:00'}">
          </div>
        </div>

        <!-- Local -->
        <div class="ag-form-group">
          <label class="ag-form-label">Local / Formato</label>
          <select id="ag-local" class="ag-input">
            ${['Presencial','Videoconferência (Teams)','Videoconferência (Zoom)','Telefone','A definir'].map(o=>
              `<option ${ev&&ev.local===o?'selected':''}>${o}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Cliente (só externas) -->
        <div id="ag-cliente-group" class="ag-form-group" style="${!ev||ev.tipo==='interna'?'display:none':''}">
          <label class="ag-form-label">Cliente / Contato</label>
          <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">
            <select id="ag-contato" class="ag-input" style="flex:1;min-width:180px">
              <option value="">— Selecionar contato existente —</option>
              ${contatos.map(c=>`<option value="${c.id}" ${ev&&ev.contatoId===c.id?'selected':''}>${UI.esc(c.nome)}</option>`).join('')}
              <option value="__novo__" ${ev&&ev.novoNome&&!ev.contatoId?'selected':''}>+ Cadastrar novo contato</option>
            </select>
          </div>
          <div id="ag-novo-contato" class="ag-novo-contato ${ev&&ev.novoNome&&!ev.contatoId?'show':''}">
            <div class="ag-novo-contato-title">📋 Novo contato — dados básicos</div>
            <div class="ag-form-row">
              <div class="ag-form-group">
                <label class="ag-form-label">Nome *</label>
                <input id="ag-nc-nome" class="ag-input" type="text" placeholder="Nome completo" value="${ev&&ev.novoNome?UI.esc(ev.novoNome):''}">
              </div>
            </div>
            <div class="ag-form-row">
              <div class="ag-form-group">
                <label class="ag-form-label">Telefone</label>
                <input id="ag-nc-tel" class="ag-input" type="tel" placeholder="(00) 00000-0000" value="${ev&&ev.novoTel?UI.esc(ev.novoTel):''}">
              </div>
              <div class="ag-form-group">
                <label class="ag-form-label">E-mail</label>
                <input id="ag-nc-email" class="ag-input" type="email" placeholder="email@exemplo.com" value="${ev&&ev.novoEmail?UI.esc(ev.novoEmail):''}">
              </div>
            </div>
            <div style="font-size:11.5px;color:var(--green-700);margin-top:4px">O contato será criado e vinculado automaticamente ao evento.</div>
          </div>
        </div>

        <!-- Descrição -->
        <div class="ag-form-group">
          <label class="ag-form-label">Descrição / Pauta</label>
          <textarea id="ag-desc" class="ag-input ag-textarea" placeholder="Objetivo, pauta, documentos necessários…">${ev&&ev.descricao?UI.esc(ev.descricao):''}</textarea>
        </div>

        <!-- Recorrência -->
        <div class="ag-form-group">
          <div class="ag-toggle-row">
            <button type="button" class="ag-toggle ${ev&&ev.recorrente?'on':''}" id="ag-rec-toggle"></button>
            <span class="ag-toggle-label">Evento recorrente (repete toda semana)</span>
          </div>
          <div id="ag-rec-box" class="ag-rec-box ${ev&&ev.recorrente?'show':''}">
            <div class="ag-rec-title">Repetir nos dias:</div>
            <div class="ag-days">
              ${DIAS.map((d,i)=>`<button type="button" class="ag-day ${ev&&ev.diasSemana&&ev.diasSemana.includes(i)?'on':''}" data-dow="${i}">${d}</button>`).join('')}
            </div>
            <div class="ag-form-group" style="margin-bottom:0;margin-top:10px">
              <label class="ag-form-label">Repetir até</label>
              <select id="ag-rec-fim" class="ag-input">
                <option value="" ${ev&&!ev.recFim?'selected':''}>Sem data de término</option>
                ${gerarOpcoesRecFim(ev&&ev.recFim).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Botões -->
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="button" class="btn btn-primary" id="ag-salvar">Salvar Evento</button>
        </div>

      </div>
    `);

    // binds internos do modal
    setTimeout(()=>{
      // tipo
      document.querySelectorAll('.ag-type-card').forEach(card=>{
        card.addEventListener('click',()=>{
          document.querySelectorAll('.ag-type-card').forEach(c=>c.classList.remove('sel'));
          card.classList.add('sel');
          const isExt = card.dataset.tipo==='externa';
          document.getElementById('ag-cliente-group').style.display = isExt?'':'none';
        });
      });

      // contato select
      document.getElementById('ag-contato')?.addEventListener('change', e=>{
        const box = document.getElementById('ag-novo-contato');
        box.classList.toggle('show', e.target.value==='__novo__');
      });

      // recorrência toggle
      document.getElementById('ag-rec-toggle')?.addEventListener('click', function(){
        this.classList.toggle('on');
        document.getElementById('ag-rec-box').classList.toggle('show', this.classList.contains('on'));
      });

      // dias da semana
      document.querySelectorAll('.ag-day').forEach(btn=>{
        btn.addEventListener('click',()=>btn.classList.toggle('on'));
      });

      // salvar
      document.getElementById('ag-salvar')?.addEventListener('click',()=>salvarEvento(ev));
    }, 50);
  }

  function gerarOpcoesRecFim(atual){
    const d = new Date();
    const opts = [
      { label:'Por 1 mês',   meses:1 },
      { label:'Por 3 meses', meses:3 },
      { label:'Por 6 meses', meses:6 },
      { label:'Por 1 ano',   meses:12 },
    ];
    return opts.map(o=>{
      const fim = new Date(d);
      fim.setMonth(fim.getMonth()+o.meses);
      const val = toDateStr(fim);
      return `<option value="${val}" ${atual===val?'selected':''}>${o.label} (até ${val})</option>`;
    });
  }

  function salvarEvento(evExistente){
    const titulo = document.getElementById('ag-titulo')?.value.trim();
    if(!titulo){ UI.toast('Informe o título do evento.','⚠'); return; }

    const data = document.getElementById('ag-data')?.value;
    if(!data){ UI.toast('Informe a data.','⚠'); return; }

    const tipo = document.querySelector('.ag-type-card.sel')?.dataset.tipo || 'interna';
    const hora = document.getElementById('ag-hora')?.value;
    const horaFim = document.getElementById('ag-horafim')?.value;
    const local = document.getElementById('ag-local')?.value;
    const descricao = document.getElementById('ag-desc')?.value.trim();
    const recorrente = document.getElementById('ag-rec-toggle')?.classList.contains('on');

    let contatoId = null, novoNome = null, novoTel = null, novoEmail = null;

    if(tipo==='externa'){
      const sel = document.getElementById('ag-contato')?.value;
      if(sel && sel!=='__novo__'){
        contatoId = sel;
      } else if(sel==='__novo__'){
        novoNome  = document.getElementById('ag-nc-nome')?.value.trim();
        novoTel   = document.getElementById('ag-nc-tel')?.value.trim();
        novoEmail = document.getElementById('ag-nc-email')?.value.trim();
        if(!novoNome){ UI.toast('Informe o nome do novo contato.','⚠'); return; }

        // criar contato automaticamente
        const novoContato = Store.upsert('contatos',{
          nome: novoNome,
          telefone: novoTel,
          email: novoEmail,
          categoria: 'Outro',
          criadoVia: 'agenda',
        });
        contatoId = novoContato.id;
        novoNome = novoNome; novoTel = novoTel; novoEmail = novoEmail;
      }
    }

    let diasSemana = [], recFim = '';
    if(recorrente){
      diasSemana = [...document.querySelectorAll('.ag-day.on')].map(b=>Number(b.dataset.dow));
      recFim = document.getElementById('ag-rec-fim')?.value || '';
    }

    const obj = {
      ...(evExistente||{}),
      titulo, data, tipo, hora, horaFim, local, descricao,
      recorrente, diasSemana, recFim,
      contatoId: contatoId||null,
      novoNome: novoNome||null, novoTel: novoTel||null, novoEmail: novoEmail||null,
    };

    Store.upsert('agenda_eventos', obj);
    UI.closeModal();
    selDate = data;
    calMonth = parseDate(data).getMonth();
    calYear  = parseDate(data).getFullYear();
    reRender();
    UI.toast('Evento salvo!','✓');
  }

  /* ── Garantir coleção no Store ── */
  function ensureCollection(){
    const s = Store.get();
    if(s && !s.agenda_eventos) { s.agenda_eventos = []; }
  }

  return { render, afterRender: ()=>{ ensureCollection(); afterRender(); } };
})();
