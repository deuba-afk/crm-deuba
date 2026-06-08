/* =====================================================================
   MÓDULO 6b — ASSISTENTE IA INSTITUCIONAL
   Resumos, atas, e-mails, mensagens, follow-ups, relatórios, prioridades.
   (Geração local baseada nos dados do CRM — sem dependência externa.)
   ===================================================================== */
const IA = (() => {

  const TOOLS = [
    { id:'ata',        ico:'📝', tit:'Gerar ata de reunião',     desc:'Transforme anotações em ata estruturada.' },
    { id:'email',      ico:'✉️', tit:'Criar e-mail institucional', desc:'E-mail formal pronto para um contato.' },
    { id:'mensagem',   ico:'💬', tit:'Criar mensagem',            desc:'Mensagem calorosa de WhatsApp.' },
    { id:'followup',   ico:'🔄', tit:'Gerar follow-up',           desc:'Retomada de contato no tom certo.' },
    { id:'relatorio',  ico:'📊', tit:'Relatório executivo',       desc:'Panorama da gestão de relacionamento.' },
    { id:'prioridades',ico:'🎯', tit:'Organizar prioridades',     desc:'O que merece sua atenção hoje.' },
    { id:'resumo',     ico:'🧾', tit:'Resumo de relacionamento',  desc:'Síntese do histórico de um contato.' },
    { id:'encaminhamento',ico:'➡️', tit:'Gerar encaminhamento',  desc:'Encaminhamento interno objetivo.' },
  ];

  function render(){
    return `
    <div class="ia-hero">
      <div class="eyebrow">Assistente Institucional</div>
      <h2>✦ Inteligência a serviço do relacionamento</h2>
      <p>Gere atas, e-mails, mensagens, follow-ups e relatórios com a identidade do Araújo Jorge. Captação não é pedido — é construção de rede, e a IA ajuda você a construí-la com elegância.</p>
    </div>
    <div class="ia-tools">
      ${TOOLS.map(t=>`<div class="ia-tool" data-tool="${t.id}">
        <div class="it-ico">${t.ico}</div><div class="it-tit">${t.tit}</div><div class="it-desc">${t.desc}</div></div>`).join('')}
    </div>
    <div id="ia-result"></div>`;
  }

  function afterRender(){
    document.querySelectorAll('[data-tool]').forEach(el=>el.onclick=()=>abrirFerramenta(el.dataset.tool));
  }

  function abrirFerramenta(id){
    const t=TOOLS.find(x=>x.id===id);
    // ferramentas que não precisam de input rodam direto
    if(id==='relatorio'||id==='prioridades'){ executar(id,{}); return; }
    const precisaContato=['email','mensagem','followup','resumo','ata','encaminhamento'].includes(id);
    UI.openModal(t.tit, `
      <form id="ia-form">
        ${precisaContato?`<div class="field"><label>Relacionamento</label><select name="contatoId"><option value="">— geral —</option>${Store.all('contatos').map(c=>`<option value="${c.id}">${UI.esc(c.nome)}</option>`).join('')}</select></div>`:''}
        ${id==='ata'?`<div class="field"><label>Assunto da reunião</label><input name="assunto" placeholder="Ex.: Patrocínio do Leilão do Bem"></div>
          <div class="field"><label>Suas anotações (tópicos) ${UI.mic('ia-notas')}</label><textarea id="ia-notas" name="notas" placeholder="- Apresentada proposta...\n- Ficou de retornar..."></textarea></div>`:''}
        ${id==='email'||id==='mensagem'||id==='followup'?`<div class="field"><label>Assunto / objetivo</label><input name="assunto" placeholder="Ex.: Convite para o Risoto Solidário"></div>`:''}
        ${id==='encaminhamento'?`<div class="field"><label>Assunto</label><input name="assunto" placeholder="Ex.: Convênio de transporte"></div><div class="field"><label>Encaminhar para</label><input name="para" value="Diretoria"></div>`:''}
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">✦ Gerar</button>
        </div>
      </form>`);
    document.getElementById('ia-form').onsubmit=(e)=>{ e.preventDefault(); const d=UI.readForm(e.target); UI.closeModal(); executar(id,d); };
  }

  function executar(id,params){
    const t=TOOLS.find(x=>x.id===id);
    const res=document.getElementById('ia-result');
    res.innerHTML=`<div class="ia-output">
      <div class="ia-out-head"><h3>${t.ico} ${t.tit}</h3><span class="muted" style="font-size:12px">gerando…</span></div>
      <div class="ia-out-body" id="ia-body"><span class="typing"></span></div></div>`;
    res.scrollIntoView({behavior:'smooth',block:'nearest'});
    const texto=gerar(id,params);
    typeOut(document.getElementById('ia-body'),texto,()=>{
      const head=res.querySelector('.ia-out-head');
      head.querySelector('.muted').outerHTML=`<button class="btn btn-gold btn-sm" id="ia-copy">📋 Copiar</button>`;
      document.getElementById('ia-copy').onclick=()=>{ navigator.clipboard?.writeText(texto); UI.toast('Conteúdo copiado'); };
    });
  }

  function typeOut(el,txt,done){
    el.textContent=''; let i=0;
    const speed=Math.max(4,Math.min(18,Math.floor(900/txt.length*10)));
    const step=Math.ceil(txt.length/120);
    const t=setInterval(()=>{
      i+=step; el.textContent=txt.slice(0,i);
      if(i>=txt.length){ clearInterval(t); el.textContent=txt; done&&done(); }
    },speed);
  }

  /* ---------------- Geradores ---------------- */
  const ASSINA = `\n\nCordialmente,\nDeuba Assunção\nGerência de Relações Institucionais\nAraújo Jorge — Hospital de Câncer`;

  function gerar(id,p){
    const c=p.contatoId?Store.byId('contatos',p.contatoId):null;
    const nome=c?c.nome:'';
    const primeiro=c?c.nome.split(' ')[0]:'';
    const hoje=UI.fmtDate(new Date().toISOString());

    if(id==='ata'){
      const notas=(p.notas||'').split('\n').map(s=>s.trim()).filter(Boolean);
      return `ATA DE REUNIÃO\nGerência de Relações Institucionais — Araújo Jorge\n`+
        `Data: ${hoje}\nAssunto: ${p.assunto||'—'}\n`+(c?`Participante externo: ${nome} (${c.cargo||c.categoria})\n`:'')+
        `Conduzido por: Deuba Assunção\n\n`+
        `1. PAUTA\n${p.assunto||'Alinhamento institucional.'}\n\n`+
        `2. PONTOS DISCUTIDOS\n${notas.length?notas.map((n,i)=>`   ${i+1}. ${n.replace(/^[-•]\s*/,'')}`).join('\n'):'   • Registrar tópicos da reunião.'}\n\n`+
        `3. ENCAMINHAMENTOS\n   • Consolidar próximos passos e responsáveis.\n   • Agendar retorno e manter o relacionamento aquecido.\n\n`+
        `4. OBSERVAÇÃO ESTRATÉGICA\n   Relacionamento é patrimônio institucional — registrar e dar continuidade.`;
    }
    if(id==='email'){
      return `Assunto: ${p.assunto||'Relações Institucionais — Araújo Jorge'}\n\n`+
        `Prezado(a) ${nome||'parceiro(a)'},\n\n`+
        `Espero que esteja bem. Escrevo em nome da Gerência de Relações Institucionais do Hospital de Câncer Araújo Jorge.\n\n`+
        `${p.assunto?`Gostaria de tratar sobre ${p.assunto.toLowerCase()}. `:''}`+
        `Sua trajetória e compromisso com causas relevantes nos inspiram a buscar uma aproximação — acreditamos que juntos podemos transformar a vida de muitos pacientes.\n\n`+
        `Ficaria honrada em agendar uma conversa no melhor momento para você.${ASSINA}`;
    }
    if(id==='mensagem'){
      return `Olá, ${primeiro||'tudo bem'}! 😊\n\nAqui é a Deuba Assunção, da Gerência de Relações Institucionais do Araújo Jorge — Hospital de Câncer.\n\n`+
        `${p.assunto?p.assunto+'. ':''}Gostaria muito de conversar com você sobre como podemos somar forças nessa causa tão importante.\n\n`+
        `Quando for um bom momento para um café ou uma ligação rápida? Um abraço carinhoso! 💚`;
    }
    if(id==='followup'){
      const dias=c?.ultimoContato?Math.abs(UI.daysFromNow(c.ultimoContato)):null;
      return `Olá, ${primeiro||'tudo bem'}!\n\n`+
        `${dias?`Faz um tempinho desde nosso último contato (${dias} dias) e `:''}passei para saber como você está e retomar nossa conversa${p.assunto?` sobre ${p.assunto.toLowerCase()}`:''}.\n\n`+
        `O vínculo com você é muito valioso para o Araújo Jorge. Podemos nos falar nos próximos dias?\n\nGrande abraço,\nDeuba Assunção`;
    }
    if(id==='resumo' && c){
      const inter=Store.all('interacoes').filter(i=>i.contatoId===c.id).sort((a,b)=>b.data.localeCompare(a.data));
      const proj=Store.all('projetos').filter(pp=>(pp.parceiros||[]).includes(c.id)||(pp.patrocinadores||[]).includes(c.id));
      return `RESUMO DE RELACIONAMENTO\n\n${c.nome} — ${c.cargo||c.categoria}\n${c.instituicao||''} · ${c.cidade||''}\n`+
        `Classificação: ${c.classificacao||'—'} | Nível: ${c.nivel||0}/5\n`+
        `Último contato: ${c.ultimoContato?UI.fmtDate(c.ultimoContato)+' ('+UI.relativeDays(c.ultimoContato)+')':'sem registro'}\n\n`+
        `INTERESSES: ${(c.interesses||[]).join(', ')||'—'}\n\n`+
        `HISTÓRICO (${inter.length} interações):\n${inter.slice(0,6).map(i=>`• ${UI.fmtDate(i.data)} — ${i.tipo}: ${i.titulo||''}`).join('\n')||'• Sem interações registradas.'}\n\n`+
        `PROJETOS: ${proj.map(x=>x.nome).join(', ')||'nenhum vínculo'}\n\n`+
        `LEITURA ESTRATÉGICA:\n${c.obs||'Manter relacionamento ativo e identificar oportunidades de articulação.'}`;
    }
    if(id==='resumo' && !c) return 'Selecione um relacionamento para gerar o resumo.';
    if(id==='encaminhamento'){
      return `ENCAMINHAMENTO INTERNO\n\nDe: Deuba Assunção (Relações Institucionais)\nPara: ${p.para||'Diretoria'}\nData: ${hoje}\nAssunto: ${p.assunto||'—'}\n`+
        (c?`Relacionamento envolvido: ${nome} — ${c.whatsapp||c.email||''}\n`:'')+
        `\nDescrição:\n${p.assunto?`Encaminho para providências o tema "${p.assunto}". `:''}Solicito análise e retorno para darmos sequência ao relacionamento.\n\n`+
        `Prioridade sugerida: Alta\nAcompanhamento: Gerência de Relações Institucionais.`;
    }
    if(id==='relatorio'){
      const ct=Store.all('contatos'), dm=Store.all('demandas'), pj=Store.all('projetos');
      const cap=pj.reduce((s,x)=>s+(x.captado||0),0), meta=pj.reduce((s,x)=>s+(x.meta||0),0);
      const estr=ct.filter(x=>['Estratégico','Mantenedor','Patrocinador'].includes(x.classificacao)).length;
      return `RELATÓRIO EXECUTIVO — RELAÇÕES INSTITUCIONAIS\nAraújo Jorge — Hospital de Câncer\nData: ${hoje}\n\n`+
        `1. REDE DE RELACIONAMENTO\n   • Total de contatos: ${ct.length}\n   • Relacionamentos estratégicos: ${estr}\n   • Categorias: ${[...new Set(ct.map(c=>c.categoria))].length} públicos de interesse\n\n`+
        `2. DEMANDAS\n   • Em aberto: ${dm.filter(d=>d.coluna!=='finalizado').length}\n   • Finalizadas: ${dm.filter(d=>d.coluna==='finalizado').length}\n   • Atrasadas: ${dm.filter(d=>d.coluna!=='finalizado'&&d.prazo&&UI.daysFromNow(d.prazo)<0).length}\n\n`+
        `3. PROJETOS & CAPTAÇÃO\n   • Projetos ativos: ${pj.filter(p=>p.status!=='Concluído').length}\n   • Captação consolidada: ${UI.brl(cap)} de ${UI.brl(meta)} (${meta?Math.round(cap/meta*100):0}%)\n${pj.map(p=>`     - ${p.nome}: ${UI.brl(p.captado)} (${p.meta?Math.round(p.captado/p.meta*100):0}%)`).join('\n')}\n\n`+
        `4. LEITURA ESTRATÉGICA\n   A rede institucional está ativa e diversificada. Recomenda-se priorizar follow-ups com relacionamentos estratégicos e acelerar a captação dos projetos abaixo da meta.\n\n`+
        `   "Captação não é pedido. É construção de rede."`;
    }
    if(id==='prioridades'){
      const dm=Store.all('demandas').filter(d=>d.coluna!=='finalizado');
      const altas=dm.filter(d=>d.prioridade==='Alta');
      const atras=dm.filter(d=>d.prazo&&UI.daysFromNow(d.prazo)<0);
      const fups=Store.all('contatos').filter(c=>c.ultimoContato&&Math.abs(UI.daysFromNow(c.ultimoContato))>=30);
      const bdays=Store.all('contatos').filter(c=>{ if(!c.aniversario)return false; const[,m,d]=c.aniversario.split('-').map(Number); const h=new Date();h.setHours(0,0,0,0); let pr=new Date(h.getFullYear(),m-1,d); if(pr<h)pr=new Date(h.getFullYear()+1,m-1,d); return Math.round((pr-h)/86400000)<=7; });
      return `PRIORIDADES DE HOJE — ${hoje}\n\n`+
        `🔴 URGENTE\n${atras.length?atras.map(d=>`   • Demanda atrasada: ${d.titulo} (${UI.relativeDays(d.prazo)})`).join('\n'):'   • Nenhuma demanda atrasada. 👏'}\n\n`+
        `⭐ ALTA PRIORIDADE\n${altas.length?altas.slice(0,5).map(d=>`   • ${d.titulo} — ${d.responsavel||''}`).join('\n'):'   • Sem demandas de alta prioridade pendentes.'}\n\n`+
        `🎂 RELACIONAMENTO (esta semana)\n${bdays.length?bdays.map(c=>`   • Parabenizar ${c.nome}`).join('\n'):'   • Sem aniversários nesta semana.'}\n\n`+
        `⏳ FOLLOW-UPS\n${fups.length?fups.slice(0,5).map(c=>`   • Retomar contato com ${c.nome}`).join('\n'):'   • Relacionamentos em dia.'}\n\n`+
        `Dica: dedique a primeira hora do dia ao que fortalece a rede. Relacionamento é patrimônio institucional.`;
    }
    return 'Conteúdo gerado.';
  }

  return { render, afterRender };
})();
