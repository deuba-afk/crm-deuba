/* =====================================================================
   CLOUD — Sincronização na nuvem (Supabase) com criptografia ponta-a-ponta
   O servidor guarda apenas o conteúdo CRIPTOGRAFADO. Só a sua senha,
   no seu aparelho, desembaralha. Nem o servidor consegue ler.
   ===================================================================== */
const Cloud = (() => {
  const CFG = window.CLOUD_CONFIG || null;
  let client = null;

  const enabled = () => !!(CFG && CFG.url && CFG.key);

  async function loadLib(){
    if(window.supabase && window.supabase.createClient) return;
    await new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = res;
      s.onerror = () => rej(new Error('Sem internet para carregar a nuvem.'));
      document.head.appendChild(s);
    });
  }

  async function init(){
    if(!enabled()) return false;
    if(client) return true;
    await loadLib();
    client = window.supabase.createClient(CFG.url, CFG.key, {
      auth: { persistSession:true, autoRefreshToken:true }
    });
    return true;
  }

  // senha de autenticação = hash da senha real (a senha real NUNCA vai ao servidor)
  async function authPassword(email, pwd){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd + '::auth::' + (email||'').toLowerCase()));
    return 'A1' + Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function signUp(email, authp){
    const { data, error } = await client.auth.signUp({ email, password: authp });
    if(error) throw error;
    return data;
  }
  async function signIn(email, authp){
    const { data, error } = await client.auth.signInWithPassword({ email, password: authp });
    if(error) throw error;
    return data;
  }
  async function signOut(){ if(client) try{ await client.auth.signOut(); }catch(e){} }
  async function getUser(){ const { data } = await client.auth.getUser(); return data ? data.user : null; }
  async function hasSession(){ const { data } = await client.auth.getSession(); return !!(data && data.session); }

  async function pull(){
    const { data, error } = await client.from('vault').select('salt,blob,updated_at').maybeSingle();
    if(error) throw error;
    return data; // null se ainda não existe
  }
  async function push(salt, blob){
    const u = await getUser();
    if(!u) throw new Error('Sessão expirada — faça login novamente.');
    const updated_at = new Date().toISOString();
    const { error } = await client.from('vault').upsert(
      { user_id:u.id, salt, blob, updated_at },
      { onConflict:'user_id' }
    );
    if(error) throw error;
    return updated_at;
  }

  return { enabled, init, authPassword, signUp, signIn, signOut, getUser, hasSession, pull, push };
})();
