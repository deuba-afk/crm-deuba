-- =====================================================================
-- CONFIGURAÇÃO DO COFRE NA NUVEM — Sistema Deuba Assunção
-- Cole este conteúdo no Supabase: menu "SQL Editor" → "New query" → Run
-- Cria a tabela do cofre + as travas de segurança (só você vê seus dados).
-- Os dados ficam CRIPTOGRAFADOS de ponta a ponta (o servidor só guarda o
-- conteúdo embaralhado; apenas a sua senha desembaralha no seu aparelho).
-- =====================================================================

create table if not exists public.vault (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  salt       text not null,
  blob       text not null,           -- conteúdo criptografado (ilegível sem a senha)
  updated_at timestamptz default now()
);

-- Liga a trava de segurança por linha (Row Level Security)
alter table public.vault enable row level security;

-- Políticas: cada usuário só acessa o PRÓPRIO cofre
create policy "vault_select_own" on public.vault
  for select using (auth.uid() = user_id);

create policy "vault_insert_own" on public.vault
  for insert with check (auth.uid() = user_id);

create policy "vault_update_own" on public.vault
  for update using (auth.uid() = user_id);

create policy "vault_delete_own" on public.vault
  for delete using (auth.uid() = user_id);
