/* =====================================================================
   MÓDULO 5 — PROJETOS ESTRATÉGICOS
   Leilão do Bem · Risoto Solidário · Modernização da Radioterapia …
   ===================================================================== */
const Projetos = (() => {

  const CATEGORIAS = ['Captação','Evento','Obra/Equipamento','Campanha','Projeto Institucional','Relacionamento Governamental','Outros'];
  const STATUS = ['Planejamento','Captação','Em andamento','Concluído','Pausado'];
  const ICONS = {'Captação':'💰','Evento':'🎟️','Obra/Equipamento':'🏗️','Campanha':'📣','Projeto Institucional':'🏛️','Relacionamento Governamental':'🤝'};

  function render(){
    const projetos = Store.all('projetos');
    const totMeta = projetos.reduce((s,p)=>s+(p.meta||0),0);
    const totCap = projetos.reduce((s,p)=>s+(p.captado||0),0);
    return `
    <div class="section-head">
      <div><div class="eyebrow">Articulação & Captação</div><h2>Projetos Estratégicos</h2></div>
      <button class="btn btn-primary" id="pj-novo">+ Novo projeto</button>
    </div>
    <div class="kpi-grid">
      ${kpi('🎯','',projetos.filter(p=>p.status!=='Concluído').length,'Projetos ativos')}
      ${kpi('💰','gold',UI.brl(totCap),'Total captado')}
      ${kpi('🎯','blue',UI.brl(totMeta),'Meta global')}
      ${kpi('📊','',totMeta?Math.round(totCap/totMeta*100)+'%':'0%','Atingimento das metas')}
    </div>
    <div class="proj-grid">
      ${projetos.length?projetos.map(cardHTML).join(''):`<div class="empty" style="grid-column:1/-1"><div class="big">🎯</div>Nenhum projeto cadastrado</div>`}
    </div>`;
  }

  function cardHTML(p){
    const perc=p.meta?Math.min(100,Math.round(p.captado/p.meta*100)):0;
    const parceiros=[...new Set([...(p.parceiros||[]),...(p.patrocinadores||[])])].map(id=>Store.byId('contatos',id)).filter(Boolean);
    return `<div class="project-card" data-proj="${p.id}">
      <div class="pj-banner" style="background:${p.cor||'var(--green-700)'}">
        <span class="pj-icon">${ICONS[p.categoria]||'🎯'}</span>
        <div><div class="pj-cat">${UI.esc(p.categoria)}</div><div class="pj-name">${UI.esc(p.nome)}</div></div>
      </div>
      <div class="pj-body">
        <div class="pj-desc">${UI.esc(p.descricao||'')}</div>
        <div class="pj-cap-row"><span class="muted">Captado</span><b>${UI.brl(p.captado)}</b></div>
        <div class="progress ${p.categoria==='Captação'?'gold':''}"><span style="width:${perc}%"></span></div>
        <div class="pj-cap-row" style="margin-top:6px"><span class="muted">Meta: ${UI.brl(p.meta)}</span><span style="font-weight:700;color:var(--green-700)">${perc}%</span></div>
        <div class="pj-foot">
          <span class="tag tag-green">${UI.esc(p.status)}</span>
          <div class="avatar-stack">${parceiros.slice(0,4).map(c=>UI.avatar(c,28)).join('')}${parceiros.length>4?`<span class="tag" style="margin-left:-8px">+${parceiros.length-4}</span>`:''}</div>
        </div>
      </div>
    </div>`;
  }

  function afterRender(){
    document.getElementById('pj-novo').onclick=()=>openForm();
    document.querySelectorAll('[data-proj]').forEach(el=>el.onclick=()=>openFicha(el.dataset.proj));
  }

  /* ---------------- FICHA ---------------- */
  let curId=null, curTab='visao';
  function openFicha(id){
    const p=Store.byId('projetos',id);
    if(!p) return UI.toast('Projeto não encontrado','⚠');
    curId=id; curTab='visao';
    UI.openModal(' ', fichaHTML(p), true);
    bindFicha();
  }

  function fichaHTML(p){
    const perc=p.meta?Math.min(100,Math.round(p.captado/p.meta*100)):0;
    const demandas=Store.all('demandas').filter(d=>d.projetoId===p.id);
    const marcosFeitos=(p.marcos||[]).filter(m=>m.feito).length;
    return `
    <div class="ficha-head" style="border:none;padding-bottom:8px">
      <div style="width:56px;height:56px;border-radius:15px;display:grid;place-items:center;font-size:28px;background:${p.cor||'var(--green-700)'};color:#fff">${ICONS[p.categoria]||'🎯'}</div>
      <div class="fh-id">
        <h2>${UI.esc(p.nome)}</h2>
        <div class="fh-cargo">${UI.esc(p.categoria)}</div>
        <div class="fh-tags"><span class="tag tag-green">${UI.esc(p.status)}</span>
          <span class="tag">📅 ${UI.fmtDate(p.inicio)} → ${UI.fmtDate(p.fim)}</span></div>
      </div>
    </div>
    <div class="ficha-actions">
      <button class="btn btn-primary btn-sm" data-pa="demanda">+ Demanda</button>
      <button class="btn btn-gold btn-sm" data-pa="captacao">💰 Registrar captação</button>
      <button class="btn btn-ghost btn-sm" data-pa="editar">✎ Editar</button>
      <button class="btn btn-danger btn-sm" data-pa="excluir" style="margin-left:auto">Excluir</button>
    </div>
    <div class="pj-stat-grid">
      <div class="pj-stat"><div class="ps-v">${UI.brl(p.captado)}</div><div class="ps-l">Captado</div></div>
      <div class="pj-stat"><div class="ps-v">${perc}%</div><div class="ps-l">da meta (${UI.brl(p.meta)})</div></div>
      <div class="pj-stat"><div class="ps-v">${marcosFeitos}/${(p.marcos||[]).length}</div><div class="ps-l">Marcos concluídos</div></div>
      <div class="pj-stat"><div class="ps-v">${demandas.length}</div><div class="ps-l">Demandas</div></div>
    </div>
    <div class="progress ${p.categoria==='Captação'?'gold':''}" style="height:10px"><span style="width:${perc}%"></span></div>

    <div class="ficha-tabs" style="margin-top:18px">
      <span class="ficha-tab active" data-tab="visao">Visão geral</span>
      <span class="ficha-tab" data-tab="cronograma">Cronograma</span>
      <span class="ficha-tab" data-tab="rede">Parceiros & Patrocinadores</span>
      <span class="ficha-tab" data-tab="contas">Prestação de contas</span>
    </div>
    <div id="pj-content">${tabVisao(p)}</div>`;
  }

  function tabVisao(p){
    const demandas=Store.all('demandas').filter(d=>d.projetoId===p.id);
    return `
    ${p.descricao?`<div class="obs-box" style="background:var(--green-050);border-color:var(--green-500)">${UI.esc(p.descricao)}</div>`:''}
    ${p.status==='Pausado'&&p.justificativaPausa?`<div class="obs-box" style="background:#fcf2dd;border-color:var(--warn)"><strong>⏸ Projeto pausado:</strong> ${UI.esc(p.justificativaPausa)}</div>`:''}
    <div class="dem-section"><h4>👥 Responsáveis</h4>
      <div>${(p.responsaveis||[]).map(r=>`<span class="tag tag-green" style="margin-right:6px">${UI.esc(r)}</span>`).join('')||'<span class="muted">—</span>'}</div>
    </div>
    ${p.sponsor?`<div class="dem-section"><h4>⭐ Sponsor da equipe</h4><div><span class="tag tag-gold">${UI.esc(p.sponsor)}</span></div></div>`:''}
    <div class="dem-section"><h4>🗂️ Demandas do projeto</h4>
      ${demandas.length?demandas.map(d=>`<div class="list-row" data-godem="${d.id}"><span class="dot" style="background:${d.coluna==='finalizado'?'var(--ok)':'var(--gold-500)'}"></span>
        <div class="lr-main"><div class="lr-title">${UI.esc(d.titulo)}</div><div class="lr-sub">${colLabel(d.coluna)} · ${UI.esc(d.prioridade)}</div></div></div>`).join(''):'<div class="muted" style="padding:4px 12px">Nenhuma demanda vinculada.</div>'}
    </div>`;
  }

  function tabCronograma(p){
    const marcos=(p.marcos||[]).slice().sort((a,b)=>(a.data||'').localeCompare(b.data||''));
    return `<div class="dem-section" style="margin-top:6px">
      <h4>📆 Marcos do projeto</h4>
      ${marcos.length?marcos.map((m,i)=>`<div class="milestone ${m.feito?'done':''}">
        <div class="ms-check" data-marco="${i}">✓</div>
        <div class="ms-main"><div class="ms-tit">${UI.esc(m.titulo)}</div><div class="ms-date">${m.data?UI.fmtDate(m.data)+' · '+UI.relativeDays(m.data):''}</div></div>
      </div>`).join(''):'<div class="muted">Nenhum marco definido.</div>'}
      <div style="display:flex;gap:8px;margin-top:12px">
        <input id="marco-tit" placeholder="Novo marco…" style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:9px">
        <input id="marco-data" type="date" style="padding:8px;border:1px solid var(--line);border-radius:9px">
        <button class="btn btn-ghost btn-sm" id="marco-add">Adicionar</button>
      </div>
    </div>`;
  }

  function tabRede(p){
    const render=(ids,vazio)=> ids&&ids.length ? ids.map(id=>{const c=Store.byId('contatos',id);return c?`<span class="partner-chip" data-gocontato="${c.id}">${UI.avatar(c,28)} ${UI.esc(c.nome)}</span>`:''}).join('') : `<div class="muted" style="padding:4px 0">${vazio}</div>`;
    return `
    <div class="dem-section" style="margin-top:6px"><h4>🤝 Parceiros</h4><div>${render(p.parceiros,'Nenhum parceiro vinculado.')}</div></div>
    <div class="dem-section"><h4>💎 Patrocinadores</h4><div>${render(p.patrocinadores,'Nenhum patrocinador vinculado.')}</div></div>
    <div class="dem-section">
      <h4>+ Vincular relacionamento</h4>
      <div style="display:flex;gap:8px">
        <select id="vinc-contato" style="flex:1;padding:9px;border:1px solid var(--line);border-radius:9px"><option value="">Selecione…</option>${Store.all('contatos').map(c=>`<option value="${c.id}">${UI.esc(c.nome)}</option>`).join('')}</select>
        <select id="vinc-tipo" style="padding:9px;border:1px solid var(--line);border-radius:9px"><option value="parceiros">Parceiro</option><option value="patrocinadores">Patrocinador</option></select>
        <button class="btn btn-ghost btn-sm" id="vinc-add">Vincular</button>
      </div>
    </div>`;
  }

  function tabContas(p){
    const perc=p.meta?Math.round(p.captado/p.meta*100):0;
    const falta=Math.max(0,(p.meta||0)-(p.captado||0));
    return `
    <div class="dem-section" style="margin-top:6px"><h4>💰 Prestação de contas</h4>
      <div class="info-grid">
        <div class="info-item"><div class="il">Meta de captação</div><div class="iv">${UI.brl(p.meta)}</div></div>
        <div class="info-item"><div class="il">Total captado</div><div class="iv" style="color:var(--green-700);font-weight:700">${UI.brl(p.captado)}</div></div>
        <div class="info-item"><div class="il">Saldo a captar</div><div class="iv">${UI.brl(falta)}</div></div>
        <div class="info-item"><div class="il">Atingimento</div><div class="iv">${perc}%</div></div>
      </div>
      <div class="gen-box" style="margin-top:14px">
        <strong>Relatório de prestação de contas — ${UI.esc(p.nome)}</strong>${'\n'}
Período: ${UI.fmtDate(p.inicio)} a ${UI.fmtDate(p.fim)}
Status: ${p.status}
Meta: ${UI.brl(p.meta)} | Captado: ${UI.brl(p.captado)} (${perc}%) | A captar: ${UI.brl(falta)}
Marcos concluídos: ${(p.marcos||[]).filter(m=>m.feito).length} de ${(p.marcos||[]).length}
Parceiros/patrocinadores envolvidos: ${[...new Set([...(p.parceiros||[]),...(p.patrocinadores||[])])].length}
      </div>
      <div class="ai-actions"><button class="btn btn-gold btn-sm" id="conta-copy">📋 Copiar relatório</button></div>
    </div>`;
  }

  function bindFicha(){
    const p=()=>Store.byId('projetos',curId);
    document.querySelectorAll('.ficha-tab').forEach(t=>t.onclick=()=>{
      curTab=t.dataset.tab;
      document.querySelectorAll('.ficha-tab').forEach(x=>x.classList.toggle('active',x===t));
      renderTab();
    });
    bindActions();
    renderTab();
  }
  function renderTab(){
    const p=Store.byId('projetos',curId);
    const cont=document.getElementById('pj-content');
    cont.innerHTML = curTab==='visao'?tabVisao(p):curTab==='cronograma'?tabCronograma(p):curTab==='rede'?tabRede(p):tabContas(p);
    bindTab();
  }
  function bindActions(){
    const map={
      demanda:()=>{ UI.closeModal(); App.go('demandas'); Demandas.openForm(null); setTimeout(()=>{const s=document.querySelector('select[name="projetoId"]'); if(s){s.value=curId;}},50); },
      captacao:()=>openCaptacao(),
      editar:()=>openForm(curId),
      excluir:()=>UI.confirmAction('Excluir este projeto?',()=>{ Store.remove('projetos',curId); UI.closeModal(); UI.toast('Projeto excluído'); App.refresh(); })
    };
    document.querySelectorAll('[data-pa]').forEach(b=>b.onclick=()=>map[b.dataset.pa]?.());
  }
  function bindTab(){
    const p=Store.byId('projetos',curId);
    document.querySelectorAll('#pj-content [data-godem]').forEach(el=>el.onclick=()=>{ UI.closeModal(); App.go('demandas'); Demandas.openCard(el.dataset.godem); });
    document.querySelectorAll('#pj-content [data-gocontato]').forEach(el=>el.onclick=()=>{ UI.closeModal(); App.go('relacionamentos'); Relacionamentos.openFicha(el.dataset.gocontato); });
    // marcos toggle
    document.querySelectorAll('[data-marco]').forEach(el=>el.onclick=()=>{ const i=+el.dataset.marco; p.marcos[i].feito=!p.marcos[i].feito; Store.upsert('projetos',p); renderTab(); App.refresh?.(); });
    const ma=document.getElementById('marco-add'); if(ma) ma.onclick=()=>{ const t=document.getElementById('marco-tit').value.trim(); if(!t)return; p.marcos=p.marcos||[]; p.marcos.push({titulo:t,data:document.getElementById('marco-data').value,feito:false}); Store.upsert('projetos',p); renderTab(); };
    const va=document.getElementById('vinc-add'); if(va) va.onclick=()=>{ const cid=document.getElementById('vinc-contato').value; const tp=document.getElementById('vinc-tipo').value; if(!cid)return; p[tp]=p[tp]||[]; if(!p[tp].includes(cid)) p[tp].push(cid); Store.upsert('projetos',p); UI.toast('Relacionamento vinculado'); renderTab(); };
    const cc=document.getElementById('conta-copy'); if(cc) cc.onclick=()=>{ navigator.clipboard?.writeText(document.querySelector('#pj-content .gen-box').innerText); UI.toast('Relatório copiado'); };
  }

  function openCaptacao(){
    const p=Store.byId('projetos',curId);
    UI.openModal('Registrar captação — '+p.nome,`
      <form id="cap-form">
        <div class="field"><label>Valor a adicionar (R$)</label><input name="valor" type="number" min="0" step="1000" placeholder="50000"></div>
        <p class="muted" style="font-size:12.5px;margin-bottom:14px">Captado atual: <b>${UI.brl(p.captado)}</b> de ${UI.brl(p.meta)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-gold">Adicionar captação</button>
        </div>
      </form>`);
    document.getElementById('cap-form').onsubmit=(e)=>{
      e.preventDefault();
      const v=parseFloat(document.querySelector('[name=valor]').value)||0;
      p.captado=(p.captado||0)+v; Store.upsert('projetos',p);
      UI.toast(`+${UI.brl(v)} em captação 🎉`); App.refresh(); openFicha(curId);
    };
  }

  /* ---------------- FORM ---------------- */
  function openForm(id){
    const p=id?Store.byId('projetos',id):{categoria:'Captação',status:'Planejamento',cor:'#c25688',marcos:[],parceiros:[],patrocinadores:[],responsaveis:['Deuba Assunção']};
    const catInList = !p.categoria || CATEGORIAS.includes(p.categoria);
    UI.openModal(id?'Editar projeto':'Novo projeto',`
      <form id="pj-form">
        <input type="hidden" name="id" value="${p.id||''}">
        <div class="field"><label>Nome do projeto *</label><input name="nome" required value="${UI.esc(p.nome||'')}"></div>
        <div class="field"><label>Descrição ${UI.mic('pj-desc')}</label><textarea id="pj-desc" name="descricao">${UI.esc(p.descricao||'')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Categoria</label><select name="categoria" id="pj-cat">${CATEGORIAS.map(x=>`<option ${(catInList?p.categoria===x:x==='Outros')?'selected':''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select name="status" id="pj-status">${STATUS.map(x=>`<option ${p.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
        </div>
        <div class="field" id="pj-cat-outro-wrap" style="display:${catInList?'none':'block'}"><label>Descreva a categoria</label><input name="categoriaOutro" value="${UI.esc(catInList?'':(p.categoria||''))}"></div>
        <div class="field"><label>Sponsor da equipe <span class="muted" style="font-weight:400">(quem toca o projeto com você)</span></label><input name="sponsor" value="${UI.esc(p.sponsor||'')}" placeholder="Nome do responsável da equipe"></div>
        <div class="field" id="pj-pausa-wrap" style="display:${p.status==='Pausado'?'block':'none'}"><label>Justificativa da pausa ${UI.mic('pj-pausa')}</label><textarea id="pj-pausa" name="justificativaPausa">${UI.esc(p.justificativaPausa||'')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Meta de captação (R$)</label><input name="meta" type="number" min="0" value="${p.meta||0}"></div>
          <div class="field"><label>Já captado (R$)</label><input name="captado" type="number" min="0" value="${p.captado||0}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Início</label><input name="inicio" type="date" value="${p.inicio||''}"></div>
          <div class="field"><label>Conclusão prevista</label><input name="fim" type="date" value="${p.fim||''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Responsáveis (vírgula)</label><input name="responsaveis" value="${UI.esc((p.responsaveis||[]).join(', '))}"></div>
          <div class="field"><label>Cor</label><input name="cor" type="color" value="${p.cor||'#c25688'}" style="height:42px;padding:4px"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar projeto</button>
        </div>
      </form>`);
    // mostrar/ocultar campos condicionais
    const catSel=document.getElementById('pj-cat'), stSel=document.getElementById('pj-status');
    catSel.onchange=()=>{ document.getElementById('pj-cat-outro-wrap').style.display=catSel.value==='Outros'?'block':'none'; };
    stSel.onchange=()=>{ document.getElementById('pj-pausa-wrap').style.display=stSel.value==='Pausado'?'block':'none'; };

    document.getElementById('pj-form').onsubmit=(e)=>{
      e.preventDefault();
      const d=UI.readForm(e.target);
      if(d.categoria==='Outros' && d.categoriaOutro) d.categoria=d.categoriaOutro.trim();
      delete d.categoriaOutro;
      if(d.status!=='Pausado') d.justificativaPausa='';
      d.meta=parseFloat(d.meta)||0; d.captado=parseFloat(d.captado)||0;
      d.responsaveis=d.responsaveis?d.responsaveis.split(',').map(s=>s.trim()).filter(Boolean):[];
      if(!d.id){ delete d.id; d.marcos=[]; d.parceiros=[]; d.patrocinadores=[]; }
      else { const old=Store.byId('projetos',d.id); d.marcos=old.marcos||[]; d.parceiros=old.parceiros||[]; d.patrocinadores=old.patrocinadores||[]; }
      const saved=Store.upsert('projetos',d);
      UI.toast(id?'Projeto atualizado':'Projeto criado'); App.go('projetos'); openFicha(saved.id);
    };
  }

  function kpi(ico,cls,val,lab){ return `<div class="kpi ${cls}"><div class="kpi-ico">${ico}</div><div class="kpi-val">${val}</div><div class="kpi-lab">${lab}</div></div>`; }
  const colLabel=(c)=>({entrada:'Caixa de entrada',analise:'Em análise',encaminhado:'Encaminhado',andamento:'Em andamento',aguardando:'Aguardando retorno',finalizado:'Finalizado'}[c]||c);

  return { render, afterRender, openFicha, openForm };
})();
