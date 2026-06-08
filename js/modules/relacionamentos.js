/* =====================================================================
   MÓDULO 3 — RELACIONAMENTOS (Públicos de Interesse)
   "Construção de rede de relacionamento institucional."
   ===================================================================== */
const Relacionamentos = (() => {

  const CATEGORIAS = ['Deputado','Senador','Vereador','Prefeito','Secretário','Imprensa','Empresário',
    'Patrocinador','Parceiro','Médico','Voluntário','Doador','Liderança','Influenciador','Associado','Instituição','Fornecedor','Outros'];
  const CLASSIF = ['Mantenedor','Patrocinador','Estratégico','Parceiro','Formador de Opinião','A desenvolver','Parceiro Interno','Outros'];

  let filtro = { cat:'todos', q:'', ordem:'nome' };

  /* ---------------- LISTA ---------------- */
  function render(){
    const contatos = aplicaFiltro();
    const cats = contagemPorCategoria();

    return `
    <div class="section-head">
      <div>
        <div class="eyebrow">Rede Institucional</div>
        <h2>Relacionamentos</h2>
      </div>
      <button class="btn btn-primary" id="rel-novo">+ Novo relacionamento</button>
    </div>

    <div class="toolbar">
      <div class="tb-search"><span class="ico">⌕</span>
        <input type="text" id="rel-search" placeholder="Buscar por nome, instituição, cidade…" value="${UI.esc(filtro.q)}">
      </div>
      <select id="rel-ordem">
        <option value="nome" ${filtro.ordem==='nome'?'selected':''}>Ordenar: Nome</option>
        <option value="nivel" ${filtro.ordem==='nivel'?'selected':''}>Ordenar: Nível de relacionamento</option>
        <option value="recente" ${filtro.ordem==='recente'?'selected':''}>Ordenar: Contato mais recente</option>
        <option value="esquecido" ${filtro.ordem==='esquecido'?'selected':''}>Ordenar: Há mais tempo sem contato</option>
      </select>
    </div>

    <div class="filter-chips" id="rel-chips">
      <span class="fchip ${filtro.cat==='todos'?'active':''}" data-cat="todos">Todos <span class="c-count">${Store.all('contatos').length}</span></span>
      ${Object.entries(cats).map(([c,n])=>`<span class="fchip ${filtro.cat===c?'active':''}" data-cat="${UI.esc(c)}">${UI.catIcon(c)} ${UI.esc(c)} <span class="c-count">${n}</span></span>`).join('')}
    </div>

    <div class="contacts-grid" id="rel-grid">
      ${contatos.length ? contatos.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>Nenhum relacionamento encontrado</div>`}
    </div>`;
  }

  function afterRender(){
    document.getElementById('rel-novo').onclick = ()=>openForm();
    const s = document.getElementById('rel-search');
    s.oninput = ()=>{ filtro.q=s.value; updateGrid(); };
    document.getElementById('rel-ordem').onchange = (e)=>{ filtro.ordem=e.target.value; updateGrid(); };
    bindChips(); bindGrid();
  }

  function bindChips(){
    document.querySelectorAll('#rel-chips .fchip').forEach(ch=>ch.onclick=()=>{
      filtro.cat=ch.dataset.cat;
      document.querySelectorAll('#rel-chips .fchip').forEach(x=>x.classList.toggle('active',x===ch));
      updateGrid();
    });
  }
  function bindGrid(){
    document.querySelectorAll('#rel-grid [data-ficha]').forEach(el=>el.onclick=(e)=>{
      if(e.target.closest('[data-act]')) return;
      openFicha(el.dataset.ficha);
    });
    document.querySelectorAll('#rel-grid [data-act]').forEach(b=>b.onclick=(e)=>{
      e.stopPropagation();
      const c=Store.byId('contatos',b.dataset.id);
      if(b.dataset.act==='wpp') openWhats(c);
      if(b.dataset.act==='mail') location.href=`mailto:${c.email}`;
    });
  }
  function updateGrid(){
    const grid=document.getElementById('rel-grid');
    const contatos=aplicaFiltro();
    grid.innerHTML = contatos.length ? contatos.map(cardHTML).join('') : `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>Nenhum relacionamento encontrado</div>`;
    bindGrid();
  }

  function cardHTML(c){
    const flag = c.classificacao==='Mantenedor'?'mant':['Estratégico','Patrocinador'].includes(c.classificacao)?'estr':'';
    return `<div class="contact-card" data-ficha="${c.id}">
      ${c.classificacao?`<span class="cc-flag ${flag}">${UI.esc(c.classificacao)}</span>`:''}
      <div class="cc-top">
        ${UI.avatar(c,52)}
        <div class="cc-id">
          <div class="cc-name">${UI.esc(c.nome)}</div>
          <div class="cc-cargo">${UI.catIcon(c.categoria)} ${UI.esc(c.cargo||c.categoria)}</div>
        </div>
      </div>
      <div class="cc-meta">
        ${c.instituicao?`<div class="m-row"><span class="mi">🏢</span>${UI.esc(c.instituicao)}</div>`:''}
        ${c.cidade?`<div class="m-row"><span class="mi">📍</span>${UI.esc(c.cidade)}</div>`:''}
        <div class="m-row"><span class="mi">🕑</span>${c.ultimoContato?'Último contato '+UI.relativeDays(c.ultimoContato):'<span style="color:var(--warn)">sem registro de contato</span>'}</div>
      </div>
      <div class="cc-foot">
        ${UI.stars(c.nivel)}
        <div class="cc-actions">
          ${c.whatsapp?`<button class="mini-btn" data-act="wpp" data-id="${c.id}" title="WhatsApp">💬</button>`:''}
          ${c.email?`<button class="mini-btn" data-act="mail" data-id="${c.id}" title="E-mail">✉️</button>`:''}
        </div>
      </div>
    </div>`;
  }

  /* ---------------- FILTRO/ORDEM ---------------- */
  function aplicaFiltro(){
    let arr = Store.all('contatos').slice();
    if(filtro.cat!=='todos') arr=arr.filter(c=>c.categoria===filtro.cat);
    if(filtro.q){
      const q=filtro.q.toLowerCase();
      arr=arr.filter(c=>[c.nome,c.instituicao,c.cidade,c.cargo,c.categoria,(c.interesses||[]).join(' ')].join(' ').toLowerCase().includes(q));
    }
    const ord=filtro.ordem;
    arr.sort((a,b)=>{
      if(ord==='nome') return a.nome.localeCompare(b.nome);
      if(ord==='nivel') return (b.nivel||0)-(a.nivel||0);
      if(ord==='recente') return (b.ultimoContato||'').localeCompare(a.ultimoContato||'');
      if(ord==='esquecido') return (a.ultimoContato||'0').localeCompare(b.ultimoContato||'0');
      return 0;
    });
    return arr;
  }
  function contagemPorCategoria(){
    const m={};
    Store.all('contatos').forEach(c=>{ if(c.categoria) m[c.categoria]=(m[c.categoria]||0)+1; });
    return Object.fromEntries(Object.entries(m).sort((a,b)=>b[1]-a[1]));
  }

  /* ---------------- FICHA ---------------- */
  let fichaTab = 'info';
  function openFicha(id){
    const c = Store.byId('contatos',id);
    if(!c) return UI.toast('Relacionamento não encontrado','⚠');
    fichaTab='info';
    UI.openModal(' ', fichaHTML(c), true);
    bindFicha(c);
  }

  function fichaHTML(c){
    const interacoes = Store.all('interacoes').filter(i=>i.contatoId===c.id).sort((a,b)=>b.data.localeCompare(a.data));
    const demandas = Store.all('demandas').filter(d=>d.contatoId===c.id);
    const projetos = Store.all('projetos').filter(p=>(p.parceiros||[]).includes(c.id)||(p.patrocinadores||[]).includes(c.id));
    const flag = c.classificacao==='Mantenedor'?'tag-gold':['Estratégico','Patrocinador'].includes(c.classificacao)?'tag-blue':'tag-green';

    return `
    <div class="ficha-head">
      ${UI.avatar(c,64)}
      <div class="fh-id">
        <h2>${UI.esc(c.nome)}</h2>
        <div class="fh-cargo">${UI.catIcon(c.categoria)} ${UI.esc(c.cargo||'')}${c.instituicao?' · '+UI.esc(c.instituicao):''}</div>
        <div class="fh-tags">
          ${c.classificacao?`<span class="tag ${flag}">${UI.esc(c.classificacao)}</span>`:''}
          <span class="tag">${UI.esc(c.categoria)}</span>
          ${UI.stars(c.nivel)}
        </div>
      </div>
    </div>

    <div class="ficha-actions">
      ${c.whatsapp?`<button class="btn btn-ghost btn-sm" data-fa="wpp">💬 WhatsApp</button>`:''}
      ${c.email?`<button class="btn btn-ghost btn-sm" data-fa="mail">✉️ E-mail</button>`:''}
      <button class="btn btn-primary btn-sm" data-fa="interacao">+ Registrar interação</button>
      <button class="btn btn-ghost btn-sm" data-fa="editar">✎ Editar</button>
      <button class="btn btn-danger btn-sm" data-fa="excluir" style="margin-left:auto">Excluir</button>
    </div>

    <div class="ficha-tabs">
      <span class="ficha-tab active" data-tab="info">Dados</span>
      <span class="ficha-tab" data-tab="timeline">Linha do tempo (${interacoes.length})</span>
      <span class="ficha-tab" data-tab="vinculos">Vínculos (${demandas.length+projetos.length})</span>
    </div>

    <div id="ficha-content">${tabInfo(c)}</div>`;
  }

  function tabInfo(c){
    const item=(l,v)=>v?`<div class="info-item"><div class="il">${l}</div><div class="iv">${v}</div></div>`:'';
    return `
    <div class="info-grid">
      ${item('WhatsApp',c.whatsapp)}
      ${item('E-mail',c.email)}
      ${item('Cidade',c.cidade)}
      ${item('Aniversário',c.aniversario?aniversarioFmt(c.aniversario):'')}
      ${item('Instituição',c.instituicao)}
      ${item('Classificação estratégica',c.classificacao)}
      ${item('Instagram',c.instagram)}
      ${item('LinkedIn',c.linkedin)}
    </div>
    ${(c.interesses&&c.interesses.length)?`<div style="margin-top:16px"><div class="il" style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase">Interesses</div>
      <div class="interesse-tags">${c.interesses.map(i=>`<span class="tag tag-green">${UI.esc(i)}</span>`).join('')}</div></div>`:''}
    ${c.obs?`<div class="obs-box"><strong>Observações estratégicas:</strong><br/>${UI.esc(c.obs)}</div>`:''}`;
  }

  function tabTimeline(c){
    const interacoes = Store.all('interacoes').filter(i=>i.contatoId===c.id).sort((a,b)=>b.data.localeCompare(a.data));
    if(!interacoes.length) return `<div class="empty"><div class="big">🕊️</div>Nenhuma interação registrada.<br/><button class="btn btn-primary btn-sm" style="margin-top:12px" data-fa="interacao">Registrar primeira interação</button></div>`;
    const ico={'Reunião':'🤝','Visita':'📍','Mensagem':'💬','Ligação':'📞','Apoio':'💚','E-mail':'✉️','Evento':'🎟️'};
    return `<div class="timeline">${interacoes.map(i=>`
      <div class="tl-item ${i.tipo==='Apoio'?'apoio':''}">
        <div class="tl-head">
          <span class="tl-title">${ico[i.tipo]||'•'} ${UI.esc(i.titulo||i.tipo)}</span>
          <span class="tag" style="padding:1px 8px">${UI.esc(i.tipo)}</span>
          <span class="tl-date">· ${UI.fmtDate(i.data)} · ${UI.esc(i.autor||'Deuba Assunção')}</span>
        </div>
        ${i.resumo?`<div class="tl-resumo">${UI.esc(i.resumo)}</div>`:''}
      </div>`).join('')}</div>`;
  }

  function tabVinculos(c){
    const demandas = Store.all('demandas').filter(d=>d.contatoId===c.id);
    const projetos = Store.all('projetos').filter(p=>(p.parceiros||[]).includes(c.id)||(p.patrocinadores||[]).includes(c.id));
    let h='';
    h+=`<h4 style="font-family:var(--serif);color:var(--green-800);margin:4px 0 10px">Projetos relacionados</h4>`;
    h+= projetos.length ? projetos.map(p=>`<div class="list-row" data-proj="${p.id}"><span class="dot" style="background:${p.cor||'var(--green-500)'}"></span>
      <div class="lr-main"><div class="lr-title">${UI.esc(p.nome)}</div><div class="lr-sub">${UI.esc(p.categoria)} · ${UI.esc(p.status)}</div></div></div>`).join('') : `<div class="muted" style="padding:4px 12px 14px">Nenhum projeto vinculado.</div>`;
    h+=`<h4 style="font-family:var(--serif);color:var(--green-800);margin:16px 0 10px">Demandas relacionadas</h4>`;
    h+= demandas.length ? demandas.map(d=>`<div class="list-row" data-dem="${d.id}"><span class="dot" style="background:var(--gold-500)"></span>
      <div class="lr-main"><div class="lr-title">${UI.esc(d.titulo)}</div><div class="lr-sub">${UI.esc(colLabel(d.coluna))} · ${UI.esc(d.prioridade)}</div></div></div>`).join('') : `<div class="muted" style="padding:4px 12px">Nenhuma demanda vinculada.</div>`;
    return h;
  }

  function bindFicha(c){
    document.querySelectorAll('.ficha-tab').forEach(t=>t.onclick=()=>{
      fichaTab=t.dataset.tab;
      document.querySelectorAll('.ficha-tab').forEach(x=>x.classList.toggle('active',x===t));
      const cont=document.getElementById('ficha-content');
      cont.innerHTML = fichaTab==='info'?tabInfo(c):fichaTab==='timeline'?tabTimeline(c):tabVinculos(c);
      bindFichaContent(c);
    });
    bindFichaActions(c);
    bindFichaContent(c);
  }
  function bindFichaActions(c){
    const map={
      wpp:()=>openWhats(c),
      mail:()=>location.href=`mailto:${c.email}`,
      interacao:()=>openInteracao(c.id),
      editar:()=>openForm(c.id),
      excluir:()=>UI.confirmAction(`Excluir o relacionamento "${c.nome}"? Esta ação não pode ser desfeita.`,()=>{ Store.remove('contatos',c.id); UI.closeModal(); UI.toast('Relacionamento excluído'); App.refresh(); })
    };
    document.querySelectorAll('[data-fa]').forEach(b=>b.onclick=()=>map[b.dataset.fa]?.());
  }
  function bindFichaContent(c){
    document.querySelectorAll('#ficha-content [data-proj]').forEach(el=>el.onclick=()=>{ UI.closeModal(); App.go('projetos'); window.Projetos?.openFicha?.(el.dataset.proj); });
    document.querySelectorAll('#ficha-content [data-dem]').forEach(el=>el.onclick=()=>{ UI.closeModal(); App.go('demandas'); window.Demandas?.openCard?.(el.dataset.dem); });
    document.querySelectorAll('#ficha-content [data-fa]').forEach(b=>b.onclick=()=>{ if(b.dataset.fa==='interacao') openInteracao(c.id); });
  }

  /* ---------------- FORM CONTATO ---------------- */
  function openForm(id){
    const c = id?Store.byId('contatos',id):{};
    const catInList = !c.categoria || CATEGORIAS.includes(c.categoria);
    const clfInList = !c.classificacao || CLASSIF.includes(c.classificacao);
    UI.openModal(id?'Editar relacionamento':'Novo relacionamento', `
      <form id="rel-form">
        <input type="hidden" name="id" value="${c.id||''}">
        <div class="field"><label>Nome completo *</label><input name="nome" required value="${UI.esc(c.nome||'')}"></div>
        <div class="field-row">
          <div class="field"><label>Cargo</label><input name="cargo" value="${UI.esc(c.cargo||'')}"></div>
          <div class="field"><label>Instituição</label><input name="instituicao" value="${UI.esc(c.instituicao||'')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Categoria / Público</label>
            <select name="categoria" id="rel-cat">${CATEGORIAS.map(x=>`<option ${(catInList?c.categoria===x:x==='Outros')?'selected':''}>${x}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Classificação estratégica</label>
            <select name="classificacao" id="rel-clf"><option value="">—</option>${CLASSIF.map(x=>`<option ${(clfInList?c.classificacao===x:(c.classificacao&&x==='Outros'))?'selected':''}>${x}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field" id="rel-cat-outro-wrap" style="display:${catInList?'none':'block'}"><label>Descreva a categoria</label><input name="categoriaOutro" id="rel-cat-outro" value="${UI.esc(catInList?'':(c.categoria||''))}"></div>
          <div class="field" id="rel-clf-outro-wrap" style="display:${clfInList?'none':'block'}"><label>Descreva a classificação</label><input name="classificacaoOutro" id="rel-clf-outro" value="${UI.esc(clfInList?'':(c.classificacao||''))}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>WhatsApp</label><input name="whatsapp" value="${UI.esc(c.whatsapp||'')}" placeholder="(62) 9...."></div>
          <div class="field"><label>E-mail</label><input name="email" type="email" value="${UI.esc(c.email||'')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Instagram</label><input name="instagram" value="${UI.esc(c.instagram||'')}" placeholder="@usuario"></div>
          <div class="field"><label>LinkedIn</label><input name="linkedin" value="${UI.esc(c.linkedin||'')}" placeholder="link ou perfil"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Cidade</label><input name="cidade" value="${UI.esc(c.cidade||'')}"></div>
          <div class="field"><label>Aniversário</label><input name="aniversario" type="date" value="${c.aniversario||''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Nível de relacionamento (0-5)</label><input name="nivel" type="number" min="0" max="5" value="${c.nivel??3}"></div>
          <div class="field"><label>Foto (URL — opcional)</label><input name="foto" value="${UI.esc(c.foto||'')}" placeholder="https://..."></div>
        </div>
        <div class="field"><label>Interesses (separados por vírgula)</label><input name="interesses" value="${UI.esc((c.interesses||[]).join(', '))}"></div>
        <div class="field"><label>Observações estratégicas ${UI.mic('rel-obs')}</label><textarea id="rel-obs" name="obs">${UI.esc(c.obs||'')}</textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar relacionamento</button>
        </div>
      </form>`);
    // mostrar/ocultar campos "Outros"
    const catSel=document.getElementById('rel-cat'), clfSel=document.getElementById('rel-clf');
    catSel.onchange=()=>{ document.getElementById('rel-cat-outro-wrap').style.display = catSel.value==='Outros'?'block':'none'; };
    clfSel.onchange=()=>{ document.getElementById('rel-clf-outro-wrap').style.display = clfSel.value==='Outros'?'block':'none'; };

    document.getElementById('rel-form').onsubmit=(e)=>{
      e.preventDefault();
      const d=UI.readForm(e.target);
      // resolve "Outros"
      if(d.categoria==='Outros' && d.categoriaOutro) d.categoria=d.categoriaOutro.trim();
      if(d.classificacao==='Outros' && d.classificacaoOutro) d.classificacao=d.classificacaoOutro.trim();
      delete d.categoriaOutro; delete d.classificacaoOutro;
      d.nivel=parseInt(d.nivel)||0;
      d.interesses=d.interesses?d.interesses.split(',').map(s=>s.trim()).filter(Boolean):[];
      if(!d.id){ delete d.id; d.ultimoContato=null; }
      const saved=Store.upsert('contatos',d);
      UI.toast(id?'Relacionamento atualizado':'Relacionamento cadastrado');
      App.refresh();
      openFicha(saved.id);
    };
  }

  /* ---------------- INTERAÇÃO ---------------- */
  function openInteracao(contatoId){
    const c=Store.byId('contatos',contatoId);
    const tipos=['Reunião','Visita','Mensagem','Ligação','E-mail','Apoio','Evento'];
    UI.openModal('Registrar interação'+(c?` — ${c.nome}`:''),`
      <form id="int-form">
        ${!contatoId?`<div class="field"><label>Relacionamento *</label><select name="contatoId" required><option value="">Selecione…</option>${Store.all('contatos').map(x=>`<option value="${x.id}">${UI.esc(x.nome)}</option>`).join('')}</select></div>`:`<input type="hidden" name="contatoId" value="${contatoId}">`}
        <div class="field-row">
          <div class="field"><label>Tipo</label><select name="tipo">${tipos.map(t=>`<option>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Data</label><input name="data" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        </div>
        <div class="field"><label>Título</label><input name="titulo" placeholder="Ex.: Almoço de alinhamento"></div>
        <div class="field"><label>Resumo / o que foi tratado ${UI.mic('int-resumo')}</label><textarea id="int-resumo" name="resumo" placeholder="Descreva o encontro, encaminhamentos, próximos passos…"></textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar</button>
        </div>
      </form>`);
    document.getElementById('int-form').onsubmit=(e)=>{
      e.preventDefault();
      const d=UI.readForm(e.target);
      if(!d.contatoId) return UI.toast('Selecione um relacionamento','⚠');
      d.autor='Deuba Assunção';
      Store.upsert('interacoes',d);
      const ct=Store.byId('contatos',d.contatoId);
      if(ct){ ct.ultimoContato=d.data; Store.upsert('contatos',ct); }
      UI.toast('Interação registrada — relacionamento fortalecido');
      App.refresh();
      openFicha(d.contatoId);
    };
  }
  function openInteracaoQuick(){ openInteracao(null); }

  /* ---------------- WHATSAPP ---------------- */
  function openWhats(c){
    if(!c?.whatsapp) return;
    const num=c.whatsapp.replace(/\D/g,'');
    const msg=encodeURIComponent(`Olá, ${c.nome.split(' ')[0]}! Aqui é a Deuba Assunção, da Gerência de Relações Institucionais do Araújo Jorge.`);
    window.open(`https://wa.me/55${num}?text=${msg}`,'_blank');
  }

  /* ---------------- BUSCA EXTERNA ---------------- */
  function search(q){ filtro.q=q; filtro.cat='todos'; App.go('relacionamentos'); }

  const colLabel=(c)=>({entrada:'Caixa de entrada',analise:'Em análise',encaminhado:'Encaminhado',andamento:'Em andamento',aguardando:'Aguardando retorno',finalizado:'Finalizado'}[c]||c);
  const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const aniversarioFmt=(iso)=>{ const p=iso.split('-'); return `${p[2]} de ${MES[(+p[1])-1]}`; };

  return { render, afterRender, openFicha, openForm, openInteracao, openInteracaoQuick, search };
})();
