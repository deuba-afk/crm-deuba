/* =====================================================================
   MÓDULO 2 — DASHBOARD EXECUTIVO
   "Relacionamento é patrimônio institucional."
   ===================================================================== */
const Dashboard = (() => {

  function greeting(){
    const h = new Date().getHours();
    if(h < 12) return 'Bom dia';
    if(h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // Aniversários nos próximos 30 dias (compara dia/mês)
  function proximosAniversarios(){
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return Store.all('contatos').map(c=>{
      if(!c.aniversario) return null;
      const [_, m, d] = c.aniversario.split('-').map(Number);
      let prox = new Date(hoje.getFullYear(), m-1, d);
      if(prox < hoje) prox = new Date(hoje.getFullYear()+1, m-1, d);
      const dias = Math.round((prox-hoje)/86400000);
      return dias<=30 ? {c, dias, prox} : null;
    }).filter(Boolean).sort((a,b)=>a.dias-b.dias);
  }

  // Follow-ups: contatos sem contato há mais de 20 dias
  function followUps(){
    return Store.all('contatos')
      .map(c=>({c, dias: c.ultimoContato ? Math.abs(UI.daysFromNow(c.ultimoContato)) : 999}))
      .filter(x=>x.dias>=20)
      .sort((a,b)=>b.dias-a.dias);
  }

  function eventosSemana(){
    return Store.all('eventos')
      .map(e=>({e, dias:UI.daysFromNow(e.data)}))
      .filter(x=>x.dias!==null && x.dias>=0 && x.dias<=7)
      .sort((a,b)=> (a.dias-b.dias) || (a.e.hora||'').localeCompare(b.e.hora||''));
  }

  function demandasPrioritarias(){
    const ordem={'Alta':0,'Média':1,'Baixa':2};
    return Store.all('demandas')
      .filter(d=>d.coluna!=='finalizado')
      .sort((a,b)=> (ordem[a.prioridade]-ordem[b.prioridade]) || ((UI.daysFromNow(a.prazo)??999)-(UI.daysFromNow(b.prazo)??999)))
      .slice(0,5);
  }

  function render(){
    const contatos = Store.all('contatos');
    const demandas = Store.all('demandas');
    const projetos = Store.all('projetos');
    const interacoes = Store.all('interacoes');

    const ativos = contatos.filter(c=>c.ultimoContato && Math.abs(UI.daysFromNow(c.ultimoContato))<=30).length;
    const pend = demandas.filter(d=>d.coluna!=='finalizado').length;
    const reunioesMes = interacoes.filter(i=>['Reunião','Visita'].includes(i.tipo) && Math.abs(UI.daysFromNow(i.data))<=30).length;
    const captTotal = projetos.reduce((s,p)=>s+(p.captado||0),0);
    const metaTotal = projetos.reduce((s,p)=>s+(p.meta||0),0);
    const fups = followUps();
    const bdays = proximosAniversarios();
    const eventos = eventosSemana();
    const dprio = demandasPrioritarias();
    const projAtivos = projetos.filter(p=>p.status!=='Concluído');

    return `
    <div class="welcome">
      <div class="eyebrow">Central Estratégica de Relacionamento</div>
      <h2>${greeting()}, Deuba Assunção.</h2>
      <p>Captação não é pedido. É construção de rede.</p>
    </div>

    <div class="kpi-grid">
      ${kpi('❤','',ativos,'Relacionamentos ativos','últimos 30 dias')}
      ${kpi('▤','amber',pend,'Demandas em aberto','requerem acompanhamento')}
      ${kpi('◷','blue',reunioesMes,'Reuniões & visitas','no mês')}
      ${kpi('◎','gold',UI.brl(captTotal),'Captação consolidada', metaTotal? `${Math.round(captTotal/metaTotal*100)}% das metas`:'')}
    </div>

    <div class="dash-grid">
      <div>
        <!-- AGENDA DA SEMANA -->
        <div class="panel">
          <div class="panel-head"><h3>📅 Agenda da semana</h3><span class="link" data-go="relacionamentos">ver contatos →</span></div>
          <div class="panel-body">
            ${eventos.length ? eventos.map(({e,dias})=>{
              const c = e.contatoId ? Store.byId('contatos',e.contatoId) : null;
              const [,m,d]=e.data.split('-');
              return `<div class="list-row" ${c?`data-contato="${c.id}"`:''}>
                <div class="agenda-day"><span class="ad-d">${d}</span><span class="ad-m">${monthAbbr(m)}</span></div>
                <div class="lr-main">
                  <div class="lr-title">${UI.esc(e.titulo)}</div>
                  <div class="lr-sub">${e.hora||''} · <span class="tag tag-green" style="padding:1px 8px">${UI.esc(e.tipo)}</span> ${c?'· '+UI.esc(c.nome):''}</div>
                </div>
                <div class="lr-right"><span class="muted" style="font-size:11.5px">${UI.relativeDays(e.data)}</span></div>
              </div>`;
            }).join('') : empty('Sem compromissos nos próximos 7 dias')}
          </div>
        </div>

        <!-- DEMANDAS PRIORITÁRIAS -->
        <div class="panel">
          <div class="panel-head"><h3>🔥 Demandas prioritárias</h3><span class="link" data-go="demandas">ver quadro →</span></div>
          <div class="panel-body">
            ${dprio.length ? dprio.map(d=>{
              const c = d.contatoId?Store.byId('contatos',d.contatoId):null;
              const dd = UI.daysFromNow(d.prazo);
              const atras = dd!==null && dd<0;
              return `<div class="list-row" data-demanda="${d.id}">
                <span class="dot" style="background:${d.prioridade==='Alta'?'var(--danger)':d.prioridade==='Média'?'var(--warn)':'var(--ok)'}"></span>
                <div class="lr-main">
                  <div class="lr-title">${UI.esc(d.titulo)}</div>
                  <div class="lr-sub">${UI.esc(colLabel(d.coluna))}${c?' · '+UI.esc(c.nome):''} · 👤 ${UI.esc(d.responsavel||'—')}</div>
                </div>
                <div class="lr-right">
                  <div style="font-size:11.5px;font-weight:600;color:${atras?'var(--danger)':'var(--muted)'}">${d.prazo?UI.relativeDays(d.prazo):'sem prazo'}</div>
                </div>
              </div>`;
            }).join('') : empty('Nenhuma demanda pendente')}
          </div>
        </div>

        <!-- PROJETOS / CAPTAÇÃO -->
        <div class="panel">
          <div class="panel-head"><h3>🎯 Projetos em andamento · Captação</h3><span class="link" data-go="projetos">ver projetos →</span></div>
          <div class="panel-body">
            ${projAtivos.length ? projAtivos.map(p=>{
              const perc = p.meta? Math.min(100,Math.round(p.captado/p.meta*100)) : 0;
              return `<div class="proj-card" data-projeto="${p.id}">
                <div class="pc-top">
                  <span class="pc-name">${UI.esc(p.nome)}</span>
                  <span class="tag tag-gold">${UI.esc(p.status)}</span>
                </div>
                <div class="progress ${p.categoria==='Captação'?'gold':''}"><span style="width:${perc}%"></span></div>
                <div class="pc-cap"><span>${UI.brl(p.captado)} de ${UI.brl(p.meta)}</span><strong style="color:var(--green-700)">${perc}%</strong></div>
              </div>`;
            }).join('') : empty('Nenhum projeto ativo')}
          </div>
        </div>
      </div>

      <div>
        <!-- FOLLOW-UPS -->
        <div class="panel">
          <div class="panel-head"><h3>⏳ Follow-ups pendentes</h3></div>
          <div class="panel-body">
            ${fups.length ? fups.slice(0,5).map(({c,dias})=>`
              <div class="list-row" data-contato="${c.id}">
                ${UI.avatar(c,38)}
                <div class="lr-main">
                  <div class="lr-title">${UI.esc(c.nome)}</div>
                  <div class="lr-sub">${UI.esc(c.cargo||c.categoria)}</div>
                </div>
                <div class="lr-right"><span class="tag tag-amber">${dias>900?'sem registro':'há '+dias+'d'}</span></div>
              </div>`).join('') : empty('Relacionamentos em dia 🎉')}
          </div>
        </div>

        <!-- ANIVERSÁRIOS -->
        <div class="panel">
          <div class="panel-head"><h3>🎂 Aniversários estratégicos</h3></div>
          <div class="panel-body">
            ${bdays.length ? bdays.slice(0,6).map(({c,dias})=>`
              <div class="list-row bday-row" data-contato="${c.id}">
                ${UI.avatar(c,38)}
                <div class="lr-main">
                  <div class="lr-title">${UI.esc(c.nome)}</div>
                  <div class="lr-sub">${UI.esc(c.instituicao||c.categoria)}</div>
                </div>
                <div class="lr-right"><span class="tag tag-gold">${dias===0?'hoje 🎉':dias===1?'amanhã':'em '+dias+'d'}</span></div>
              </div>`).join('') : empty('Sem aniversários nos próximos 30 dias')}
          </div>
        </div>

        <!-- INDICADORES -->
        <div class="panel">
          <div class="panel-head"><h3>📈 Indicadores institucionais</h3></div>
          <div class="panel-body" style="padding:14px 18px">
            ${ind('Rede de relacionamento', contatos.length+' contatos')}
            ${ind('Relacionamentos estratégicos', contatos.filter(c=>['Estratégico','Mantenedor'].includes(c.classificacao)).length)}
            ${ind('Projetos ativos', projAtivos.length)}
            ${ind('Demandas finalizadas', demandas.filter(d=>d.coluna==='finalizado').length)}
            ${ind('Meta global de captação', UI.brl(metaTotal))}
          </div>
        </div>

        <!-- ÁREAS DE GESTÃO -->
        <div class="panel">
          <div class="panel-head"><h3>🗂️ Demandas por área de gestão</h3><span class="link" data-go="demandas">ver demandas →</span></div>
          <div class="panel-body" style="padding:14px 18px">${areaResumo()}</div>
        </div>
      </div>
    </div>`;
  }

  function areaResumo(){
    const m={};
    Store.all('demandas').forEach(d=>{ if(d.areaGestao) m[d.areaGestao]=(m[d.areaGestao]||0)+1; });
    const arr=Object.entries(m).sort((a,b)=>b[1]-a[1]);
    if(!arr.length) return `<div class="muted" style="font-size:13px">Cadastre demandas com "área de gestão" para ver o ranking aqui.</div>`;
    const max=arr[0][1];
    return `<div style="margin-bottom:10px"><span class="tag tag-gold">⭐ Mais demanda: ${UI.esc(arr[0][0])}</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${arr.map(([a,n])=>`<div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--gray-600);margin-bottom:3px"><span>${UI.esc(a)}</span><strong style="color:var(--green-700)">${n}</strong></div>
          <div class="progress"><span style="width:${Math.round(n/max*100)}%"></span></div>
        </div>`).join('')}
      </div>`;
  }

  function afterRender(){
    document.querySelectorAll('[data-go]').forEach(el=>el.onclick=()=>App.go(el.dataset.go));
    document.querySelectorAll('[data-contato]').forEach(el=>el.onclick=()=>{ App.go('relacionamentos'); window.Relacionamentos?.openFicha?.(el.dataset.contato); });
    document.querySelectorAll('[data-demanda]').forEach(el=>el.onclick=()=>{ App.go('demandas'); window.Demandas?.openCard?.(el.dataset.demanda); });
    document.querySelectorAll('[data-projeto]').forEach(el=>el.onclick=()=>{ App.go('projetos'); window.Projetos?.openFicha?.(el.dataset.projeto); });
  }

  /* helpers locais */
  function kpi(ico,cls,val,lab,sub){
    return `<div class="kpi ${cls}"><div class="kpi-ico">${ico}</div><div class="kpi-val">${val}</div><div class="kpi-lab">${lab}</div>${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`;
  }
  function ind(lab,val){
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px dashed var(--line)">
      <span style="font-size:13px;color:var(--gray-600)">${lab}</span>
      <strong style="color:var(--green-700);font-size:14px">${val}</strong></div>`;
  }
  const empty = (t)=>`<div class="empty" style="padding:24px"><div class="muted">${t}</div></div>`;
  const colLabel = (c)=>({entrada:'Caixa de entrada',analise:'Em análise',encaminhado:'Encaminhado',andamento:'Em andamento',aguardando:'Aguardando retorno',finalizado:'Finalizado'}[c]||c);
  const monthAbbr = (m)=>['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][(+m)-1];

  return { render, afterRender };
})();
