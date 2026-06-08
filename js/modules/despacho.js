/* =====================================================================
   MÓDULO — DESPACHO COM A DIRETORIA EXECUTIVA
   Lista de pautas para o despacho semanal · geração de PDF · controle.
   ===================================================================== */
const Despacho = (() => {

  const TIPO_TAG = { 'Ciência':'tag-blue','Acompanhamento':'tag-amber','Deliberação':'tag-red','Orientação':'tag-green' };

  function pautas(){
    return Store.all('demandas').filter(d=>d.despacho)
      .sort((a,b)=> (a.despachoAlinhada?1:0)-(b.despachoAlinhada?1:0) || (b.despachoData||'').localeCompare(a.despachoData||''));
  }

  function render(){
    const lista = pautas();
    const pend = lista.filter(d=>!d.despachoAlinhada);
    const ok = lista.filter(d=>d.despachoAlinhada);
    return `
    <div class="section-head">
      <div><div class="eyebrow">Governança</div><h2>Despacho — Diretoria Executiva</h2>
        <div class="sub">Pautas do despacho semanal com o diretor executivo</div></div>
      <button class="btn btn-gold" id="desp-pdf">🖨️ Gerar PDF para impressão</button>
    </div>

    <div class="kpi-grid">
      ${kpi('🗣️','',lista.length,'Total de pautas')}
      ${kpi('⏳','amber',pend.length,'A despachar')}
      ${kpi('✅','',ok.length,'Já alinhadas')}
    </div>

    ${lista.length===0 ? `<div class="empty"><div class="big">🗣️</div>Nenhuma pauta no despacho.<br/><span class="muted">Em uma demanda, use "Enviar para despacho da Diretoria Executiva".</span></div>` : `
      <div class="intel-cat">⏳ A despachar <span class="badge">${pend.length}</span></div>
      ${pend.map(rowHTML).join('')||'<div class="muted" style="padding:6px 4px 14px">Tudo despachado. 👏</div>'}
      <div class="intel-cat">✅ Pautas alinhadas <span class="badge">${ok.length}</span></div>
      ${ok.map(rowHTML).join('')||'<div class="muted" style="padding:6px 4px">Nenhuma ainda.</div>'}
    `}`;
  }

  function rowHTML(d){
    const c=d.contatoId?Store.byId('contatos',d.contatoId):null;
    const p=d.projetoId?Store.byId('projetos',d.projetoId):null;
    return `<div class="insight ${d.despachoAlinhada?'tip':'op'}">
      <label class="desp-check" title="Marcar como alinhada com o diretor">
        <input type="checkbox" data-alinhar="${d.id}" ${d.despachoAlinhada?'checked':''}>
        <span class="desp-box">✓</span>
      </label>
      <div class="in-main" data-abrir="${d.id}" style="cursor:pointer">
        <div class="in-tit">${UI.esc(d.titulo)}</div>
        <div class="in-desc">
          <span class="tag ${TIPO_TAG[d.despachoTipo]||'tag'}" style="padding:1px 8px">${UI.esc(d.despachoTipo||'—')}</span>
          ${d.diretoriaDecisao?` · ${UI.esc(d.diretoriaDecisao)}`:''}
          ${c?` · 👤 ${UI.esc(c.nome)}`:''}${p?` · 🎯 ${UI.esc(p.nome)}`:''}
          · enviada ${d.despachoData?UI.fmtDate(d.despachoData):'—'}
          ${d.despachoAlinhada&&d.despachoAlinhadaData?` · ✅ alinhada ${UI.fmtDate(d.despachoAlinhadaData)}`:''}
        </div>
      </div>
    </div>`;
  }

  function afterRender(){
    document.querySelectorAll('[data-alinhar]').forEach(ch=>ch.onchange=()=>{
      const d=Store.byId('demandas',ch.dataset.alinhar);
      d.despachoAlinhada=ch.checked;
      d.despachoAlinhadaData=ch.checked?new Date().toISOString().slice(0,10):null;
      Store.upsert('demandas',d);
      UI.toast(ch.checked?'Pauta alinhada com o diretor ✓':'Marcação removida');
      App.go('despacho');
    });
    document.querySelectorAll('[data-abrir]').forEach(el=>el.onclick=()=>Demandas.openCard(el.dataset.abrir));
    document.getElementById('desp-pdf').onclick=gerarPDF;
  }

  function gerarPDF(){
    const lista=pautas();
    if(!lista.length){ UI.toast('Não há pautas para imprimir','⚠'); return; }
    const hoje=UI.fmtDate(new Date().toISOString());
    const linhas=lista.map((d,i)=>{
      const c=d.contatoId?Store.byId('contatos',d.contatoId):null;
      const p=d.projetoId?Store.byId('projetos',d.projetoId):null;
      return `<tr>
        <td class="num">${i+1}</td>
        <td><strong>${esc(d.titulo)}</strong>${d.descricao?`<div class="obs">${esc(d.descricao)}</div>`:''}
          ${c?`<div class="meta">Relacionamento: ${esc(c.nome)}</div>`:''}${p?`<div class="meta">Projeto: ${esc(p.nome)}</div>`:''}
          ${d.direcionadoPara?`<div class="meta">Direcionada para: ${esc(d.direcionadoPara)}</div>`:''}
          ${d.diretoriaDecisao?`<div class="meta">Decisão: ${esc(d.diretoriaDecisao)}</div>`:''}</td>
        <td>${esc(d.despachoTipo||'—')}</td>
        <td class="ck">${d.despachoAlinhada?'☑':'☐'}</td>
      </tr>`;
    }).join('');
    const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pauta de Despacho — ${hoje}</title>
      <style>
        *{font-family:Georgia,'Times New Roman',serif;color:#1a201c}
        body{margin:40px}
        h1{font-size:20px;color:#8a3a5e;margin:0 0 2px}
        .sub{color:#6b746d;font-size:12px;margin-bottom:18px}
        .quote{font-style:italic;color:#b14a78;border-left:3px solid #c9a44c;padding:4px 12px;margin:14px 0;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ecccdb;padding:8px 10px;vertical-align:top;text-align:left}
        th{background:#fbe9f0;color:#8a3a5e}
        .num{width:28px;text-align:center}
        .ck{width:60px;text-align:center;font-size:16px}
        .obs{color:#4a524c;font-size:11px;margin-top:4px;font-family:Arial,sans-serif}
        .meta{color:#6b746d;font-size:10.5px;margin-top:2px;font-family:Arial,sans-serif}
        .foot{margin-top:24px;font-size:10px;color:#9aa39c;border-top:1px solid #e2e6e3;padding-top:8px}
        @media print{ body{margin:18mm} button{display:none} }
      </style></head><body>
      <h1>Pauta de Despacho — Diretoria Executiva</h1>
      <div class="sub">Gerência de Relações Institucionais · Araújo Jorge — Hospital de Câncer · ${hoje}</div>
      <div class="quote">"Captação não é pedido. É construção de rede."</div>
      <table>
        <thead><tr><th class="num">#</th><th>Pauta</th><th>Finalidade</th><th class="ck">Alinhada</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <div class="foot">Documento gerado pelo Sistema de Gestão de Relacionamento — © DAS · Deuba Assunção · ${hoje}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`;
    const w=window.open('','_blank');
    if(!w){ UI.toast('Permita pop-ups para gerar o PDF','⚠'); return; }
    w.document.write(html); w.document.close();
  }

  const esc=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function kpi(ico,cls,val,lab){ return `<div class="kpi ${cls}"><div class="kpi-ico">${ico}</div><div class="kpi-val">${val}</div><div class="kpi-lab">${lab}</div></div>`; }

  return { render, afterRender, pautas };
})();
