/* =====================================================================
   MÓDULO — DESPACHO COM AS DIRETORIAS
   3 diretorias independentes: Executiva · Corporativa · Assistência
   Status por diretoria: A despachar → Em andamento → Finalizado
   ===================================================================== */
const Despacho = (() => {

  const DIRS = {
    'Executiva':   { label:'Diretoria Executiva',    ico:'💙', bg:'#dbeafe', text:'#1d4ed8', border:'#93c5fd', headerBg:'#eff6ff' },
    'Corporativa': { label:'Diretoria Corporativa',  ico:'🩷', bg:'#fce7f3', text:'#9d174d', border:'#f9a8d4', headerBg:'#fdf2f8' },
    'Assistência': { label:'Diretoria de Assistência', ico:'🧡', bg:'#fef3c7', text:'#92400e', border:'#fcd34d', headerBg:'#fffbeb' },
  };
  const DIR_KEYS = Object.keys(DIRS);

  const TIPO_TAG = { 'Ciência':'tag-blue','Acompanhamento':'tag-amber','Deliberação':'tag-red','Orientação':'tag-green' };

  let dirAtual    = 'Executiva';
  let filtroAtual = 'pendente';

  /* ── Lê dados de uma diretoria para uma demanda (com migração do formato antigo) ── */
  function getDirData(d, dir) {
    if (d.despachoDirs?.[dir]) return d.despachoDirs[dir];
    // migração: dados antigos pertencem à Executiva
    if (dir === 'Executiva' && d.despacho) {
      return {
        tipo:       d.despachoTipo || '',
        data:       d.despachoData || '',
        realizado:  !!d.despachoRealizado,
        finalizado: !!d.despachoFinalizado,
        registros:  d.despachoRegistros || [],
        alinhada:   !!d.despachoAlinhada,
        alinhadaData: d.despachoAlinhadaData || '',
      };
    }
    return null;
  }

  function status(d, dir) {
    const dd = getDirData(d, dir);
    if (!dd) return null;
    if (dd.finalizado) return 'finalizado';
    if (dd.realizado)  return 'andamento';
    return 'pendente';
  }

  /* Todas as pautas de uma diretoria */
  function pautasDe(dir) {
    return Store.all('demandas')
      .filter(d => getDirData(d, dir) !== null)
      .sort((a, b) => {
        const da = getDirData(a, dir)?.data || '';
        const db = getDirData(b, dir)?.data || '';
        return db.localeCompare(da);
      });
  }

  /* ── Render principal ── */
  function render() {
    const dir  = DIRS[dirAtual];
    const lista = pautasDe(dirAtual);
    const pend  = lista.filter(d => status(d, dirAtual) === 'pendente').length;
    const anda  = lista.filter(d => status(d, dirAtual) === 'andamento').length;
    const fin   = lista.filter(d => status(d, dirAtual) === 'finalizado').length;
    const filtradas = lista.filter(d => status(d, dirAtual) === filtroAtual);

    // Resumo geral de todas as diretorias (para o topo)
    const resumo = DIR_KEYS.map(k => {
      const l = pautasDe(k);
      const p = l.filter(d => status(d, k) === 'pendente').length;
      return { k, cfg: DIRS[k], total: l.length, pend: p };
    });

    return `
    <div class="section-head">
      <div>
        <div class="eyebrow">Governança</div>
        <h2>Despacho com a Diretoria</h2>
        <div class="sub">Controle de pautas despachadas por diretoria</div>
      </div>
      <button class="btn btn-gold" id="desp-pdf">🖨️ Relatório PDF</button>
    </div>

    <!-- Abas das diretorias -->
    <div class="desp-tabs-wrap">
      <div class="desp-tabs">
        ${resumo.map(r => `
          <button class="desp-tab ${dirAtual === r.k ? 'ativo' : ''}" data-dir="${r.k}"
            style="${dirAtual===r.k ? `border-color:${r.cfg.border};border-bottom-color:${r.cfg.bg};background:${r.cfg.bg};color:${r.cfg.text}` : ''}">
            <span class="desp-tab-ico">${r.cfg.ico}</span>
            <span class="desp-tab-nome">${r.cfg.label}</span>
            <span class="desp-tab-badge" style="${dirAtual===r.k?`background:${r.cfg.text};color:#fff`:'background:#e5e7eb;color:#374151'}">${r.total}</span>
            ${r.pend > 0 ? `<span class="desp-tab-pend">⏳${r.pend}</span>` : ''}
          </button>`).join('')}
      </div>

      <!-- Conteúdo da aba -->
      <div class="desp-tab-content" style="border-color:${dir.border};background:${dir.headerBg}">
        <div class="kpi-grid">
          ${kpi('🗣️','',lista.length,'Total de pautas')}
          ${kpi('⏳','amber',pend,'A despachar')}
          ${kpi('🔄','blue',anda,'Em andamento')}
          ${kpi('✅','',fin,'Finalizadas')}
        </div>

        <div class="desp-filtros" style="margin-bottom:0">
          ${[
            {id:'pendente',  label:'A despachar',  ico:'⏳', n:pend},
            {id:'andamento', label:'Em andamento', ico:'🔄', n:anda},
            {id:'finalizado',label:'Finalizado',   ico:'✅', n:fin},
          ].map(f=>`
            <button class="desp-filtro-btn ${filtroAtual===f.id?'ativo':''}" data-filtro="${f.id}"
              style="${filtroAtual===f.id?`background:${dir.bg};color:${dir.text};border-color:${dir.border}`:''}">
              ${f.ico} ${f.label} <span class="desp-filtro-n">${f.n}</span>
          </button>`).join('')}
        </div>
      </div>
    </div>

    ${lista.length === 0
      ? `<div class="empty"><div class="big">${dir.ico}</div>Nenhuma pauta enviada para a ${dir.label}.<br/><span class="muted">Abra uma demanda e use o botão de envio para despacho.</span></div>`
      : filtradas.length === 0
        ? `<div class="empty"><div class="big">✨</div>Nenhuma pauta nesta categoria para a ${dir.label}.</div>`
        : filtradas.map(d => rowHTML(d, dirAtual)).join('')
    }`;
  }

  /* ── Card de pauta ── */
  function rowHTML(d, dir) {
    const cfg = DIRS[dir];
    const dd  = getDirData(d, dir);
    const c   = d.contatoId ? Store.byId('contatos', d.contatoId) : null;
    const p   = d.projetoId ? Store.byId('projetos', d.projetoId) : null;
    const st  = status(d, dir);

    // Badge de outras diretorias em que também está
    const outrasDir = DIR_KEYS.filter(k => k !== dir && getDirData(d, k) !== null);
    const outrasBadges = outrasDir.map(k =>
      `<span class="desp-dir-badge" style="background:${DIRS[k].bg};color:${DIRS[k].text};border-color:${DIRS[k].border}">${DIRS[k].ico}</span>`
    ).join('');

    const statusBadge = {
      pendente:   `<span class="desp-status pendente">⏳ A despachar</span>`,
      andamento:  `<span class="desp-status andamento">🔄 Em andamento</span>`,
      finalizado: `<span class="desp-status finalizado">✅ Finalizado</span>`,
    }[st];

    const historico = (dd?.registros || []).map(r => `
      <div class="desp-hist-item">
        <div class="desp-hist-data">📅 ${UI.fmtDate(r.data)}</div>
        ${r.deliberacoes ? `<div class="desp-hist-field"><strong>Deliberações:</strong> ${UI.esc(r.deliberacoes)}</div>` : ''}
        ${r.obs ? `<div class="desp-hist-field"><strong>Observações:</strong> ${UI.esc(r.obs)}</div>` : ''}
        <div class="desp-hist-field">${r.finalizado ? '✅ Pauta finalizada neste despacho' : '🔄 Ainda em andamento'}</div>
      </div>`).join('');

    return `
    <div class="insight desp-card" data-id="${d.id}" style="border-left:4px solid ${cfg.border}">
      <div class="desp-card-top">
        <div class="desp-card-info">
          <div class="in-tit">${UI.esc(d.titulo)}</div>
          <div class="in-desc">
            <span class="tag ${TIPO_TAG[dd?.tipo]||'tag'}" style="padding:1px 8px">${UI.esc(dd?.tipo||'—')}</span>
            ${c ? ` · 👤 ${UI.esc(c.nome)}` : ''}
            ${p ? ` · 🎯 ${UI.esc(p.nome)}` : ''}
            · enviada ${dd?.data ? UI.fmtDate(dd.data) : '—'}
            ${outrasBadges ? `<span style="margin-left:6px">também em ${outrasBadges}</span>` : ''}
          </div>
          ${statusBadge}
        </div>
        <div class="desp-card-actions">
          ${st !== 'finalizado' ? `<button class="btn btn-primary btn-sm desp-registrar" data-id="${d.id}" data-dir="${dir}" style="background:${cfg.text}">📋 Registrar Despacho</button>` : ''}
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
  function afterRender() {
    // Abas de diretoria
    document.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        dirAtual = btn.dataset.dir;
        filtroAtual = 'pendente';
        App.go('despacho');
      });
    });

    // Filtros de status
    document.querySelectorAll('[data-filtro]').forEach(btn => {
      btn.addEventListener('click', () => {
        filtroAtual = btn.dataset.filtro;
        App.go('despacho');
      });
    });

    // Registrar despacho
    document.querySelectorAll('.desp-registrar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalDespacho(btn.dataset.id, btn.dataset.dir));
    });

    // Ver demanda
    document.querySelectorAll('[data-abrir]').forEach(el => {
      el.addEventListener('click', () => Demandas.openCard(el.dataset.abrir));
    });

    document.getElementById('desp-pdf')?.addEventListener('click', gerarPDF);
  }

  /* ── Modal de registro de despacho ── */
  function abrirModalDespacho(id, dir) {
    const d   = Store.byId('demandas', id);
    if (!d) return;
    const cfg = DIRS[dir];
    const dd  = getDirData(d, dir) || {};

    UI.openModal(`Registrar Despacho — ${cfg.label}`, `
      <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:10px 14px;margin-bottom:14px">
        <div style="font-weight:700;color:${cfg.text}">${cfg.ico} ${cfg.label}</div>
        <div style="font-size:13px;color:#374151;margin-top:2px">${UI.esc(d.titulo)}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">${UI.esc(dd.tipo||'—')} · enviada ${dd.data?UI.fmtDate(dd.data):'—'}</div>
      </div>

      <div class="field">
        <label>Data do Despacho *</label>
        <input type="date" id="desp-data" value="${new Date().toISOString().slice(0,10)}">
      </div>

      <div class="field">
        <label>Deliberações</label>
        <textarea id="desp-delib" rows="3" placeholder="O que foi decidido, encaminhado ou orientado…"></textarea>
      </div>

      <div class="field">
        <label>Observações</label>
        <textarea id="desp-obs" rows="2" placeholder="Próximos passos, contexto adicional…"></textarea>
      </div>

      <div class="field">
        <label style="font-weight:700;color:${cfg.text}">Esta pauta está finalizada com a ${cfg.label}?</label>
        <div style="display:flex;gap:10px;margin-top:6px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="desp-fin" value="sim" id="desp-fin-sim"> Sim — Finalizado
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
            <input type="radio" name="desp-fin" value="nao" id="desp-fin-nao" checked> Não — Em andamento
          </label>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="desp-salvar" style="background:${cfg.text}">Salvar Registro</button>
      </div>
    `);

    setTimeout(() => {
      document.getElementById('desp-salvar')?.addEventListener('click', () => {
        const data      = document.getElementById('desp-data')?.value;
        const delib     = document.getElementById('desp-delib')?.value.trim();
        const obs       = document.getElementById('desp-obs')?.value.trim();
        const finalizado = document.getElementById('desp-fin-sim')?.checked;

        if (!data) { UI.toast('Informe a data do despacho.', '⚠'); return; }

        const ddAtual = getDirData(d, dir) || { tipo: '', data: '', realizado: false, finalizado: false, registros: [], alinhada: false, alinhadaData: '' };
        const registros = [...(ddAtual.registros || [])];
        registros.push({ data, deliberacoes: delib, obs, finalizado });

        const novoDD = {
          ...ddAtual,
          realizado:    true,
          finalizado:   finalizado,
          alinhada:     finalizado,
          alinhadaData: finalizado ? data : null,
          registros,
        };

        if (!d.despachoDirs) d.despachoDirs = {};
        d.despachoDirs[dir] = novoDD;

        // Sync campos antigos para compatibilidade (Executiva)
        if (dir === 'Executiva') {
          d.despachoRealizado  = true;
          d.despachoFinalizado = finalizado;
          d.despachoAlinhada   = finalizado;
          d.despachoAlinhadaData = finalizado ? data : null;
          d.despachoRegistros  = registros;
        }

        Store.upsert('demandas', d);
        UI.closeModal();
        filtroAtual = finalizado ? 'finalizado' : 'andamento';
        dirAtual = dir;
        App.go('despacho');
        UI.toast(finalizado ? 'Pauta finalizada! ✅' : 'Despacho registrado 🔄');
      });
    }, 50);
  }

  /* ── PDF ── */
  function gerarPDF() {
    const lista = pautasDe(dirAtual);
    if (!lista.length) { UI.toast('Nenhuma pauta para esta diretoria', '⚠'); return; }

    const pend = lista.filter(d => status(d, dirAtual) === 'pendente').length;
    const anda = lista.filter(d => status(d, dirAtual) === 'andamento').length;
    const fin  = lista.filter(d => status(d, dirAtual) === 'finalizado').length;
    const cfg  = DIRS[dirAtual];

    UI.openModal(`Relatório — ${cfg.label}`, `
      <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Selecione os status para incluir no relatório:</p>
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
        <button class="btn btn-primary" id="pdf-confirmar" style="background:${cfg.text}">🖨️ Imprimir</button>
      </div>
    `);

    setTimeout(() => {
      document.getElementById('pdf-confirmar')?.addEventListener('click', () => {
        const selecionados = [];
        if (document.getElementById('pdf-pend')?.checked) selecionados.push('pendente');
        if (document.getElementById('pdf-anda')?.checked) selecionados.push('andamento');
        if (document.getElementById('pdf-fin')?.checked)  selecionados.push('finalizado');
        if (!selecionados.length) { UI.toast('Selecione ao menos um status.', '⚠'); return; }
        UI.closeModal();
        imprimirPDF(lista.filter(d => selecionados.includes(status(d, dirAtual))), selecionados, dirAtual);
      });
    }, 50);
  }

  function imprimirPDF(lista, selecionados, dir) {
    const cfg  = DIRS[dir];
    const hoje = UI.fmtDate(new Date().toISOString());
    const stNomes = { pendente:'A despachar', andamento:'Em andamento', finalizado:'Finalizado' };
    const titulo = selecionados.length === 3 ? 'Todas as pautas' : selecionados.map(s => stNomes[s]).join(' + ');

    function fmtDescricao(txt) {
      if (!txt) return '';
      const linhas = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const temLista = linhas.some(l => /^[-•*·\d+\.]/.test(l));
      if (temLista) {
        const itens = linhas.map(l => `<li>${esc(l.replace(/^[-•*·]\s*/,'').replace(/^\d+[\.\)]\s*/,''))}</li>`).join('');
        return `<ul class="desc-lista">${itens}</ul>`;
      }
      return `<div class="obs">${linhas.map(l => esc(l)).join('<br>')}</div>`;
    }

    let num = 0;
    const secoes = selecionados.map(st => {
      const items = lista.filter(d => status(d, dir) === st);
      if (!items.length) return '';
      const stLabel = { pendente:'⏳ A despachar', andamento:'🔄 Em andamento', finalizado:'✅ Finalizado' }[st];
      const rows = items.map(d => {
        num++;
        const dd = getDirData(d, dir) || {};
        const c  = d.contatoId ? Store.byId('contatos', d.contatoId) : null;
        const p  = d.projetoId ? Store.byId('projetos', d.projetoId) : null;
        const histHtml = (dd.registros || []).map(r => `
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
          <td style="white-space:nowrap">${esc(dd.tipo||'—')}</td>
        </tr>`;
      }).join('');
      return `<tr class="st-header"><td colspan="3" class="st-label">${stLabel}</td></tr>${rows}`;
    }).join('');

    const corPrincipal = cfg.text;
    const corBg = cfg.bg;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Pauta de Despacho — ${cfg.label} — ${hoje}</title>
      <style>
        *{font-family:Georgia,'Times New Roman',serif;color:#1a201c;box-sizing:border-box}
        body{margin:40px;font-size:12px}
        h1{font-size:18px;color:${corPrincipal};margin:0 0 2px}
        .sub{color:#6b746d;font-size:11px;margin-bottom:4px}
        .subtit{color:${corPrincipal};font-size:12px;font-style:italic;margin-bottom:14px}
        .quote{font-style:italic;color:${corPrincipal};border-left:3px solid #c9a44c;padding:4px 12px;margin:12px 0 16px;font-size:11px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;text-align:left}
        th{background:${corBg};color:${corPrincipal};font-size:11px}
        .st-header td{background:${corBg};color:${corPrincipal};font-weight:700;font-size:12px;padding:6px 10px;border-top:2px solid #c9a44c}
        .num{width:26px;text-align:center;color:#6b746d}
        .obs{color:#3a3a3a;font-size:11px;margin-top:5px;font-family:Arial,sans-serif;line-height:1.55}
        .obs-it{font-style:italic;color:#5a5a5a}
        .desc-lista{margin:5px 0 4px 16px;padding:0;font-family:Arial,sans-serif;font-size:11px;color:#3a3a3a;line-height:1.6}
        .meta{color:#6b746d;font-size:10.5px;margin-top:3px;font-family:Arial,sans-serif}
        .hist-bloco{margin-top:8px;padding:6px 8px;background:#f9fafb;border-left:3px solid ${cfg.border};border-radius:3px}
        .hist-data{font-size:10px;color:${corPrincipal};font-weight:700;margin-bottom:3px;font-family:Arial,sans-serif}
        .foot{margin-top:20px;font-size:10px;color:#9aa39c;border-top:1px solid #e2e6e3;padding-top:8px}
        @media print{body{margin:15mm 18mm};page-break-inside:avoid}
      </style></head><body>
      <h1>Pauta de Despacho — ${cfg.label}</h1>
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

    const w = window.open('', '_blank');
    if (!w) { UI.toast('Permita pop-ups para gerar o PDF', '⚠'); return; }
    w.document.write(html); w.document.close();
  }

  const esc = (s) => String(s??'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function kpi(ico, cls, val, lab) { return `<div class="kpi ${cls}"><div class="kpi-ico">${ico}</div><div class="kpi-val">${val}</div><div class="kpi-lab">${lab}</div></div>`; }

  /* API pública */
  return {
    render, afterRender,
    pautas: () => pautasDe(dirAtual),
    getDirData,
    DIRS,
    DIR_KEYS,
    /* Enviar demanda para uma diretoria (chamado pelo módulo Demandas) */
    enviarParaDiretoria(d, dir, tipo) {
      if (!d.despachoDirs) d.despachoDirs = {};
      d.despachoDirs[dir] = {
        tipo, data: new Date().toISOString().slice(0,10),
        realizado: false, finalizado: false, registros: [],
        alinhada: false, alinhadaData: '',
      };
      // sync campos antigos
      if (dir === 'Executiva') {
        d.despacho = true; d.despachoTipo = tipo;
        d.despachoData = d.despachoDirs[dir].data;
        d.despachoAlinhada = false; d.despachoFinalizado = false;
        d.despachoRealizado = false; d.despachoRegistros = [];
      }
    },
    retirarDeDiretoria(d, dir) {
      if (d.despachoDirs) delete d.despachoDirs[dir];
      if (dir === 'Executiva') {
        d.despacho = false; d.despachoAlinhada = false;
        d.despachoFinalizado = false; d.despachoRealizado = false;
      }
    },
  };
})();
