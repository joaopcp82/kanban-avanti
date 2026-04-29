-- ============================================
-- KANBAN AVANTI — Schema Supabase
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Empresas
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  plano text default 'free' check (plano in ('free','pro','enterprise')),
  created_at timestamptz default now()
);

-- 2. Squads
create table squads (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  created_at timestamptz default now()
);

-- 3. Usuários
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references squads(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  email text unique not null,
  avatar text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- 4. Cards (tarefas)
create table cards (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references squads(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  titulo text not null,
  descricao text,
  status text not null default 'pendente' check (
    status in ('pendente','andamento','blocked','concluido','backlog','teste','publish','fechado')
  ),
  prioridade text default 'med' check (prioridade in ('high','med','low')),
  responsavel_id uuid references usuarios(id) on delete set null,
  criado_por uuid references usuarios(id) on delete set null,
  posicao integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Licenças / pagamentos
create table licencas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete cascade,
  status text default 'pendente' check (status in ('pendente','ativo','cancelado','expirado')),
  mp_payment_id text,
  valor numeric(10,2) default 1.99,
  validade_ate timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table empresas enable row level security;
alter table squads enable row level security;
alter table usuarios enable row level security;
alter table cards enable row level security;
alter table licencas enable row level security;

-- Políticas: acesso público de leitura para empresas/squads/usuarios (login sem auth)
create policy "empresas_select" on empresas for select using (true);
create policy "squads_select" on squads for select using (true);
create policy "usuarios_select" on usuarios for select using (true);

-- Cards: leitura por squad
create policy "cards_select" on cards for select using (true);
create policy "cards_insert" on cards for insert with check (true);
create policy "cards_update" on cards for update using (true);
create policy "cards_delete" on cards for delete using (true);

-- Licenças
create policy "licencas_select" on licencas for select using (true);
create policy "licencas_insert" on licencas for insert with check (true);
create policy "licencas_update" on licencas for update using (true);

-- ============================================
-- TRIGGER: atualiza updated_at nos cards
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger cards_updated_at
  before update on cards
  for each row execute function update_updated_at();

-- ============================================
-- DADOS DE DEMONSTRAÇÃO
-- ============================================

insert into empresas (nome, slug, plano) values
  ('Acme Corp', 'acme', 'pro'),
  ('Beta Sistemas', 'beta', 'free'),
  ('Delta Tech', 'delta', 'pro');

insert into squads (empresa_id, nome) values
  ((select id from empresas where slug='acme'), 'Squad Alpha'),
  ((select id from empresas where slug='acme'), 'Squad Beta'),
  ((select id from empresas where slug='beta'), 'Time Frontend'),
  ((select id from empresas where slug='beta'), 'Time Backend'),
  ((select id from empresas where slug='delta'), 'Produto');

insert into usuarios (squad_id, empresa_id, nome, email) values
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Ana Silva', 'ana@acme.com'),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'João Mendes', 'joao@acme.com'),
  ((select id from squads where nome='Squad Beta'), (select id from empresas where slug='acme'), 'Lara Costa', 'lara@acme.com'),
  ((select id from squads where nome='Time Frontend'), (select id from empresas where slug='beta'), 'Pedro Lima', 'pedro@beta.com'),
  ((select id from squads where nome='Produto'), (select id from empresas where slug='delta'), 'Fernanda Krause', 'fk@delta.com');

insert into cards (squad_id, empresa_id, titulo, status, prioridade, responsavel_id, criado_por) values
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Redesign da tela de login', 'pendente', 'high', (select id from usuarios where email='ana@acme.com'), (select id from usuarios where email='ana@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Corrigir erro no checkout', 'blocked', 'high', (select id from usuarios where email='joao@acme.com'), (select id from usuarios where email='joao@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'API de notificações push', 'andamento', 'med', (select id from usuarios where email='ana@acme.com'), (select id from usuarios where email='joao@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Migração para PostgreSQL 15', 'teste', 'med', (select id from usuarios where email='joao@acme.com'), (select id from usuarios where email='ana@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Dashboard de analytics', 'backlog', 'low', (select id from usuarios where email='ana@acme.com'), (select id from usuarios where email='ana@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Suporte a dark mode', 'concluido', 'low', (select id from usuarios where email='joao@acme.com'), (select id from usuarios where email='joao@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Integração com Slack', 'publish', 'med', (select id from usuarios where email='ana@acme.com'), (select id from usuarios where email='ana@acme.com')),
  ((select id from squads where nome='Squad Alpha'), (select id from empresas where slug='acme'), 'Documentar endpoints REST', 'fechado', 'low', (select id from usuarios where email='joao@acme.com'), (select id from usuarios where email='joao@acme.com'));
