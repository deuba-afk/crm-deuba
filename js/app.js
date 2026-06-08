/* =====================================================================
   APP — Roteamento, navegação, login, shell
   ===================================================================== */
const App = (() => {
  /* A senha NÃO fica no código: ela é usada para criptografar/descriptografar
     os dados. Se a senha estiver errada, o conteúdo simplesmente não abre.    */

  const ROUTES = [
    { id:'dashboard',      label:'Dashboard',       ico:'◈', mod:()=>Dashboard,      mobile:true },
    { id:'relacionamentos',label:'Relacionamentos', ico:'❤', mod:()=>Relacionamentos,mobile:true },
    { id:'demandas',       label:'Demandas',        ico:'▤', mod:()=>Demandas,       mobile:true, badgeCol:'demandas' },
    { id:'projetos',       label:'Projetos',        ico:'◎', mod:()=>Projetos,       mobile:true },
    { id:'despacho',       label:'Despacho',        ico:'⎙', mod:()=>Despacho,       mobile:false, badgeFn:()=>Store.all('demandas').filter(d=>d.despacho&&!d.despachoAlinhada).length },
    { id:'inteligencia',   label:'Inteligência',    ico:'❖', mod:()=>Inteligencia,   mobile:false },
    { id:'ia',             label:'Assistente IA',   ico:'✦', mod:()=>IA,             mobile:false },
    { id:'agenda',         label:'Agenda',          ico:'◷', mod:()=>Agenda,         mobile:true },
  ];

  let current = 'dashboard';

  function pendingDemandas(){
    return Store.all('demandas').filter(d=>d.coluna!=='finalizado').length;
  }

  function buildNav(){
    const nav = document.getElementById('nav');
    nav.innerHTML = ROUTES.map(r=>{
      let badge='';
      if(r.badgeCol==='demandas'){ const n=pendingDemandas(); if(n) badge=`<span class="nav-badge">${n}</span>`; }
      if(r.badgeFn){ const n=r.badgeFn(); if(n) badge=`<span class="nav-badge">${n}</span>`; }
      return `<a class="nav-item ${r.id===current?'active':''}" data-route="${r.id}">
        <span class="nav-ico">${r.ico}</span><span>${r.label}</span>${badge}</a>`;
    }).join('') + `
      <a class="nav-item" data-action="backup" style="margin-top:auto">
        <span class="nav-ico">💾</span><span>Dados & Backup</span></a>`;

    nav.querySelectorAll('[data-route]').forEach(el=>{
      el.onclick = ()=>{ go(el.dataset.route); closeSidebar(); };
    });
    nav.querySelector('[data-action="backup"]').onclick = ()=>{ closeSidebar(); openBackup(); };

    // mobile tabbar
    const tab = document.getElementById('mobile-tabbar');
    tab.innerHTML = ROUTES.filter(r=>r.mobile).map(r=>`
      <a class="tab-item ${r.id===current?'active':''}" data-route="${r.id}">
        <span class="t-ico">${r.ico}</span><span>${r.label}</span></a>`).join('');
    tab.querySelectorAll('[data-route]').forEach(el=>{ el.onclick=()=>go(el.dataset.route); });
  }

  function go(routeId){
    const route = ROUTES.find(r=>r.id===routeId) || ROUTES[0];
    current = route.id;
    document.getElementById('topbar-title').textContent = route.label;
    const view = document.getElementById('view');
    view.innerHTML = route.mod().render();
    if(route.mod().afterRender) route.mod().afterRender();
    view.scrollTop = 0;
    document.querySelector('.content').scrollTo?.(0,0);
    window.scrollTo(0,0);
    buildNav();
  }

  function refresh(){ go(current); }

  /* ---------- Sidebar mobile ---------- */
  function openSidebar(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('show'); }
  function closeSidebar(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('show'); }

  /* ---------- Login ---------- */
  let cloudOn = false;       // nuvem configurada?
  let signupMode = false;    // tela de criar conta?

  function initLogin(){
    cloudOn = window.Cloud && Cloud.enabled();
    if(cloudOn) initLoginCloud();
    else initLoginLocal();
  }

  /* ---------- LOGIN NA NUVEM ---------- */
  function initLoginCloud(){
    const note = document.getElementById('login-note');
    document.getElementById('login-email-wrap').style.display = 'block';
    document.getElementById('login-user-wrap').style.display = 'none';
    document.getElementById('login-toggle').style.display = 'block';
    note.textContent = '☁️ Login na nuvem — seus dados sincronizam em todos os aparelhos, criptografados.';

    // garante a biblioteca da nuvem carregada
    Cloud.init().catch(()=>{ note.textContent = '⚠ Sem internet para conectar à nuvem. Conecte-se e recarregue.'; });

    const toggle = document.getElementById('login-toggle-link');
    toggle.onclick = (e)=>{ e.preventDefault(); setSignup(!signupMode); };
    setSignup(false);

    document.getElementById('login-form').addEventListener('submit', onCloudSubmit);
  }

  function setSignup(on){
    signupMode = on;
    document.getElementById('login-confirm-wrap').style.display = on ? 'block' : 'none';
    document.getElementById('login-btn').textContent = on ? 'Criar conta e entrar' : 'Entrar';
    document.getElementById('login-toggle-link').textContent = on ? 'Já tenho conta? Entrar' : 'Primeiro acesso? Criar conta';
    document.getElementById('login-note').textContent = on
      ? 'Crie sua conta. A senha protege e descriptografa seus dados — guarde-a bem, não há recuperação.'
      : '☁️ Login na nuvem — seus dados sincronizam em todos os aparelhos, criptografados.';
  }

  async function onCloudSubmit(e){
    e.preventDefault();
    const err = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('login-email').value.trim();
    const p = document.getElementById('login-pass').value;
    err.style.display='none';
    if(!email || !p){ err.textContent='Informe e-mail e senha.'; err.style.display='block'; return; }

    try{
      btn.disabled=true;
      await Cloud.init();
      if(signupMode){
        const p2 = document.getElementById('login-pass2').value;
        if(p.length<6){ err.textContent='Use ao menos 6 caracteres.'; err.style.display='block'; btn.disabled=false; return; }
        if(p!==p2){ err.textContent='As senhas não conferem.'; err.style.display='block'; btn.disabled=false; return; }
        btn.textContent='Criando conta…';
        await Store.cloudSignUp(email, p);
        enter();
      } else {
        btn.textContent='Entrando…';
        await Store.cloudUnlock(email, p);
        enter();
      }
    }catch(ex){
      err.textContent = traduzErroNuvem(ex);
      err.style.display='block';
    }finally{
      btn.disabled=false;
      btn.textContent = signupMode ? 'Criar conta e entrar' : 'Entrar';
    }
  }

  function traduzErroNuvem(ex){
    const m = (ex && (ex.message||ex.error_description||ex.msg)) || '';
    if(/already registered|already exists|user already/i.test(m)) return 'Este e-mail já tem conta. Clique em "Já tenho conta? Entrar".';
    if(/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos. Se é o 1º acesso, clique em "Criar conta".';
    if(/email not confirmed|not confirmed/i.test(m)) return 'Confirmação de e-mail está ligada no Supabase — desligue-a (Authentication → desativar "Confirm email").';
    if(/senha não confere/i.test(m)) return m;
    if(/Failed to fetch|NetworkError|sem internet/i.test(m)) return 'Sem conexão com a nuvem. Verifique a internet.';
    return 'Não foi possível entrar: ' + m;
  }

  /* ---------- LOGIN LOCAL (sem nuvem) ---------- */
  function initLoginLocal(){
    const firstRun = !Store.hasStore();
    const note = document.getElementById('login-note');
    const confirmWrap = document.getElementById('login-confirm-wrap');
    const userWrap = document.getElementById('login-user-wrap');
    const btn = document.getElementById('login-btn');

    if(!Store.cryptoOk()){
      note.textContent = '⚠ Para ativar a proteção dos dados, abra pelo link online (https).';
    } else if(firstRun){
      note.textContent = 'Primeiro acesso: defina sua senha de proteção. Guarde-a bem, não há recuperação.';
      confirmWrap.style.display = 'block';
      btn.textContent = 'Definir senha e entrar';
    } else {
      userWrap.style.display = 'none';
    }

    document.getElementById('login-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const err = document.getElementById('login-error');
      const passEl = document.getElementById('login-pass');
      const p = passEl.value;
      err.style.display = 'none';
      if(!Store.cryptoOk()){ err.textContent='Criptografia indisponível neste contexto.'; err.style.display='block'; return; }
      if(!p){ return; }

      const isFirst = !Store.hasStore();
      if(isFirst){
        const p2 = document.getElementById('login-pass2').value;
        if(p.length < 6){ err.textContent='Use ao menos 6 caracteres.'; err.style.display='block'; return; }
        if(p !== p2){ err.textContent='As senhas não conferem.'; err.style.display='block'; return; }
        await Store.unlock(p);
        const u = document.getElementById('login-user').value.trim();
        if(u){ const st=Store.get(); st.usuario={ nome:u }; Store.save(); }
        enter();
      } else {
        btn.disabled = true; btn.textContent='Verificando…';
        const ok = await Store.unlock(p);
        btn.disabled = false; btn.textContent='Entrar';
        if(!ok){ err.textContent='Senha incorreta.'; err.style.display='block'; passEl.value=''; return; }
        enter();
      }
    });
  }

  function enter(){
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    start();
    resetIdle();
  }

  function start(){
    buildNav();
    go('dashboard');
  }

  /* ---------- Bloqueio automático por inatividade (15 min) ---------- */
  let idleTimer=null;
  const IDLE_MS = 15*60*1000;
  function resetIdle(){ clearTimeout(idleTimer); idleTimer=setTimeout(lockNow, IDLE_MS); }
  function lockNow(){
    Store.lock();
    UI.closeModal();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    const passEl=document.getElementById('login-pass'); if(passEl) passEl.value='';
    const p2=document.getElementById('login-pass2'); if(p2) p2.value='';
    const cw=document.getElementById('login-confirm-wrap'); if(cw) cw.style.display='none';
    if(cloudOn){
      signupMode=false;
      document.getElementById('login-email-wrap').style.display='block';
      document.getElementById('login-toggle').style.display='block';
      document.getElementById('login-toggle-link').textContent='Primeiro acesso? Criar conta';
    } else {
      const uw=document.getElementById('login-user-wrap'); if(uw) uw.style.display='none';
    }
    document.getElementById('login-btn').textContent='Entrar';
    document.getElementById('login-note').textContent='🔒 Sessão bloqueada por inatividade. Digite sua senha para continuar.';
  }
  ['mousemove','keydown','click','touchstart'].forEach(ev=>{
    document.addEventListener(ev, ()=>{ if(!document.getElementById('app').classList.contains('hidden')) resetIdle(); }, { passive:true });
  });

  /* ---------- Eventos globais ---------- */
  function initGlobal(){
    document.getElementById('menu-btn').onclick = openSidebar;
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
    document.getElementById('modal-close').onclick = UI.closeModal;
    document.getElementById('modal-backdrop').onclick = (e)=>{ if(e.target.id==='modal-backdrop') UI.closeModal(); };
    document.getElementById('quick-add').onclick = quickAdd;

    const search = document.getElementById('global-search');
    search.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(search.value.trim()); });

    document.addEventListener('keydown', e=>{ if(e.key==='Escape') UI.closeModal(); });
  }

  function quickAdd(){
    UI.openModal('Ação rápida', `
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <button class="btn btn-ghost" style="padding:18px;flex-direction:column;height:auto" data-q="contato">🤝<br/>Novo relacionamento</button>
        <button class="btn btn-ghost" style="padding:18px;flex-direction:column;height:auto" data-q="demanda">🗂️<br/>Nova demanda</button>
        <button class="btn btn-ghost" style="padding:18px;flex-direction:column;height:auto" data-q="interacao">💬<br/>Registrar interação</button>
        <button class="btn btn-ghost" style="padding:18px;flex-direction:column;height:auto" data-q="projeto">🎯<br/>Novo projeto</button>
      </div>`);
    document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{
      UI.closeModal();
      const q=b.dataset.q;
      if(q==='contato' && window.Relacionamentos?.openForm) Relacionamentos.openForm();
      else if(q==='demanda' && window.Demandas?.openForm) Demandas.openForm();
      else if(q==='interacao' && window.Relacionamentos?.openInteracaoQuick) Relacionamentos.openInteracaoQuick();
      else if(q==='projeto' && window.Projetos?.openForm) Projetos.openForm();
      else UI.toast('Disponível no módulo correspondente');
    });
  }

  function openBackup(){
    const s = Store.stats();
    const cloud = Store.isCloud && Store.isCloud();
    UI.openModal('💾 Dados & Backup', `
      ${cloud ? `
      <div class="dem-section" style="margin-top:0">
        <h4>☁️ Nuvem</h4>
        <p class="muted" style="font-size:12.5px;margin-bottom:8px">Seus dados sincronizam automaticamente em todos os aparelhos (criptografados).</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="bk-sync">🔄 Sincronizar agora</button>
          <button class="btn btn-ghost btn-sm" id="bk-logout">Sair da conta</button>
        </div>
      </div>` : `
      <p class="muted" style="font-size:13px;margin-bottom:16px;line-height:1.6">
        Seus dados ficam salvos neste navegador. Use o backup para guardar uma cópia
        de segurança ou levar tudo para outro computador/celular.
      </p>`}
      <div class="info-grid" style="margin-bottom:18px">
        <div class="info-item"><div class="il">Relacionamentos</div><div class="iv">${s.contatos}</div></div>
        <div class="info-item"><div class="il">Demandas</div><div class="iv">${s.demandas}</div></div>
        <div class="info-item"><div class="il">Projetos</div><div class="iv">${s.projetos}</div></div>
        <div class="info-item"><div class="il">Interações</div><div class="iv">${s.interacoes}</div></div>
      </div>

      <div class="dem-section" style="margin-top:0">
        <h4>⬇️ Exportar (salvar cópia)</h4>
        <p class="muted" style="font-size:12.5px;margin-bottom:8px">Baixa um backup <b>criptografado</b> (.crmbk). Só abre com a sua senha — pode guardar com tranquilidade.</p>
        <button class="btn btn-primary btn-block" id="bk-export">Exportar backup criptografado</button>
      </div>

      <div class="dem-section">
        <h4>⬆️ Importar (restaurar de uma cópia)</h4>
        <p class="muted" style="font-size:12.5px;margin-bottom:8px">Carrega um backup .crmbk. Será pedida a senha usada no backup. Substitui os dados deste aparelho.</p>
        <input type="file" id="bk-file" accept=".crmbk,application/json,.json" style="display:none">
        <button class="btn btn-gold btn-block" id="bk-import">Escolher arquivo de backup…</button>
      </div>

      <div class="dem-section">
        <h4>🗑️ Limpar todos os dados</h4>
        <p class="muted" style="font-size:12.5px;margin-bottom:8px">Zera o sistema (apaga todos os relacionamentos, demandas, projetos e a agenda deste aparelho). Faça um backup antes!</p>
        <button class="btn btn-danger btn-block" id="bk-reset">Zerar sistema</button>
      </div>
    `);

    if(cloud){
      document.getElementById('bk-sync').onclick = ()=>{
        UI.toast('Sincronizando…','☁︎');
        Store.cloudRefresh().then(changed=>{ UI.toast(changed?'Atualizado com a nuvem ✓':'Já está tudo atualizado ✓'); if(changed){ UI.closeModal(); go('dashboard'); } });
      };
      document.getElementById('bk-logout').onclick = ()=>{
        UI.confirmAction('Sair da conta neste aparelho? Você precisará entrar novamente com e-mail e senha.', async ()=>{
          await Store.cloudSignOut(); UI.closeModal(); location.reload();
        });
      };
    }
    document.getElementById('bk-export').onclick = ()=>{ Store.exportar(); UI.toast('Backup criptografado exportado ✓'); };
    const fileInput = document.getElementById('bk-file');
    document.getElementById('bk-import').onclick = ()=> fileInput.click();
    fileInput.onchange = (e)=>{
      const f = e.target.files[0]; if(!f) return;
      fileInput.value=''; // permite reescolher o mesmo arquivo depois
      askImportPassword(f);
    };
    document.getElementById('bk-reset').onclick = ()=>{
      UI.confirmAction('Zerar o sistema? Tudo que foi cadastrado neste aparelho será apagado. Faça um backup antes!', ()=>{
        Store.reset(); UI.toast('Sistema zerado'); go('dashboard');
      });
    };
  }

  function askImportPassword(file){
    UI.openModal('Senha do backup', `
      <p class="muted" style="font-size:13px;margin-bottom:14px">Digite a senha que estava em uso quando este backup foi gerado.</p>
      <div class="field"><label>Senha</label><input type="password" id="imp-pass" placeholder="senha do backup"></div>
      <p id="imp-err" style="display:none;color:var(--danger);font-size:12.5px;margin-bottom:10px"></p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="imp-go">Importar</button>
      </div>`);
    const go2 = async ()=>{
      const pwd = document.getElementById('imp-pass').value;
      const err = document.getElementById('imp-err');
      if(!pwd) return;
      document.getElementById('imp-go').disabled = true;
      Store.importar(file, pwd, (ok, msg)=>{
        if(ok){ UI.closeModal(); UI.toast('Backup importado com sucesso ✓'); go('dashboard'); }
        else { err.textContent = msg || 'Falha ao importar.'; err.style.display='block'; document.getElementById('imp-go').disabled=false; }
      });
    };
    document.getElementById('imp-go').onclick = go2;
    document.getElementById('imp-pass').addEventListener('keydown', e=>{ if(e.key==='Enter') go2(); });
  }

  function doSearch(q){
    if(!q) return;
    if(window.Relacionamentos?.search){ go('relacionamentos'); Relacionamentos.search(q); }
    else UI.toast('Busca: '+q);
  }

  /* ---------- Boot ---------- */
  function boot(){
    // Expõe módulos em window (declarados com const não viram propriedade de window automaticamente)
    window.Dashboard=Dashboard; window.Relacionamentos=Relacionamentos; window.Demandas=Demandas;
    window.Projetos=Projetos; window.Despacho=Despacho; window.Inteligencia=Inteligencia; window.IA=IA;
    window.UI=UI; window.App=App; window.Store=Store; if(typeof Cloud!=='undefined') window.Cloud=Cloud;

    // indicador de sincronização na nuvem
    window.onCloudSync = (status)=>{
      const pill = document.getElementById('sync-pill'); if(!pill) return;
      pill.className = 'sync-pill ' + status;
      pill.textContent = status==='ok' ? '☁︎ Sincronizado' : status==='saving' ? '⟳ Salvando…' : '⚠ Offline';
    };

    // ao voltar para a aba, busca alterações de outros aparelhos
    document.addEventListener('visibilitychange', ()=>{
      if(!document.hidden && Store.isCloud && Store.isCloud()){
        Store.cloudRefresh().then(changed=>{ if(changed){ refresh(); UI.toast('Atualizado com a nuvem ☁︎'); } });
      }
    });

    initLogin(); initGlobal();
    if(window.Speech) Speech.init();
  }

  return { boot, go, refresh, current:()=>current, ROUTES };
})();

document.addEventListener('DOMContentLoaded', App.boot);
