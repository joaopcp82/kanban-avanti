# Kanban Avanti 🚀

Kanban com hierarquia empresa → squad → usuário.  
Stack: **Next.js 14 + Supabase + Vercel + Mercado Pago**  
Custo: **R$ 0/mês** de infraestrutura (planos gratuitos).

---

## Estrutura do projeto

```
kanban-avanti/
├── app/
│   ├── page.js              ← Landing page (site de vendas)
│   ├── pricing/page.js      ← Página de planos e preços
│   ├── login/page.js        ← Login: empresa → squad → usuário
│   ├── kanban/page.js       ← App principal (board Kanban)
│   ├── payment/success/     ← Retorno do Mercado Pago
│   └── api/
│       ├── checkout/        ← Cria preferência no Mercado Pago
│       └── mp-webhook/      ← Recebe notificações de pagamento
├── lib/supabase.js          ← Cliente Supabase
└── supabase_schema.sql      ← Schema completo do banco
```

---

## Deploy passo a passo

### 1. Supabase (banco de dados gratuito)

1. Acesse https://supabase.com e crie uma conta
2. Clique em **New project**
3. Escolha um nome (ex: `kanban-avanti`) e uma senha forte
4. Aguarde o projeto ser criado (~2 min)
5. Vá em **SQL Editor** e cole todo o conteúdo de `supabase_schema.sql`
6. Clique em **Run** — isso cria todas as tabelas e insere dados demo
7. Vá em **Settings → API** e copie:
   - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` (webhook)

### 2. Mercado Pago (pagamentos gratuito para integrar)

1. Acesse https://www.mercadopago.com.br/developers
2. Crie uma conta ou faça login
3. Vá em **Suas integrações → Criar aplicação**
4. Em **Credenciais de teste** copie:
   - `Access Token` → será `MP_ACCESS_TOKEN`
   - `Public Key` → será `NEXT_PUBLIC_MP_PUBLIC_KEY`
5. Para produção, use as **Credenciais de produção** (requer ativação da conta)

### 3. Vercel (hospedagem gratuita)

1. Faça push deste projeto para um repositório GitHub
2. Acesse https://vercel.com e faça login com o GitHub
3. Clique em **New Project** e importe o repositório
4. Na seção **Environment Variables**, adicione:

```
NEXT_PUBLIC_SUPABASE_URL         = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = eyJ...
SUPABASE_SERVICE_ROLE_KEY        = eyJ...
MP_ACCESS_TOKEN                  = APP_USR-...
NEXT_PUBLIC_MP_PUBLIC_KEY        = APP_USR-...
NEXT_PUBLIC_APP_URL              = https://seu-projeto.vercel.app
```

5. Clique em **Deploy** — pronto! ✅

### 4. Configurar webhook do Mercado Pago

Após o deploy, volte ao painel do Mercado Pago:
1. Vá em **Webhooks → Configurar**
2. URL: `https://seu-projeto.vercel.app/api/mp-webhook`
3. Eventos: `payment`

---

## Como usar em produção

### Adicionar uma nova empresa
Execute no SQL Editor do Supabase:
```sql
insert into empresas (nome, slug) values ('Minha Empresa', 'minha-empresa');
```

### Adicionar uma squad
```sql
insert into squads (empresa_id, nome)
values ((select id from empresas where slug='minha-empresa'), 'Meu Time');
```

### Adicionar um usuário
```sql
insert into usuarios (squad_id, empresa_id, nome, email)
values (
  (select id from squads where nome='Meu Time'),
  (select id from empresas where slug='minha-empresa'),
  'Nome do Usuário', 'email@empresa.com'
);
```

---

## Status do Kanban (em ordem)

| Status | Descrição |
|--------|-----------|
| Pendentes | Tarefas aguardando início |
| Em andamento | Em desenvolvimento |
| Blocked | Bloqueado por dependência |
| Concluídos | Desenvolvimento finalizado |
| Backlog | Aguardando priorização |
| Pronto p/ Teste | Aguardando QA |
| Ready to Publish | Aprovado, aguardando deploy |
| Fechados | Entregue e encerrado |

---

## Limites dos planos gratuitos

| Serviço | Limite gratuito |
|---------|----------------|
| Supabase | 500MB banco, 50MB storage, 50k usuários |
| Vercel | Projetos ilimitados, 100GB bandwidth/mês |
| Mercado Pago | Sem mensalidade — taxa ~4,99% por transação |

Para um projeto inicial com até ~100 usuários, os limites gratuitos são mais que suficientes.

---

## Próximos passos sugeridos

- [ ] Painel admin para gerenciar empresas/squads
- [ ] Editar e excluir cards
- [ ] Campo de descrição e comentários nos cards
- [ ] Data de entrega com alerta de prazo
- [ ] Notificações por e-mail (Resend — gratuito até 3k/mês)
- [ ] Autenticação real com e-mail/senha via Supabase Auth
