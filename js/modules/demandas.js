/* =====================================================================
   MÓDULO 4 — GESTÃO DE DEMANDAS (Kanban estilo Trello)
   ===================================================================== */
const Demandas = (() => {

  const COLS = [
    { id:'entrada',     label:'Caixa de entrada', cor:'#9aa39c' },
    { id:'analise',     label:'Em análise',       cor:'#2c6fa4' },
    { id:'encaminhado', label:'Encaminhado',      cor:'#7a5cc4' },
    { id:'andamento',   label:'Em andamento',     cor:'#d98e04' },
    { id:'aguardando',  label:'Aguardando retorno',cor:'#c9a44c' },
    { id:'finalizado',  label:'Finalizado',       cor:'#1c7a4d' },
  ];
  const RESP = ['Deuba Assunção','Comunicação','Jurídico','Diretoria','Captação','Equipe'];
  const AREAS = ['Comunicação e Marketing','Eventos','Leilões','Central de Doações','Voluntariado','Relações Institucionais','Parceria Institucional - Sem valoração financeira','Outros'];
  const AREA_COR = {
    'Comunicação e Marketing':                    { bg:'#dbeafe', text:'#1d4ed8' },
    'Eventos':                                    { bg:'#ede9fe', text:'#6d28d9' },
    'Leilões':                                    { bg:'#fef3c7', text:'#92400e' },
    'Central de Doações':                         { bg:'#fee2e2', text:'#b91c1c' },
    'Voluntariado':                               { bg:'#d1fae5', text:'#065f46' },
    'Relações Institucionais':                    { bg:'#fce7f3', text:'#9d174d' },
    'Parceria Institucional - Sem valoração financeira': { bg:'#ffedd5', text:'#9a3412' },
    'Outros':                                     { bg:'#f3f4f6', text:'#374151' },
  };
  function areaBadge(area){
    if(!area) return '';
    const cor = AREA_COR[area] || { bg:'#f3f4f6', text:'#374151' };
    const label = area.length > 22 ? area.slice(0,20)+'…' : area;
    return `<span class="kc-area" style="background:${cor.bg};color:${cor.text}">${label}</span>`;
  }

  let filtroBusca = '';
  let filtroArea  = '';
  const DESPACHO_TIPOS = ['Ciência','Acompanhamento','Deliberação','Orientação'];

  function render(){
    const areas = [...new Set(Store.all('demandas').map(d=>d.areaGestao).filter(Boolean))].sort();
    return `
    <div class="section-head">
      <div><div class="eyebrow">Fluxo de Trabalho</div><h2>Gestão de Demandas</h2>
        <div class="sub">Arraste os cards entre as colunas para mudar o status</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-ghost btn-sm" id="dem-relatorio">📊 Relatório por área</button>
        <button class="btn btn-primary" id="dem-novo">+ Nova demanda</button>
      </div>
    </div>
    ${areaResumoHTML()}
    <div class="dem-filtro-bar">
      <span class="dem-filtro-label">Filtrar por área:</span>
      <button class="dem-filtro-area ${!filtroArea?'ativo':''}" data-area="">Todas</button>
      ${areas.map(a=>{ const cor=AREA_COR[a]||{bg:'#f3f4f6',text:'#374151'};
        return `<button class="dem-filtro-area ${filtroArea===a?'ativo':''}" data-area="${UI.esc(a)}"
          style="${filtroArea===a?`background:${cor.bg};color:${cor.text};border-color:${cor.text}`:''}">
          ${UI.esc(a)}</button>`; }).join('')}
    </div>
    ${filtroBusca ? `<div class="dem-busca-info">🔍 Resultado para "<strong>${UI.esc(filtroBusca)}</strong>" — <a href="#" id="dem-limpar-busca">limpar</a></div>` : ''}
    <div class="kanban" id="kanban">
      ${COLS.map(colHTML).join('')}
    </div>`;
  }

  function colHTML(col){
    const q = filtroBusca.toLowerCase();
    const cards = Store.all('demandas').filter(d=>{
      if(d.coluna !== col.id) return false;
      if(filtroArea && d.areaGestao !== filtroArea) return false;
      if(q){
        const haystack = [d.titulo, d.descricao, d.areaGestao, d.responsavel,
          d.direcionadoPara, d.diretoriaDecisao,
          d.contatoId ? (Store.byId('contatos',d.contatoId)?.nome||'') : '',
          d.projetoId  ? (Store.byId('projetos',d.projetoId)?.nome||'')  : ''
        ].join(' ').toLowerCase();
        if(!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a,b)=>prioRank(a.prioridade)-prioRank(b.prioridade));
    return `<div class="kcol" data-col="${col.id}">
      <div class="kcol-head"><span class="kc-dot" style="background:${col.cor}"></span>
        <span class="kc-title">${col.label}</span><span class="kc-count">${cards.length}</span></div>
      <div class="kcol-body" data-drop="${col.id}">
        ${cards.map(cardHTML).join('')}
      </div>
      <button class="kc-add" data-addcol="${col.id}">+ Adicionar</button>
    </div>`;
  }

  function cardHTML(d){
    const p = d.projetoId?Store.byId('projetos',d.projetoId):null;
    const dd = UI.daysFromNow(d.prazo);
    const atras = dd!==null && dd<0 && d.coluna!=='finalizado';
    const pcls = d.prioridade==='Alta'?'p-alta':d.prioridade==='Média'?'p-media':'p-baixa';
    return `<div class="kcard ${pcls}" draggable="true" data-card="${d.id}">
      <div class="kc-tit">${UI.esc(d.titulo)}</div>
      ${d.areaGestao ? `<div style="margin:4px 0 2px">${areaBadge(d.areaGestao)}</div>` : ''}
      <div class="kc-meta">
        ${UI.prioTag(d.prioridade)}
        ${p?`<span class="tag" style="padding:1px 8px">🎯 ${UI.esc(p.nome)}</span>`:''}
        ${(d.comentarios&&d.comentarios.length)?`<span title="comentários">💬 ${d.comentarios.length}</span>`:''}
        ${(d.anexos&&d.anexos.length)?`<span title="anexos">📎 ${d.anexos.length}</span>`:''}
      </div>
      ${d.prazo?`<div class="kc-foot"><span class="kc-prazo ${atras?'atrasado':''}">${atras?'⚠ ':''}${UI.relativeDays(d.prazo)}</span></div>`:''}
    </div>`;
  }

  function afterRender(){
    document.getElementById('dem-novo').onclick=()=>openForm();
    document.getElementById('dem-relatorio').onclick=()=>abrirRelatorio();
    document.querySelectorAll('[data-addcol]').forEach(b=>b.onclick=()=>openForm(null,b.dataset.addcol));
    document.querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>{
      filtroArea = b.dataset.area;
      App.go('demandas');
    });
    document.getElementById('dem-limpar-busca')?.addEventListener('click', e=>{ e.preventDefault(); filtroBusca=''; App.go('demandas'); });
    bindCards();
    bindDnD();
  }

  function search(q){ filtroBusca = q; filtroArea = ''; App.go('demandas'); }

  function bindCards(){
    document.querySelectorAll('[data-card]').forEach(el=>{
      el.onclick=(e)=>{ if(!el.classList.contains('dragging')) openCard(el.dataset.card); };
    });
  }

  /* ---------- Drag & Drop ---------- */
  let dragId=null;
  function bindDnD(){
    document.querySelectorAll('.kcard').forEach(card=>{
      card.addEventListener('dragstart',()=>{ dragId=card.dataset.card; card.classList.add('dragging'); });
      card.addEventListener('dragend',()=>{ card.classList.remove('dragging'); dragId=null; document.querySelectorAll('.drop-hl').forEach(x=>x.classList.remove('drop-hl')); });
    });
    document.querySelectorAll('[data-drop]').forEach(zone=>{
      zone.addEventListener('dragover',e=>{ e.preventDefault(); zone.classList.add('drop-hl'); });
      zone.addEventListener('dragleave',()=>zone.classList.remove('drop-hl'));
      zone.addEventListener('drop',e=>{
        e.preventDefault(); zone.classList.remove('drop-hl');
        if(!dragId) return;
        const d=Store.byId('demandas',dragId);
        if(d && d.coluna!==zone.dataset.drop){
          d.coluna=zone.dataset.drop;
          Store.upsert('demandas',d);
          if(d.coluna==='finalizado') UI.toast('Demanda finalizada ✓');
          App.go('demandas');
        }
      });
    });
  }

  /* ---------- Detalhe (card expandido) ---------- */
  let curId=null, curTab='detalhe';
  function openCard(id){
    const d=Store.byId('demandas',id);
    if(!d) return UI.toast('Demanda não encontrada','⚠');
    curId=id; curTab='detalhe';
    UI.openModal('Demanda', detailHTML(d), true);
    bindDetail();
  }

  function detailHTML(d){
    const c=d.contatoId?Store.byId('contatos',d.contatoId):null;
    const p=d.projetoId?Store.byId('projetos',d.projetoId):null;
    const dd=UI.daysFromNow(d.prazo);
    const atras=dd!==null&&dd<0&&d.coluna!=='finalizado';
    return `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:6px">
      <div style="flex:1">
        <div class="fh-tags" style="margin-bottom:8px">
          ${UI.prioTag(d.prioridade)}
          <span class="tag tag-green">${UI.esc(colLabel(d.coluna))}</span>
          ${d.prazo?`<span class="tag ${atras?'tag-red':''}">📅 ${UI.fmtDate(d.prazo)} ${atras?'(atrasada)':''}</span>`:''}
        </div>
        <h2 style="font-family:var(--serif);font-size:21px;color:var(--green-800)">${UI.esc(d.titulo)}</h2>
      </div>
    </div>
    <div class="info-grid" style="margin-top:14px">
      <div class="info-item"><div class="il">Responsável</div><div class="iv">👤 ${UI.esc(d.responsavel||'—')}</div></div>
      <div class="info-item"><div class="il">Mover para</div><div class="iv">
        <select id="dem-move" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:5px">${COLS.map(co=>`<option value="${co.id}" ${d.coluna===co.id?'selected':''}>${co.label}</option>`).join('')}</select>
      </div></div>
      ${d.areaGestao?`<div class="info-item"><div class="il">Área de gestão</div><div class="iv">${UI.esc(d.areaGestao)}</div></div>`:''}
      ${d.direcionadoPara?`<div class="info-item"><div class="il">Direcionada para</div><div class="iv">👤 ${UI.esc(d.direcionadoPara)}${d.dataDelegacao?` <span class="muted" style="font-size:11px">(${UI.fmtDate(d.dataDelegacao)})</span>`:''}</div></div>`:''}
      ${d.diretoriaDecisao?`<div class="info-item"><div class="il">Decisão — Diretoria</div><div class="iv">${UI.esc(d.diretoriaDecisao)}</div></div>`:''}
      ${c?`<div class="info-item"><div class="il">Relacionamento</div><div class="iv" style="cursor:pointer;color:var(--green-700)" data-gocontato="${c.id}">${UI.esc(c.nome)} →</div></div>`:''}
      ${p?`<div class="info-item"><div class="il">Projeto</div><div class="iv" style="cursor:pointer;color:var(--green-700)" data-goproj="${p.id}">${UI.esc(p.nome)} →</div></div>`:''}
    </div>

    <!-- Despacho com as Diretorias -->
    <div class="dem-section">
      <h4>🗣️ Despacho com as Diretorias</h4>
      <div class="desp-dirs-wrap">
        ${Despacho.DIR_KEYS.map(dir => {
          const cfg = Despacho.DIRS[dir];
          const dd  = Despacho.getDirData(d, dir);
          const st  = dd ? (dd.finalizado ? 'finalizado' : dd.realizado ? 'andamento' : 'pendente') : null;
          const stLabel = { pendente:'⏳ A despachar', andamento:'🔄 Em andamento', finalizado:'✅ Finalizado' };
          return `
          <div class="desp-dir-box" style="border-color:${cfg.border};background:${dd?cfg.bg:'#f9fafb'}">
            <div class="desp-dir-box-header" style="color:${cfg.text}">${cfg.ico} ${cfg.label}</div>
            ${dd ? `
              <div class="desp-dir-box-status">${stLabel[st]||''}</div>
              <div class="desp-dir-box-meta">Tipo: <b>${UI.esc(dd.tipo||'—')}</b> · ${dd.data?UI.fmtDate(dd.data):'—'}</div>
              <div class="desp-dir-box-actions">
                <button class="btn btn-ghost btn-sm" data-despacho-ver="${dir}">Ver pautas</button>
                <button class="btn btn-ghost btn-sm" data-despacho-rem="${dir}">Retirar</button>
              </div>` : `
              <div class="desp-dir-box-meta" style="color:#9ca3af;font-size:12px">Não enviada para esta diretoria</div>
              <button class="btn btn-sm desp-dir-enviar" data-despacho-env="${dir}"
                style="background:${cfg.text};color:#fff;margin-top:6px">📤 Enviar</button>`}
          </div>`;
        }).join('')}
      </div>
    </div>
    ${d.descricao?`<div class="dem-section"><h4>📝 Descrição</h4><div style="font-size:13.5px;color:var(--gray-700);line-height:1.6">${UI.esc(d.descricao)}</div></div>`:''}

    <!-- IA / geração automática -->
    <div class="dem-section">
      <h4>✨ Geração automática</h4>
      <div class="ai-actions">
        <button class="btn btn-ghost btn-sm" data-gen="resumo">Gerar resumo</button>
        <button class="btn btn-ghost btn-sm" data-gen="mensagem">Gerar mensagem (WhatsApp)</button>
        <button class="btn btn-ghost btn-sm" data-gen="email">Gerar e-mail</button>
        <button class="btn btn-ghost btn-sm" data-gen="encaminhamento">Gerar encaminhamento</button>
      </div>
      <div id="gen-out"></div>
    </div>

    <!-- Anexos -->
    <div class="dem-section">
      <h4>📎 Anexos <span class="muted" style="font-size:11px;font-weight:400">(Word, Excel, PowerPoint, PDF, fotos — até 4MB cada)</span></h4>
      <div id="dem-anexos">${(d.anexos||[]).map(anexoItemHTML).join('')||'<div class="muted" style="font-size:13px">Nenhum anexo.</div>'}</div>
      <input type="file" id="anexo-file" multiple accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,image/*" style="display:none">
      <button type="button" class="btn btn-ghost btn-sm" id="anexo-add" style="margin-top:8px">📎 Anexar arquivos</button>
    </div>

    <!-- Comentários -->
    <div class="dem-section">
      <h4>💬 Comentários</h4>
      <div id="dem-coments">${(d.comentarios||[]).map(comentHTML).join('')||'<div class="muted" style="font-size:13px">Sem comentários.</div>'}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="coment-in" placeholder="Escreva ou dite um comentário…" style="flex:1;padding:9px 12px;border:1px solid var(--line);border-radius:9px">
        ${UI.mic('coment-in')}
        <button class="btn btn-primary btn-sm" id="coment-add">Comentar</button>
      </div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:14px;border-top:1px solid var(--line)">
      <button class="btn btn-danger btn-sm" data-del>Excluir demanda</button>
      <button class="btn btn-ghost btn-sm" data-edit>✎ Editar</button>
    </div>`;
  }

  function comentHTML(cm){
    return `<div class="comment"><div class="c-av">${UI.initials(cm.autor)}</div>
      <div class="c-body"><div class="c-head"><b>${UI.esc(cm.autor)}</b> · ${UI.fmtDate(cm.data)}</div>
      <div class="c-text">${UI.esc(cm.texto)}</div></div></div>`;
  }

  function bindDetail(){
    const d=Store.byId('demandas',curId);
    document.getElementById('dem-move').onchange=(e)=>{ d.coluna=e.target.value; Store.upsert('demandas',d); UI.toast('Status atualizado'); App.refresh(); };
    document.querySelector('[data-gocontato]')?.addEventListener('click',e=>{ UI.closeModal(); App.go('relacionamentos'); Relacionamentos.openFicha(e.target.dataset.gocontato); });
    document.querySelector('[data-goproj]')?.addEventListener('click',e=>{ UI.closeModal(); App.go('projetos'); window.Projetos?.openFicha?.(e.target.dataset.goproj); });
    document.querySelector('[data-del]').onclick=()=>UI.confirmAction('Excluir esta demanda?',()=>{ Store.remove('demandas',curId); UI.closeModal(); UI.toast('Demanda excluída'); App.refresh(); });
    document.querySelector('[data-edit]').onclick=()=>openForm(curId);

    // anexos (arquivos reais)
    const anexoFile=document.getElementById('anexo-file');
    document.getElementById('anexo-add').onclick=()=>anexoFile.click();
    anexoFile.onchange=()=>{
      if(!anexoFile.files.length) return;
      d.anexos=d.anexos||[];
      pushFiles(anexoFile.files, d.anexos, (n)=>{ Store.upsert('demandas',d); if(n) UI.toast(n+' anexo(s) adicionado(s) ✓'); refreshDetail(); });
      anexoFile.value='';
    };
    document.querySelectorAll('[data-delanexo]').forEach(b=>b.onclick=()=>{ d.anexos.splice(+b.dataset.delanexo,1); Store.upsert('demandas',d); refreshDetail(); });

    // comentários
    document.getElementById('coment-add').onclick=()=>{
      const v=document.getElementById('coment-in').value.trim(); if(!v) return;
      d.comentarios=d.comentarios||[]; d.comentarios.push({autor:'Deuba Assunção',texto:v,data:new Date().toISOString().slice(0,10)});
      Store.upsert('demandas',d); refreshDetail();
    };
    document.getElementById('coment-in').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('coment-add').click(); });

    // despacho — enviar para uma diretoria
    document.querySelectorAll('[data-despacho-env]').forEach(b => b.onclick = () => {
      const dir = b.dataset.despachoEnv;
      const cfg = Despacho.DIRS[dir];
      UI.openModal(`Enviar para ${cfg.label}`, `
        <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:10px 14px;margin-bottom:14px">
          <div style="font-weight:700;color:${cfg.text}">${cfg.ico} ${cfg.label}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${UI.esc(d.titulo)}</div>
        </div>
        <div class="field"><label>Finalidade do despacho</label>
          <select id="desp-tipo">${DESPACHO_TIPOS.map(t=>`<option>${t}</option>`).join('')}</select></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
          <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="desp-ok" style="background:${cfg.text}">Adicionar à pauta</button>
        </div>`);
      document.getElementById('desp-ok').onclick = () => {
        Despacho.enviarParaDiretoria(d, dir, document.getElementById('desp-tipo').value);
        Store.upsert('demandas', d);
        UI.closeModal();
        UI.toast(`Adicionada à pauta da ${cfg.label} ✓`);
        refreshDetail();
      };
    });

    // despacho — ver lista
    document.querySelectorAll('[data-despacho-ver]').forEach(b => b.onclick = () => {
      UI.closeModal(); App.go('despacho');
    });

    // despacho — retirar de uma diretoria
    document.querySelectorAll('[data-despacho-rem]').forEach(b => b.onclick = () => {
      const dir = b.dataset.despachoRem;
      const cfg = Despacho.DIRS[dir];
      UI.confirmAction(`Retirar esta pauta da ${cfg.label}?`, () => {
        Despacho.retirarDeDiretoria(d, dir);
        Store.upsert('demandas', d);
        UI.toast(`Retirada da pauta da ${cfg.label}`);
        refreshDetail();
      });
    });

    // geração automática
    document.querySelectorAll('[data-gen]').forEach(b=>b.onclick=()=>{
      const txt=gerar(b.dataset.gen,d);
      document.getElementById('gen-out').innerHTML=`<div class="gen-box">${UI.esc(txt)}</div>
        <div class="ai-actions"><button class="btn btn-gold btn-sm" id="gen-copy">📋 Copiar</button></div>`;
      document.getElementById('gen-copy').onclick=()=>{ navigator.clipboard?.writeText(txt); UI.toast('Copiado para a área de transferência'); };
    });
  }
  function refreshDetail(){ const d=Store.byId('demandas',curId); document.getElementById('modal-body').innerHTML=detailHTML(d); bindDetail(); App.refresh?.(); }

  /* ---------- Geração automática (templates) ---------- */
  function gerar(tipo,d){
    const c=d.contatoId?Store.byId('contatos',d.contatoId):null;
    const p=d.projetoId?Store.byId('projetos',d.projetoId):null;
    const nome=c?c.nome:'(contato)';
    const primeiro=c?c.nome.split(' ').slice(-1)[0]:'';
    if(tipo==='resumo'){
      return `RESUMO EXECUTIVO — ${d.titulo}\n\n`+
        `Status atual: ${colLabel(d.coluna)}\nPrioridade: ${d.prioridade}\nResponsável: ${d.responsavel||'—'}\n`+
        `Prazo: ${d.prazo?UI.fmtDate(d.prazo):'não definido'}\n`+
        (c?`Relacionamento envolvido: ${nome} (${c.cargo||c.categoria})\n`:'')+
        (p?`Projeto vinculado: ${p.nome}\n`:'')+
        `\nDescrição: ${d.descricao||'—'}\n`+
        (d.comentarios?.length?`\nÚltimo registro: ${d.comentarios[d.comentarios.length-1].texto}`:'');
    }
    if(tipo==='mensagem'){
      return `Olá, ${primeiro||'tudo bem'}! Aqui é a Deuba Assunção, da Gerência de Relações Institucionais do Araújo Jorge — Hospital de Câncer.\n\n`+
        `Passando para alinhar sobre "${d.titulo}". ${d.descricao?d.descricao+' ':''}`+
        `Podemos conversar nos próximos dias? Seu apoio é muito importante para fortalecermos essa parceria.\n\nGrande abraço!`;
    }
    if(tipo==='email'){
      return `Assunto: ${d.titulo} — Araújo Jorge / Relações Institucionais\n\n`+
        `Prezado(a) ${nome},\n\n`+
        `Espero que esteja bem. Escrevo em nome da Gerência de Relações Institucionais do Hospital de Câncer Araújo Jorge a respeito de "${d.titulo}".\n\n`+
        `${d.descricao||''}\n\n`+
        `Acreditamos que sua colaboração será fundamental — afinal, captação não é pedido, é construção de rede. Coloco-me à disposição para uma conversa.\n\n`+
        `Cordialmente,\nDeuba Assunção\nGerência de Relações Institucionais\nAraújo Jorge — Hospital de Câncer`;
    }
    if(tipo==='encaminhamento'){
      return `ENCAMINHAMENTO INTERNO\n\nDemanda: ${d.titulo}\nEncaminhar para: ${d.responsavel||'(definir)'}\nPrioridade: ${d.prioridade}\nPrazo sugerido: ${d.prazo?UI.fmtDate(d.prazo):'a definir'}\n\n`+
        `Orientação: ${d.descricao||'Dar andamento conforme alinhamento.'}\n`+
        (c?`Contato de referência: ${nome} — ${c.whatsapp||c.email||''}`:'');
    }
    return '';
  }

  /* ---------- Form ---------- */
  function openForm(id,colInicial){
    const d=id?Store.byId('demandas',id):{coluna:colInicial||'entrada',prioridade:'Média',responsavel:'Deuba Assunção'};
    const areaInList = !d.areaGestao || AREAS.includes(d.areaGestao);
    UI.openModal(id?'Editar demanda':'Nova demanda',`
      <form id="dem-form">
        <input type="hidden" name="id" value="${d.id||''}">
        <div class="field"><label>Título *</label><input name="titulo" required value="${UI.esc(d.titulo||'')}"></div>
        <div class="field"><label>Descrição ${UI.mic('dem-desc')}</label><textarea id="dem-desc" name="descricao">${UI.esc(d.descricao||'')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Coluna / Status</label><select name="coluna">${COLS.map(co=>`<option value="${co.id}" ${d.coluna===co.id?'selected':''}>${co.label}</option>`).join('')}</select></div>
          <div class="field"><label>Prioridade</label><select name="prioridade">${['Alta','Média','Baixa'].map(x=>`<option ${d.prioridade===x?'selected':''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Responsável</label><select name="responsavel">${RESP.map(x=>`<option ${d.responsavel===x?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>Prazo</label><input name="prazo" type="date" value="${d.prazo||''}"></div>
        </div>

        <div class="field"><label>Área de gestão <span class="muted" style="font-weight:400">(qual área mais demanda)</span></label>
          <select name="areaGestao" id="dem-area">${AREAS.map(a=>`<option ${(areaInList?d.areaGestao===a:a==='Outros')?'selected':''}>${a}</option>`).join('')}</select>
        </div>
        <div class="field" id="dem-area-outro-wrap" style="display:${areaInList?'none':'block'}"><label>Descreva a área</label><input name="areaGestaoOutro" value="${UI.esc(areaInList?'':(d.areaGestao||''))}"></div>

        <div class="field-row">
          <div class="field"><label>Direcionada para <span class="muted" style="font-weight:400">(equipe)</span></label><input name="direcionadoPara" value="${UI.esc(d.direcionadoPara||'')}" placeholder="Nome da pessoa da equipe"></div>
          <div class="field"><label>Data do direcionamento</label><input name="dataDelegacao" type="date" value="${d.dataDelegacao||''}"></div>
        </div>
        <div class="field"><label>Processo decisório — Diretoria <span class="muted" style="font-weight:400">(quem delibera)</span></label><input name="diretoriaDecisao" value="${UI.esc(d.diretoriaDecisao||'')}" placeholder="Ex.: Diretoria Executiva / Diretoria Técnica"></div>

        <div class="field-row">
          <div class="field"><label>Relacionamento vinculado</label><select name="contatoId"><option value="">—</option>${Store.all('contatos').map(c=>`<option value="${c.id}" ${d.contatoId===c.id?'selected':''}>${UI.esc(c.nome)}</option>`).join('')}</select></div>
          <div class="field"><label>Projeto vinculado</label><select name="projetoId"><option value="">—</option>${Store.all('projetos').map(p=>`<option value="${p.id}" ${d.projetoId===p.id?'selected':''}>${UI.esc(p.nome)}</option>`).join('')}</select></div>
        </div>

        <div class="field"><label>Anexos <span class="muted" style="font-weight:400">(Word, Excel, PowerPoint, PDF, fotos — até 4MB cada)</span></label>
          <div id="form-anexos-list" style="margin-bottom:8px"></div>
          <input type="file" id="form-anexo-file" multiple accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,image/*" style="display:none">
          <button type="button" class="btn btn-ghost btn-sm" id="form-anexo-btn">📎 Adicionar arquivos</button>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>`);

    // anexos do formulário (lista temporária)
    const formAnexos = id ? ((Store.byId('demandas',id).anexos)||[]).slice() : [];
    const renderFormAnexos=()=>{
      const box=document.getElementById('form-anexos-list');
      box.innerHTML = formAnexos.length ? formAnexos.map(anexoItemHTML).join('') : '<div class="muted" style="font-size:12.5px">Nenhum anexo.</div>';
      box.querySelectorAll('[data-delanexo]').forEach(b=>b.onclick=()=>{ formAnexos.splice(+b.dataset.delanexo,1); renderFormAnexos(); });
    };
    renderFormAnexos();
    const ffile=document.getElementById('form-anexo-file');
    document.getElementById('form-anexo-btn').onclick=()=>ffile.click();
    ffile.onchange=()=>{ if(!ffile.files.length) return; pushFiles(ffile.files, formAnexos, (n)=>{ if(n) UI.toast(n+' anexo(s) prontos'); renderFormAnexos(); }); ffile.value=''; };

    const areaSel=document.getElementById('dem-area');
    areaSel.onchange=()=>{ document.getElementById('dem-area-outro-wrap').style.display=areaSel.value==='Outros'?'block':'none'; };
    document.getElementById('dem-form').onsubmit=(e)=>{
      e.preventDefault();
      const data=UI.readForm(e.target);
      if(data.areaGestao==='Outros' && data.areaGestaoOutro) data.areaGestao=data.areaGestaoOutro.trim();
      delete data.areaGestaoOutro;
      if(!data.id){ delete data.id; data.comentarios=[]; data.anexos=formAnexos; }
      else { const old=Store.byId('demandas',data.id); data.comentarios=old.comentarios||[]; data.anexos=formAnexos;
             data.despacho=old.despacho; data.despachoTipo=old.despachoTipo; data.despachoData=old.despachoData;
             data.despachoAlinhada=old.despachoAlinhada; data.despachoAlinhadaData=old.despachoAlinhadaData; }
      const saved=Store.upsert('demandas',data);
      UI.toast(id?'Demanda atualizada':'Demanda criada');
      App.go('demandas');
      openCard(saved.id);
    };
  }

  function areaResumoHTML(){
    const m={};
    Store.all('demandas').forEach(d=>{ if(d.areaGestao) m[d.areaGestao]=(m[d.areaGestao]||0)+1; });
    const arr=Object.entries(m).sort((a,b)=>b[1]-a[1]);
    if(!arr.length) return '';
    const max=arr[0][1];
    return `<div class="card card-pad" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="eyebrow">Demandas por área de gestão</span>
        <span class="tag tag-gold">Mais demanda: ${UI.esc(arr[0][0])}</span></div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${arr.map(([a,n])=>`<div style="display:flex;align-items:center;gap:10px">
          <span style="width:170px;font-size:12.5px;color:var(--gray-600);flex-shrink:0">${UI.esc(a)}</span>
          <div class="progress" style="flex:1;margin:0"><span style="width:${Math.round(n/max*100)}%"></span></div>
          <strong style="font-size:13px;color:var(--green-700);width:24px;text-align:right">${n}</strong>
        </div>`).join('')}
      </div>
    </div>`;
  }

  /* ---------- Anexos (arquivos reais) ---------- */
  const MAX_ANEXO = 4*1024*1024; // 4 MB por arquivo
  function humanSize(b){ if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(0)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
  function fileIcon(name='',type=''){
    const n=(name+' '+type).toLowerCase();
    if(/(image|png|jpg|jpeg|gif|webp|bmp|heic)/.test(n)) return '🖼️';
    if(/(word|\.docx?|document)/.test(n)) return '📝';
    if(/(excel|sheet|\.xlsx?|\.csv)/.test(n)) return '📊';
    if(/(powerpoint|presentation|\.pptx?)/.test(n)) return '📑';
    if(/(pdf)/.test(n)) return '📕';
    return '📎';
  }
  function pushFiles(fileList, arr, done){
    let pending=0; let added=0;
    Array.from(fileList).forEach(f=>{
      if(f.size>MAX_ANEXO){ UI.toast(`"${f.name}" excede 4MB e não foi anexado`,'⚠'); return; }
      pending++;
      const r=new FileReader();
      r.onload=()=>{ arr.push({name:f.name,type:f.type,size:f.size,data:r.result,addedAt:Date.now()}); added++; if(--pending===0) done&&done(added); };
      r.onerror=()=>{ if(--pending===0) done&&done(added); };
      r.readAsDataURL(f);
    });
    if(pending===0) done&&done(0);
  }
  function anexoItemHTML(a,i){
    if(typeof a==='string') return `<div class="attach-item"><span class="ai-ico">📄</span><span style="flex:1">${UI.esc(a)}</span><button type="button" class="mini-btn" data-delanexo="${i}">✕</button></div>`;
    return `<div class="attach-item"><span class="ai-ico">${fileIcon(a.name,a.type)}</span>
      <a href="${a.data}" download="${UI.esc(a.name)}" style="flex:1;color:var(--green-700);text-decoration:none" title="Baixar / abrir">${UI.esc(a.name)}</a>
      <span class="muted" style="font-size:11px;margin-right:4px">${humanSize(a.size)}</span>
      <button type="button" class="mini-btn" data-delanexo="${i}" title="Remover">✕</button></div>`;
  }

  const prioRank=(p)=>({Alta:0,'Média':1,Baixa:2}[p]??1);
  const colLabel=(c)=>COLS.find(x=>x.id===c)?.label||c;
  const resc=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ── Relatório por área ── */
  function abrirRelatorio(){
    const todas = Store.all('demandas');
    const areas = [...new Set(todas.map(d=>d.areaGestao).filter(Boolean))].sort();
    if(!areas.length){ UI.toast('Nenhuma demanda com área cadastrada','⚠'); return; }

    UI.openModal('Relatório por Área de Gestão', `
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">Selecione as áreas que deseja incluir no relatório:</p>
      <div style="display:flex;flex-direction:column;gap:8px" id="rel-areas">
        ${areas.map(a => {
          const cor = AREA_COR[a]||{bg:'#f3f4f6',text:'#374151'};
          const n = todas.filter(d=>d.areaGestao===a).length;
          return `<label class="desp-pdf-op">
            <input type="checkbox" class="rel-area-chk" value="${resc(a)}" checked>
            <span class="desp-pdf-label">
              <span style="background:${cor.bg};color:${cor.text};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700">${resc(a)}</span>
              <span style="color:var(--muted);font-size:12px">${n} demanda${n!==1?'s':''}</span>
            </span>
          </label>`;
        }).join('')}
      </div>
      <div class="field" style="margin-top:14px">
        <label>Status a incluir</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
          ${COLS.map(co=>`<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer">
            <input type="checkbox" class="rel-col-chk" value="${co.id}" checked> ${co.label}</label>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="rel-imprimir">📊 Gerar relatório</button>
      </div>
    `);

    setTimeout(()=>{
      document.getElementById('rel-imprimir')?.addEventListener('click',()=>{
        const areasSel = [...document.querySelectorAll('.rel-area-chk:checked')].map(c=>c.value);
        const colsSel  = [...document.querySelectorAll('.rel-col-chk:checked')].map(c=>c.value);
        if(!areasSel.length || !colsSel.length){ UI.toast('Selecione ao menos uma área e um status','⚠'); return; }
        UI.closeModal();
        gerarRelatorio(areasSel, colsSel);
      });
    }, 50);
  }

  function gerarRelatorio(areasSel, colsSel){
    const hoje = UI.fmtDate(new Date().toISOString());
    const todas = Store.all('demandas');

    const secoes = areasSel.map(area => {
      const cor = AREA_COR[area]||{bg:'#f3f4f6',text:'#374151'};
      const demandas = todas.filter(d=>d.areaGestao===area && colsSel.includes(d.coluna))
        .sort((a,b)=>prioRank(a.prioridade)-prioRank(b.prioridade));
      if(!demandas.length) return '';

      const rows = demandas.map((d,i) => {
        const c = d.contatoId ? Store.byId('contatos',d.contatoId) : null;
        const p = d.projetoId ? Store.byId('projetos',d.projetoId)  : null;
        const atras = d.prazo && UI.daysFromNow(d.prazo)<0 && d.coluna!=='finalizado';
        return `<tr>
          <td class="num">${i+1}</td>
          <td>
            <strong>${resc(d.titulo)}</strong>
            ${d.descricao?fmtDesc(d.descricao):''}
            ${c?`<div class="meta">👤 ${resc(c.nome)}</div>`:''}
            ${p?`<div class="meta">🎯 ${resc(p.nome)}</div>`:''}
          </td>
          <td style="white-space:nowrap">${resc(d.prioridade)}</td>
          <td style="white-space:nowrap">${resc(colLabel(d.coluna))}</td>
          <td style="white-space:nowrap;${atras?'color:#b91c1c;font-weight:700':''}">${d.prazo?resc(UI.fmtDate(d.prazo)):'—'}</td>
        </tr>`;
      }).join('');

      return `<tr><td colspan="5" class="area-header" style="background:${cor.bg};color:${cor.text}">${resc(area)} <span style="font-weight:400;font-size:11px">(${demandas.length} demanda${demandas.length!==1?'s':''})</span></td></tr>
        ${rows}`;
    }).join('');

    if(!secoes.trim()){ UI.toast('Nenhuma demanda encontrada com os filtros selecionados','⚠'); return; }

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório de Demandas — ${hoje}</title>
      <style>
        *{font-family:Georgia,'Times New Roman',serif;color:#1a201c;box-sizing:border-box}
        body{margin:40px;font-size:12px}
        h1{font-size:18px;color:#8a3a5e;margin:0 0 2px}
        .sub{color:#6b746d;font-size:11px;margin-bottom:14px}
        .quote{font-style:italic;color:#b14a78;border-left:3px solid #c9a44c;padding:4px 12px;margin:10px 0 16px;font-size:11px}
        table{width:100%;border-collapse:collapse;margin-bottom:4px}
        th,td{border:1px solid #ecccdb;padding:7px 9px;vertical-align:top;text-align:left}
        th{background:#fbe9f0;color:#8a3a5e;font-size:11px}
        .area-header{font-weight:700;font-size:12px;padding:7px 10px;border-top:2px solid #c9a44c}
        .num{width:26px;text-align:center;color:#6b746d}
        .obs{color:#3a3a3a;font-size:11px;margin-top:4px;font-family:Arial,sans-serif;line-height:1.5}
        ul.obs{margin:4px 0 2px 16px;padding:0}
        ul.obs li{margin-bottom:1px}
        .meta{color:#6b746d;font-size:10.5px;margin-top:2px;font-family:Arial,sans-serif}
        .foot{margin-top:20px;font-size:10px;color:#9aa39c;border-top:1px solid #e2e6e3;padding-top:8px}
        @media print{body{margin:15mm 18mm}}
      </style></head><body>
      <h1>Relatório de Demandas por Área de Gestão</h1>
      <div class="sub">Gerência de Relações Institucionais · Araújo Jorge — Hospital de Câncer · ${hoje}</div>
      <div class="quote">"Captação não é pedido. É construção de rede."</div>
      <table>
        <thead><tr><th class="num">#</th><th>Demanda</th><th>Prioridade</th><th>Status</th><th>Prazo</th></tr></thead>
        <tbody>${secoes}</tbody>
      </table>
      <div class="foot">Documento gerado pelo Sistema de Gestão de Relacionamento — © DAS · Deuba Assunção · ${hoje}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`;

    const w = window.open('','_blank');
    if(!w){ UI.toast('Permita pop-ups para gerar o relatório','⚠'); return; }
    w.document.write(html); w.document.close();
  }

  function fmtDesc(txt){
    if(!txt) return '';
    const linhas = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const temLista = linhas.some(l=>/^[-•*·\d+\.]/.test(l));
    if(temLista){
      const itens = linhas.map(l=>`<li>${resc(l.replace(/^[-•*·]\s*/,'').replace(/^\d+[\.\)]\s*/,''))}</li>`).join('');
      return `<ul class="obs">${itens}</ul>`;
    }
    return `<div class="obs">${linhas.map(l=>resc(l)).join('<br>')}</div>`;
  }

  return { render, afterRender, openCard, openForm, search };
})();
