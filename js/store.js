/* =====================================================================
   STORE — Estado central + persistência CRIPTOGRAFADA (AES-256)
   Os dados são embaralhados com a sua senha (Web Crypto API).
   Sem a senha correta, o conteúdo é ilegível. A senha NÃO é armazenada.
   ===================================================================== */
const Store = (() => {
  const SEC_KEY = 'crm_deuba_sec';   // armazena o blob criptografado
  const OLD_KEY = 'crm_deuba_v1';    // versão antiga (texto puro) — será removida

  let state = null;   // dados em memória (decifrados)
  let key   = null;   // chave de criptografia em memória (perdida ao bloquear)
  let salt  = null;   // sal usado na derivação da chave
  let cloudMode = false;            // true quando logada na nuvem
  let lastRemoteUpdatedAt = null;   // controle de sincronização
  let pushTimer = null;
  const setSync = (s)=>{ if(window.onCloudSync) window.onCloudSync(s); };
  const isCloud = ()=> cloudMode;

  /* ---------- Suporte a criptografia ---------- */
  const cryptoOk = () => !!(window.crypto && window.crypto.subtle);

  /* ---------- Utilidades base64 ---------- */
  function ab2b64(buf){ let s=''; const b=new Uint8Array(buf); for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
  function b642ab(b64){ const bin=atob(b64); const len=bin.length; const b=new Uint8Array(len); for(let i=0;i<len;i++) b[i]=bin.charCodeAt(i); return b.buffer; }

  /* ---------- Derivação de chave (PBKDF2) ---------- */
  async function deriveKey(password, saltBytes){
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name:'PBKDF2', salt:saltBytes, iterations:150000, hash:'SHA-256' },
      baseKey, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
    );
  }

  /* ---------- Cifrar / decifrar ---------- */
  async function encryptObj(obj, k){
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, k, data);
    return { iv:Array.from(iv), ct:ab2b64(ct) };
  }
  async function decryptPayload(payload, k){
    const iv = new Uint8Array(payload.iv);
    const ct = b642ab(payload.ct);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, k, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ---------- Persistência ---------- */
  async function persist(){
    if(!key) return;
    const blob = { v:1, salt:Array.from(salt), payload: await encryptObj(state, key) };
    try{
      localStorage.setItem(SEC_KEY, JSON.stringify(blob));
    }catch(e){
      if(e && (e.name==='QuotaExceededError' || /quota/i.test(e.name||e.message||''))){
        if(window.UI) UI.toast('Armazenamento cheio! Remova anexos grandes — o último não foi salvo.','⚠');
        throw e;
      }
      throw e;
    }
  }
  // chamada síncrona usada pelos módulos — persiste localmente e (se nuvem) sobe
  function save(){
    persist().catch(e=>console.warn('persist falhou', e));
    if(cloudMode){
      setSync('saving');
      clearTimeout(pushTimer);
      pushTimer = setTimeout(()=>{
        cloudPush().then(()=>setSync('ok')).catch(()=>setSync('off'));
      }, 900);
    }
  }

  /* ---------- NUVEM (ponta-a-ponta) ---------- */
  async function cloudSignUp(email, password){
    const authp = await Cloud.authPassword(email, password);
    await Cloud.signUp(email, authp);
    return cloudUnlock(email, password);
  }

  async function cloudUnlock(email, password, vaultPassword){
    if(!cryptoOk()) throw new Error('Criptografia indisponível. Use o link online (https).');
    const authp = await Cloud.authPassword(email, password);
    await Cloud.signIn(email, authp);
    const row = await Cloud.pull();
    if(row && row.blob){
      const s = new Uint8Array(JSON.parse(row.salt));
      // tenta com a senha principal; se falhar, tenta com vaultPassword separada
      const senhasParaTentar = [password];
      if(vaultPassword && vaultPassword !== password) senhasParaTentar.push(vaultPassword);
      let st, k;
      let decifrou = false;
      for(const pwd of senhasParaTentar){
        try{
          k = await deriveKey(pwd, s);
          st = await decryptPayload(JSON.parse(row.blob), k);
          decifrou = true;
          break;
        }catch(e){ /* tenta próxima */ }
      }
      if(!decifrou){
        const err = new Error('Senha não confere com a do cadastro deste cofre.');
        err.vaultMismatch = true;
        throw err;
      }
      state=st; key=k; salt=s; cloudMode=true; lastRemoteUpdatedAt=row.updated_at;
      ensureCollections(); persist(); setSync('ok');
      return true;
    } else {
      // cofre novo — cria vazio
      const s = crypto.getRandomValues(new Uint8Array(16));
      const k = await deriveKey(password, s);
      state = (typeof SEED!=='undefined') ? SEED() : {};
      key=k; salt=s; cloudMode=true;
      ensureCollections();
      await cloudPush(); persist(); setSync('ok');
      return true;
    }
  }

  async function cloudPush(){
    const payload = await encryptObj(state, key);
    lastRemoteUpdatedAt = await Cloud.push(JSON.stringify(Array.from(salt)), JSON.stringify(payload));
  }

  // busca alterações feitas em outros aparelhos
  async function cloudRefresh(){
    if(!cloudMode || !key) return false;
    try{
      const row = await Cloud.pull();
      if(row && row.updated_at && row.updated_at !== lastRemoteUpdatedAt && row.blob){
        const st = await decryptPayload(JSON.parse(row.blob), key);
        state = st; lastRemoteUpdatedAt = row.updated_at; ensureCollections(); persist();
        setSync('ok');
        return true;
      }
      setSync('ok');
      return false;
    }catch(e){ setSync('off'); return false; }
  }

  async function cloudSignOut(){ await Cloud.signOut(); lock(); cloudMode=false; }

  const hasStore = () => !!localStorage.getItem(SEC_KEY);

  /* ---------- Desbloquear (login) ----------
     - Se já existe cofre: tenta decifrar com a senha. Falha = senha errada.
     - Se não existe: cria o cofre com a senha informada (primeiro acesso).        */
  async function unlock(password){
    if(!cryptoOk()) throw new Error('Criptografia indisponível neste contexto. Use o link online (https).');
    const raw = localStorage.getItem(SEC_KEY);
    if(raw){
      const blob = JSON.parse(raw);
      const s = new Uint8Array(blob.salt);
      const k = await deriveKey(password, s);
      try{
        const st = await decryptPayload(blob.payload, k);
        state = st; key = k; salt = s;
        ensureCollections();
        return true;
      }catch(e){
        return false; // GCM falha de autenticação = senha incorreta
      }
    } else {
      // primeiro acesso — define a senha e cria o cofre vazio
      const s = crypto.getRandomValues(new Uint8Array(16));
      const k = await deriveKey(password, s);
      state = (typeof SEED!=='undefined') ? SEED() : { contatos:[],demandas:[],projetos:[],interacoes:[],eventos:[] };
      key = k; salt = s;
      await persist();
      localStorage.removeItem(OLD_KEY); // limpa eventual versão antiga em texto puro
      return true;
    }
  }

  function lock(){ key=null; state=null; salt=null; }

  function ensureCollections(){
    ['contatos','demandas','projetos','interacoes','eventos','agenda_eventos'].forEach(c=>{ if(!state[c]) state[c]=[]; });
    if(!state.usuario) state.usuario={ nome:'Deuba Assunção' };
  }

  /* ---------- Zerar (mantém logado, dados vazios) ---------- */
  function reset(){
    state = (typeof SEED!=='undefined') ? SEED() : {};
    save();
  }

  /* ---------- API de dados (em memória) ---------- */
  const get = () => state;
  const all = (col) => (state && state[col]) || [];
  const byId = (col,id) => ((state && state[col])||[]).find(x=>x.id===id);

  function upsert(col, obj){
    if(!state[col]) state[col]=[];
    if(obj.id){
      const i=state[col].findIndex(x=>x.id===obj.id);
      if(i>=0) state[col][i]={ ...state[col][i], ...obj, atualizadoEm:Date.now() };
      else state[col].push(obj);
    } else { obj.id=uid(); obj.criadoEm=Date.now(); state[col].push(obj); }
    save(); return obj;
  }
  function remove(col,id){ if(state[col]){ state[col]=state[col].filter(x=>x.id!==id); save(); } }
  function uid(){ return 'id_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }

  /* ---------- Backup CRIPTOGRAFADO ---------- */
  function exportar(){
    const raw = localStorage.getItem(SEC_KEY);
    if(!raw){ return; }
    const blob = new Blob([raw], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`backup-crm-deuba-${new Date().toISOString().slice(0,10)}.crmbk`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  // importa um arquivo de backup criptografado, decifrando com a senha informada
  function importar(file, password, onDone){
    const reader=new FileReader();
    reader.onload=async (e)=>{
      try{
        const blob=JSON.parse(e.target.result);
        if(!blob.payload || !blob.salt) throw new Error('Arquivo de backup inválido.');
        const s=new Uint8Array(blob.salt);
        const k=await deriveKey(password, s);
        const st=await decryptPayload(blob.payload, k); // lança se senha errada
        if(cloudMode){
          // mantém a chave/sal da nuvem; só substitui os dados e sincroniza
          state=st; ensureCollections(); save();
        } else {
          state=st; key=k; salt=s; ensureCollections(); await persist();
        }
        onDone && onDone(true);
      }catch(err){
        onDone && onDone(false, (err && err.name==='OperationError') ? 'Senha do backup incorreta.' : (err.message||'Falha ao importar.'));
      }
    };
    reader.onerror=()=>onDone&&onDone(false,'Falha ao ler o arquivo.');
    reader.readAsText(file);
  }

  function stats(){
    return {
      contatos:all('contatos').length, demandas:all('demandas').length,
      projetos:all('projetos').length, interacoes:all('interacoes').length
    };
  }

  return { cryptoOk, hasStore, unlock, lock, reset, get, all, byId, upsert, remove, uid, save, exportar, importar, stats,
           isCloud, cloudSignUp, cloudUnlock, cloudRefresh, cloudSignOut };
})();
