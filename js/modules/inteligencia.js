/* =====================================================================
   MÓDULO 6a — INTELIGÊNCIA INSTITUCIONAL
   Identifica oportunidades, alerta ausências, sugere aproximações.
   ===================================================================== */
const Inteligencia = (() => {

  function gerarInsights(){
    const contatos=Store.all('contatos');
    const projetos=Store.all('projetos');
    const demandas=Store.all('demandas');
    const out={alertas:[],oportunidades:[],sugestoes:[]};

    // 1) Ausência de contato (alertas)
    contatos.forEach(c=>{
      const dias = c.ultimoContato? Math.abs(UI.daysFromNow(c.ultimoContato)) : null;
      if(dias===null){
        out.alertas.push(ins('alert','📵',`${c.nome} sem registro de contato`,
          `Relacionamento ${c.classificacao||c.categoria} ainda sem histórico. Inicie a aproximação.`,c,[acao('Registrar interação','int',c.id)]));
      } else if(dias>=40 && ['Estratégico','Mantenedor','Patrocinador'].includes(c.classificacao)){
        out.alertas.push(ins('alert','⏰',`Relacionamento estratégico esfriando: ${c.nome}`,
          `Sem contato há ${dias} dias. ${c.classificacao} merece atenção prioritária.`,c,[acao('Falar agora','wpp',c.id),acao('Registrar','int',c.id)]));
      } else if(dias>=30){
        out.sugestoes.push(ins('warn','📨',`Hora de um follow-up com ${c.nome}`,
          `${dias} dias sem contato. Um toque mantém o vínculo aquecido.`,c,[acao('Follow-up','int',c.id)]));
      }
    });

    // 2) Aniversários (oportunidade de relacionamento)
    const hoje=new Date();hoje.setHours(0,0,0,0);
    contatos.forEach(c=>{
      if(!c.aniversario) return;
      const[,m,d]=c.aniversario.split('-').map(Number);
      let prox=new Date(hoje.getFullYear(),m-1,d); if(prox<hoje) prox=new Date(hoje.getFullYear()+1,m-1,d);
      const dd=Math.round((prox-hoje)/86400000);
      if(dd<=10) out.oportunidades.push(ins('op','🎂',`Aniversário de ${c.nome} ${dd===0?'é hoje!':dd===1?'é amanhã':'em '+dd+' dias'}`,
        `Oportunidade calorosa de aproximação. Uma mensagem pessoal fortalece a confiança.`,c,[acao('Parabenizar','wpp',c.id)]));
    });

    // 3) Projetos abaixo da meta (oportunidade de captação)
    projetos.filter(p=>p.status!=='Concluído').forEach(p=>{
      const perc=p.meta?Math.round(p.captado/p.meta*100):0;
      const dd=UI.daysFromNow(p.fim);
      if(perc<60 && dd!==null && dd<60 && dd>0){
        out.oportunidades.push(ins('op','💰',`${p.nome}: captação em ${perc}% e prazo próximo`,
          `Faltam ${UI.brl((p.meta||0)-(p.captado||0))} e ${dd} dias. Acione patrocinadores e mantenedores.`,null,[acaoProj('Ver projeto',p.id)]));
      }
    });

    // 4) Mantenedores/patrocinadores não vinculados a projetos ativos (sugestão)
    const vinculados=new Set();
    projetos.filter(p=>p.status!=='Concluído').forEach(p=>[...(p.parceiros||[]),...(p.patrocinadores||[])].forEach(id=>vinculados.add(id)));
    contatos.filter(c=>['Mantenedor','Patrocinador','Empresário'].includes(c.classificacao)||['Empresário','Patrocinador'].includes(c.categoria))
      .forEach(c=>{ if(!vinculados.has(c.id)) out.sugestoes.push(ins('tip','🔗',`Aproxime ${c.nome} de um projeto`,
        `Perfil com potencial de patrocínio sem vínculo a projetos ativos. Apresente uma causa.`,c,[acao('Ver ficha','ficha',c.id)])); });

    // 5) Demandas atrasadas (alerta)
    demandas.filter(d=>d.coluna!=='finalizado'&&d.prazo&&UI.daysFromNow(d.prazo)<0).forEach(d=>{
      out.alertas.push(ins('alert','🔴',`Demanda atrasada: ${d.titulo}`,
        `Prazo venceu ${UI.relativeDays(d.prazo)}. Responsável: ${d.responsavel||'—'}.`,null,[acaoDem('Abrir demanda',d.id)]));
    });

    // 6) Lideranças "a desenvolver" com nível baixo (sugestão de cultivo)
    contatos.filter(c=>(c.nivel||0)<=2 && ['Deputado','Senador','Vereador','Prefeito','Secretário','Liderança'].includes(c.categoria))
      .forEach(c=>out.sugestoes.push(ins('tip','🌱',`Cultive o relacionamento com ${c.nome}`,
        `${c.cargo||c.categoria} com nível de relacionamento ${c.nivel||0}/5. Investir agora gera capital institucional.`,c,[acao('Agendar contato','int',c.id)])));

    return out;
  }

  const ins=(tipo,ico,tit,desc,contato,acoes)=>({tipo,ico,tit,desc,contatoId:contato?.id,acoes:acoes||[]});
  const acao=(label,act,id)=>({label,act,id});
  const acaoProj=(label,id)=>({label,act:'proj',id});
  const acaoDem=(label,id)=>({label,act:'dem',id});

  function render(){
    const I=gerarInsights();
    const total=I.alertas.length+I.oportunidades.length+I.sugestoes.length;
    return `
    <div class="section-head">
      <div><div class="eyebrow">Leitura Estratégica da Rede</div><h2>Inteligência Institucional</h2>
        <div class="sub">${total} insights gerados a partir do seu relacionamento</div></div>
    </div>

    <div class="kpi-grid">
      ${kpi('🔴','',I.alertas.length,'Alertas','requerem ação')}
      ${kpi('💡','gold',I.oportunidades.length,'Oportunidades','para aproveitar')}
      ${kpi('🌱','blue',I.sugestoes.length,'Sugestões','de aproximação')}
    </div>

    ${grupo('🔴 Alertas','Atenção imediata',I.alertas)}
    ${grupo('💡 Oportunidades','Janelas estratégicas',I.oportunidades)}
    ${grupo('🌱 Sugestões de aproximação','Construção de rede',I.sugestoes)}

    ${total===0?`<div class="empty"><div class="big">✨</div>Sua rede está em dia. Excelente gestão de relacionamento!</div>`:''}`;
  }

  function grupo(titulo,sub,arr){
    if(!arr.length) return '';
    return `<div class="intel-cat">${titulo} <span class="badge">${arr.length}</span> <span class="muted" style="font-size:12px;font-weight:400">· ${sub}</span></div>
      ${arr.map(insightHTML).join('')}`;
  }
  function insightHTML(x){
    return `<div class="insight ${x.tipo}">
      <div class="in-ico">${x.ico}</div>
      <div class="in-main">
        <div class="in-tit">${UI.esc(x.tit)}</div>
        <div class="in-desc">${UI.esc(x.desc)}</div>
        <div class="in-act">${x.acoes.map(a=>`<button class="btn btn-ghost btn-sm" data-act="${a.act}" data-id="${a.id}">${a.label}</button>`).join('')}</div>
      </div>
    </div>`;
  }

  function afterRender(){
    document.querySelectorAll('.insight [data-act]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.id, act=b.dataset.act;
      if(act==='int'){ App.go('relacionamentos'); Relacionamentos.openInteracao(id); }
      else if(act==='wpp'||act==='ficha'){ App.go('relacionamentos'); Relacionamentos.openFicha(id); }
      else if(act==='proj'){ App.go('projetos'); Projetos.openFicha(id); }
      else if(act==='dem'){ App.go('demandas'); Demandas.openCard(id); }
    });
  }

  function kpi(ico,cls,val,lab,sub){ return `<div class="kpi ${cls}"><div class="kpi-ico">${ico}</div><div class="kpi-val">${val}</div><div class="kpi-lab">${lab}</div>${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`; }

  return { render, afterRender };
})();
