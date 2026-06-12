/* =====================================================================
   MÓDULO — DESPACHO COM A DIRETORIA EXECUTIVA
   Status: A despachar → Em andamento → Finalizado
   ===================================================================== */
const Despacho = (() => {

  const TIPO_TAG = { 'Ciência':'tag-blue','Acompanhamento':'tag-amber','Deliberação':'tag-red','Orientação':'tag-green' };

  let filtroAtual = 'pendente'; // 'pendente' | 'andamento' | 'finalizado'

  /* ── Status de cada pauta ── */
  function status(d){
    if(d.despachoFinalizado) return 'finalizado';
    if(d.despachoRealizado)  return 'andamento';
    return 'pendente';
  }

  function pautas(){
    return Store.all('demandas').filter(d => d.despacho)
      .sort((a,b) => (b.despachoData||'').localeCompare(a.despachoData||''));
  }

  function pautasFiltradas(){
    return pautas().filter(d => status(d) === filtroAtual);
  }

  /* ── Render principal ── */
  function render(){
    const lista  = pautas();
    const pend   = lista.filter(d => status(d) === 'pendente').length;
    const anda   = lista.filter(d => status(d) === 'andamento').length;
    const fin    = lista.filter(d => status(d) === 'finalizado').length;
    const filtradas = pautasFiltradas();

    const filtros = [
      { id:'pendente',  label:'A despachar',       ico:'⏳', n: pend },
      { id:'andamento', label:'Em andamento',       ico:'🔄', n: anda },
      { id:'finalizado',label:'Finalizado',         ico:'✅', n: fin  },
    ];

    return `
    <div class="section-head">
      <div><div class="eyebrow">Governança</div><h2>Despacho — Diretoria Executiva</h2>
        <div class="sub">Pautas do despacho semanal com o diretor executivo</div></div>
      <button class="btn btn-gold" id="desp-pdf">🖨️ Gerar PDF para impressão</button>
    </div>

    <div class="kpi-grid">
      ${kpi('🗣️','',lista.length,'Total de pautas')}
      ${kpi('⏳','amber',pend,'A despachar')}
      ${kpi('🔄','blue',anda,'Em andamento')}
      ${kpi('✅','',fin,'Finalizadas')}
    </div>

    <div class="desp-filtros">
      ${filtros.map(f=>`
        <button class="desp-filtro-btn ${filtroAtual===f.id?'ativo':''}" data-filtro="${f.id}">
          ${f.ico} ${f.label} <span class="desp-filtro-n">${f.n}</span>
        </button>`).join('')}
    </div>

    ${lista.length===0
      ? `<div class="empty"><div class="big">🗣️</div>Nenhuma pauta no despacho.<br/><span class="muted">Em uma demanda, use "Enviar para despacho da Diretoria Executiva".</span></div>`
      : filtradas.length===0
        ? `<div class="empty"><div class="big">${filtros.find(f=>f.id===filtroAtual).ico}</div>Nenhuma pauta nesta categoria.</div>`
        : filtradas.map(rowHTML).join('')
    }`;
  }

  /* ── Card de pauta ── */
  function rowHTML(d){
    const c = d.contatoId ? Store.byId('contatos', d.contatoId) : null;
    const p = d.projetoId ? Store.byId('projetos', d.projetoId) : null;
    const st = status(d);

    const statusBadge = {
      pendente:   `<span class="desp-status pendente">⏳ A despachar</span>`,
      andamento:  `<span class="desp-status andamento">🔄 Em andamento</span>`,
      finalizado: `<span class="desp-status finalizado">✅ Finalizado</span>`,
    }[st];

    // Histórico de despachos registrados
    const historico = (d.despachoRegistros||[]).map((r,i) => `
      <div class="desp-hist-item">
        <div class="desp-hist-data">📅 ${UI.fmtDate(r.data)}</div>
        ${r.deliberacoes ? `<div class="desp-hist-field"><strong>Deliberações:</strong> ${UI.esc(r.deliberacoes)}</div>` : ''}
        ${r.obs ? `<div class="desp-hist-field"><strong>Observações:</strong> ${UI.esc(r.obs)}</div>` : ''}
        <div class="desp-hist-field">${r.finalizado ? '✅ Pauta finalizada neste despacho' : '🔄 Ainda em andamento'}</div>
      </div>`).join('');

    return `
    <div class="insight desp-card" data-id="${d.id}">
      <div class="desp-card-top">
        <div class="desp-card-info">
          <div class="in-tit">${UI.esc(d.titulo)}</div>
          <div class="in-desc">
            <span class="tag ${TIPO_TAG[d.despachoTipo]||'tag'}" style="padding:1px 8px">${UI.esc(d.despachoTipo||'—')}</span>
            ${c ? ` · 👤 ${UI.esc(c.nome)}` : ''}
            ${p ? ` · 🎯 ${UI.esc(p.nome)}` : ''}
            · enviada ${d.despachoData ? UI.fmtDate(d.despachoData) : '—'}
          </div>
          ${statusBadge}
        </div>
        <div class="desp-card-actions">
          ${st !== 'finalizado' ? `<button class="btn btn-primary btn-sm desp-registrar" data-id="${d.id}">📋 Registrar Despacho</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-abrir="${d.id}">Ver demanda</button>
        </div>
      </div>
      ${historico ? `
        <div class="desp-historico">
          <div class="desp-hist-titulo">📌 Histórico de despachos</div>
          ${historico}
        </div>` : ''}
    </div>`;
  }

  /* ── afterRender ── */
  function afterRender(){
    // Filtros
    document.querySelectorAll('[data-filtro]').forEach(btn => {
      btn.addEventListener('click', () => {
        filtroAtual = btn.dataset.filtro;
        App.go('despacho');
      });
    });

    // Registrar despacho
    document.querySelectorAll('.desp-registrar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalDespacho(btn.dataset.id));
    });

    // Ver demanda
    document.querySelectorAll('[data-abrir]').forEach(el => {
      el.addEventListener('click', () => Demandas.openCard(el.dataset.abrir));
    });

    document.getElementById('desp-pdf')?.addEventListener('click', gerarPDF);
  }

  /* ── Modal de registro de despacho ── */
  function abrirModalDespacho(id){
    const d = Store.byId('demandas', id);
    if(!d) return;

    UI.openModal('Registrar Despacho', `
      <div style="margin-bottom:14px">
        <strong style="color:var(--green-900)">${UI.esc(d.titulo)}</strong>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">
          ${UI.esc(d.despachoTipo||'—')} · enviada ${d.despachoData?UI.fmtDate(d.despachoData):'—'}
        </div>
      </div>

      <div class="field">
        <label>Data do Despacho *</label>
        <input type="date" id="desp-data" value="${new Date().toISOString().slice(0,10)}">
      </div>

      <div class="field">
        <label>Deliberações</label>
        <textarea id="desp-delib" rows="3" placeholder="O que foi decidido, encaminhado ou orientado pelo diretor…"></textarea>
      </div>

      <div class="field">
        <label>Observações</label>
        <textarea id="desp-obs" rows="2" placeholder="Pontos de atenção, próximos passos, contexto adicional…"></textarea>
      </div>

      <div class="field">
        <label style="font-weight:700;color:var(--green-900)">Esta pauta está finalizada?</label>
        <div style="display:flex;gap:10px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="desp-fin" value="sim" id="desp-fin-sim"> Sim — mover para Finalizado
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="desp-fin" value="nao" id="desp-fin-nao" checked> Não — continua em andamento
          </label>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="desp-salvar">Salvar Registro</button>
      </div>
    `);

    setTimeout(() => {
      document.getElementById('desp-salvar')?.addEventListener('click', () => {
        const data      = document.getElementById('desp-data')?.value;
        const delib     = document.getElementById('desp-delib')?.value.trim();
        const obs       = document.getElementById('desp-obs')?.value.trim();
        const finalizado = document.getElementById('desp-fin-sim')?.checked;

        if(!data){ UI.toast('Informe a data do despacho.','⚠'); return; }

        // Adiciona ao histórico
        const registro = { data, deliberacoes: delib, obs, finalizado };
        const registros = d.despachoRegistros || [];
        registros.push(registro);

        // Atualiza status
        d.despachoRegistros  = registros;
        d.despachoRealizado  = true;
        d.despachoFinalizado = finalizado;
        d.despachoAlinhada   = finalizado; // compatibilidade com badge do nav
        d.despachoAlinhadaData = finalizado ? data : null;

        Store.upsert('demandas', d);
        UI.closeModal();
        filtroAtual = finalizado ? 'finalizado' : 'andamento';
        App.go('despacho');
        UI.toast(finalizado ? 'Pauta finalizada e registrada! ✅' : 'Despacho registrado — pauta em andamento 🔄');
      });
    }, 50);
  }

  /* ── Geração de PDF — abre modal de seleção de status ── */
  function gerarPDF(){
    const lista = pautas();
    if(!lista.length){ UI.toast('Não há pautas para imprimir','⚠'); return; }

    const pend = lista.filter(d => status(d) === 'pendente').length;
    const anda = lista.filter(d => status(d) === 'andamento').length;
    const fin  = lista.filter(d => status(d) === 'finalizado').length;

    UI.openModal('Selecionar pautas para imprimir', `
      <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Marque quais status deseja incluir na impressão:</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        <label class="desp-pdf-op">
          <input type="checkbox" id="pdf-pend" checked ${pend===0?'disabled':''}>
          <span class="desp-pdf-label">
            <span class="desp-status pendente" style="margin:0">⏳ A despachar</span>
            <span style="color:var(--muted);font-size:12px">${pend} pauta${pend!==1?'s':''}</span>
          </span>
        </label>
        <label class="desp-pdf-op">
          <input type="checkbox" id="pdf-anda" checked ${anda===0?'disabled':''}>
          <span class="desp-pdf-label">
            <span class="desp-status andamento" style="margin:0">🔄 Em andamento</span>
            <span style="color:var(--muted);font-size:12px">${anda} pauta${anda!==1?'s':''}</span>
          </span>
        </label>
        <label class="desp-pdf-op">
          <input type="checkbox" id="pdf-fin" ${fin===0?'disabled':''}>
          <span class="desp-pdf-label">
            <span class="desp-status finalizado" style="margin:0">✅ Finalizado</span>
            <span style="color:var(--muted);font-size:12px">${fin} pauta${fin!==1?'s':''}</span>
          </span>
        </label>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="pdf-confirmar">🖨️ Imprimir</button>
      </div>
    `);

    setTimeout(() => {
      document.getElementById('pdf-confirmar')?.addEventListener('click', () => {
        const selecionados = [];
        if(document.getElementById('pdf-pend')?.checked) selecionados.push('pendente');
        if(document.getElementById('pdf-anda')?.checked) selecionados.push('andamento');
        if(document.getElementById('pdf-fin')?.checked)  selecionados.push('finalizado');
        if(!selecionados.length){ UI.toast('Selecione ao menos um status.','⚠'); return; }
        UI.closeModal();
        imprimirPDF(lista.filter(d => selecionados.includes(status(d))), selecionados);
      });
    }, 50);
  }

  function imprimirPDF(lista, selecionados){
    const hoje = UI.fmtDate(new Date().toISOString());
    const stNomes = { pendente:'A despachar', andamento:'Em andamento', finalizado:'Finalizado' };
    const titulo = selecionados.length === 3
      ? 'Todas as pautas'
      : selecionados.map(s => stNomes[s]).join(' + ');

    /* Formata descrição: preserva quebras de linha e marcadores */
    function fmtDescricao(txt){
      if(!txt) return '';
      const linhas = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const temLista = linhas.some(l => /^[-•*·\d+\.]/.test(l));
      if(temLista){
        const itens = linhas.map(l => {
          const limpo = l.replace(/^[-•*·]\s*/,'').replace(/^\d+[\.\)]\s*/,'');
          return `<li>${esc(limpo)}</li>`;
        }).join('');
        return `<ul class="desc-lista">${itens}</ul>`;
      }
      return `<div class="obs">${linhas.map(l => esc(l)).join('<br>')}</div>`;
    }

    let num = 0;
    const secoes = selecionados.map(st => {
      const items = lista.filter(d => status(d) === st);
      if(!items.length) return '';
      const stLabel = { pendente:'⏳ A despachar', andamento:'🔄 Em andamento', finalizado:'✅ Finalizado' }[st];
      const rows = items.map(d => {
        num++;
        const c = d.contatoId ? Store.byId('contatos', d.contatoId) : null;
        const p = d.projetoId ? Store.byId('projetos', d.projetoId) : null;
        const registros = d.despachoRegistros || [];
        const histHtml = registros.map(r => `
          <div class="hist-bloco">
            <div class="hist-data">Despacho em ${esc(r.data)}</div>
            ${r.deliberacoes ? fmtDescricao(r.deliberacoes) : ''}
            ${r.obs ? `<div class="obs obs-it">${esc(r.obs)}</div>` : ''}
          </div>`).join('');
        return `<tr>
          <td class="num">${num}</td>
          <td>
            <strong>${esc(d.titulo)}</strong>
            ${fmtDescricao(d.descricao)}
            ${c ? `<div class="meta">👤 ${esc(c.nome)}</div>` : ''}
            ${p ? `<div class="meta">🎯 ${esc(p.nome)}</div>` : ''}
            ${histHtml}
          </td>
          <td style="white-space:nowrap">${esc(d.despachoTipo||'—')}</td>
        </tr>`;
      }).join('');
      return `
        <tr class="st-header">
          <td colspan="3" class="st-label">${stLabel}</td>
        </tr>
        ${rows}`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Pauta de Despacho — ${hoje}</title>
      <style>
        *{font-family:Georgia,'Times New Roman',serif;color:#1a201c;box-sizing:border-box}
        body{margin:40px;font-size:12px}
        h1{font-size:18px;color:#8a3a5e;margin:0 0 2px}
        .sub{color:#6b746d;font-size:11px;margin-bottom:4px}
        .subtit{color:#8a3a5e;font-size:12px;font-style:italic;margin-bottom:14px}
        .quote{font-style:italic;color:#b14a78;border-left:3px solid #c9a44c;padding:4px 12px;margin:12px 0 16px;font-size:11px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ecccdb;padding:8px 10px;vertical-align:top;text-align:left}
        th{background:#fbe9f0;color:#8a3a5e;font-size:11px}
        .st-header td{background:#f5dce8;color:#6f2f4d;font-weight:700;font-size:12px;padding:6px 10px;border-top:2px solid #c9a44c}
        .num{width:26px;text-align:center;color:#6b746d}
        .obs{color:#3a3a3a;font-size:11px;margin-top:5px;font-family:Arial,sans-serif;line-height:1.55}
        .obs-it{font-style:italic;color:#5a5a5a}
        .desc-lista{margin:5px 0 4px 16px;padding:0;font-family:Arial,sans-serif;font-size:11px;color:#3a3a3a;line-height:1.6}
        .desc-lista li{margin-bottom:2px}
        .meta{color:#6b746d;font-size:10.5px;margin-top:3px;font-family:Arial,sans-serif}
        .hist-bloco{margin-top:8px;padding:6px 8px;background:#fdf7fa;border-left:3px solid #d4a0b8;border-radius:3px}
        .hist-data{font-size:10px;color:#8a3a5e;font-weight:700;margin-bottom:3px;font-family:Arial,sans-serif}
        .foot{margin-top:20px;font-size:10px;color:#9aa39c;border-top:1px solid #e2e6e3;padding-top:8px}
        @media print{body{margin:15mm 18mm};page-break-inside:avoid}
      </style></head><body>
      <h1>Pauta de Despacho — Diretoria Executiva</h1>
      <div class="sub">Gerência de Relações Institucionais · Araújo Jorge — Hospital de Câncer · ${hoje}</div>
      <div class="subtit">${titulo}</div>
      <div class="quote">"Captação não é pedido. É construção de rede."</div>
      <table>
        <thead><tr><th class="num">#</th><th>Pauta</th><th>Finalidade</th></tr></thead>
        <tbody>${secoes}</tbody>
      </table>
      <div class="foot">Documento gerado pelo Sistema de Gestão de Relacionamento — © DAS · Deuba Assunção · ${hoje}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`;

    const w = window.open('','_blank');
    if(!w){ UI.toast('Permita pop-ups para gerar o PDF','⚠'); return; }
    w.document.write(html); w.document.close();
  }

  const esc = (s) => String(s??'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function kpi(ico,cls,val,lab){ return `<div class="kpi ${cls}"><div class="kpi-ico">${ico}</div><div class="kpi-val">${val}</div><div class="kpi-lab">${lab}</div></div>`; }

  return { render, afterRender, pautas };
})();
