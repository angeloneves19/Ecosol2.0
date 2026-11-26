# Guia Completo — Configuração do Banco de Dados
## Projeto Trama Viamão · Rede Solidária Viamão · IFRS Campus Viamão

---

## Visão Geral

Este guia explica **passo a passo** como criar todo o banco de dados do zero no Supabase para colocar o site Trama Viamão no ar. Siga a ordem dos passos — cada etapa depende da anterior.

**Tempo estimado:** 20–30 minutos

---

## Arquivos desta pasta (execute nesta ordem)

| Arquivo | O que faz |
|---|---|
| `01_tabelas.sql` | Cria todas as 13 tabelas do banco |
| `02_rls.sql` | Configura as regras de segurança (quem pode ver/editar o quê) |
| `03_funcoes.sql` | Cria a função de cadastro atômico |
| `04_seed.sql` | Insere os dados iniciais (categorias, tipos, etc.) |

---

## PASSO 1 — Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `trama-viam` (ou o nome que preferir)
   - **Database Password:** anote essa senha em lugar seguro
   - **Region:** escolha `South America (São Paulo)`
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos enquanto o projeto é criado

---

## PASSO 2 — Configurar a URL do site (obrigatório para recuperação de senha)

> Esta configuração é essencial para o link de recuperação de senha funcionar corretamente.

1. No painel do Supabase, vá em **Authentication → URL Configuration**
2. Em **"Site URL"**, coloque o endereço onde o site está hospedado
   - Se estiver testando localmente: `http://127.0.0.1:5500` (ou a porta do seu servidor)
   - Se estiver em produção: `https://seusite.com.br`
3. Clique em **"Save"**

---

## PASSO 3 — Executar os arquivos SQL (os 4 arquivos desta pasta)

### Como executar:

1. No painel do Supabase, clique em **"SQL Editor"** no menu lateral esquerdo
2. Clique em **"New query"** (botão no topo)
3. Copie **todo** o conteúdo do arquivo, cole na caixa de texto
4. Clique em **"Run"** (ou pressione `Ctrl + Enter`)
5. Verifique que aparece a mensagem **"Success. No rows returned"** (ou similar sem erros)
6. Repita para cada arquivo, **na ordem indicada**

---

### PASSO 3.1 — Executar `01_tabelas.sql`

Cria as **13 tabelas** do sistema. Execute primeiro.

Tabelas criadas (em ordem de dependência):
1. `natureza_de_item` — se um item é produto ou serviço
2. `categoria_de_empreendimento` — categorias dos negócios
3. `tipo_de_item` — tipos específicos (ex: Artesanato em Argila)
4. `empreendimento` — os negócios/cooperativas cadastrados na rede
5. `usuario` — perfis dos usuários
6. `usuario_empreendimento` — quem é dono de qual negócio
7. `administrador` — usuários com poderes de admin
8. `item` — produtos e serviços de cada negócio
9. `foto_item` — galeria de fotos de cada item
10. `foto_empreendimento` — galeria de fotos do perfil do empreendimento
11. `item_tipo_de_item` — relação entre itens e seus tipos
12. `endereco` — endereços dos empreendimentos
13. `config_home` — configurações editáveis da página inicial

✅ **Como saber que funcionou:** no menu lateral, clique em "Table Editor" — você verá as 13 tabelas listadas.

---

### PASSO 3.2 — Executar `02_rls.sql`

Configura o **RLS (Row Level Security)** — as regras de segurança que definem:
- Quem pode **ver** cada tabela
- Quem pode **editar/deletar** cada registro

> **Por que o RLS é necessário?**
> O Supabase, por padrão, bloquearia todas as requisições da API. Com o RLS você abre exatamente o que precisa — nem mais, nem menos.

**Regras aplicadas:**
- Dados públicos (empreendimentos, itens, endereços) → qualquer pessoa pode ver
- Dados pessoais → só o próprio usuário edita
- Dados admin (aprovações, configurações) → só administradores

✅ **Como saber que funcionou:** em "Table Editor", clique numa tabela qualquer → clique em "Policies" → você verá as policies criadas.

---

### PASSO 3.3 — Executar `03_funcoes.sql`

Cria a **função `cadastrar_empreendimento`** — uma função no banco que o frontend chama no momento do cadastro.

> **Por que uma função e não inserção direta?**
> O cadastro precisa criar registros em 3 tabelas ao mesmo tempo (usuario, empreendimento, usuario_empreendimento). Se uma falhar, as outras precisam ser desfeitas juntas. Isso se chama **operação atômica** e só é possível confiável via função no banco.

✅ **Como saber que funcionou:** no menu lateral, clique em "Database" → "Functions" → você verá a função `cadastrar_empreendimento` listada.

---

### PASSO 3.4 — Executar `04_seed.sql`

Insere os **dados iniciais** necessários para o site funcionar:
- 2 naturezas de item: `produto` e `servico`
- 11 categorias de empreendimento (Alimentação, Artesanato, etc.)
- 16 tipos de item:
  - **Produto:** Alimento, Bebida, Comida, Roupa, Ferramenta, Artesanato, Higiene e Limpeza
  - **Serviço:** Avulso, Locação, Assinatura, Reserva, Agendamento, Instalação, Licença, Consultoria, Aula
- Configuração padrão da página inicial

> Este arquivo pode ser executado novamente sem problemas — ele usa `ON CONFLICT DO NOTHING` para não duplicar dados.

✅ **Como saber que funcionou:** em "Table Editor", abra a tabela `categoria_de_empreendimento` — você verá as categorias inseridas.

---

## PASSO 4 — Criar os buckets de armazenamento de fotos

O sistema usa **dois buckets** no Supabase Storage — um para fotos dos itens e outro para fotos dos perfis de empreendimento. Ambos precisam ser criados manualmente.

### PASSO 4.1 — Bucket `fotos` (fotos dos itens)

1. No painel do Supabase, clique em **"Storage"** no menu lateral
2. Clique em **"New bucket"**
3. Preencha:
   - **Name:** `fotos` *(exatamente assim, em minúsculo)*
   - Marque **"Public bucket"** ✓ *(as fotos precisam ser acessíveis publicamente)*
4. Clique em **"Save"**

### Configurar permissões do bucket `fotos`:

Após criar o bucket, configure as políticas de acesso:

1. Clique no bucket `fotos` que acabou de criar
2. Clique em **"Policies"** (aba no topo)
3. Clique em **"New policy"** → escolha **"For full customization"**
4. Crie a política de leitura pública:
   - **Policy name:** `Leitura pública de fotos`
   - **Allowed operation:** `SELECT`
   - **Target roles:** `anon, authenticated`
   - **Policy definition:** `true`
   - Salve
5. Crie a política de upload para autenticados:
   - **Policy name:** `Upload autenticado de fotos`
   - **Allowed operation:** `INSERT`
   - **Target roles:** `authenticated`
   - **Policy definition:** `true`
   - Salve
6. Crie a política de update/delete:
   - **Policy name:** `Atualização autenticada de fotos`
   - **Allowed operation:** `UPDATE, DELETE`
   - **Target roles:** `authenticated`
   - **Policy definition:** `true`
   - Salve

### PASSO 4.2 — Bucket `fotos-empreendimento` (fotos do perfil)

Repita o mesmo processo para criar um segundo bucket:

1. Clique em **"New bucket"** novamente
2. Preencha:
   - **Name:** `fotos-empreendimento` *(exatamente assim)*
   - Marque **"Public bucket"** ✓
3. Clique em **"Save"**

Configure as mesmas 3 políticas de acesso (leitura pública, upload autenticado, atualização autenticada), mas com nomes distintos:
- `Leitura pública de fotos-empreendimento`
- `Upload autenticado de fotos-empreendimento`
- `Atualização autenticada de fotos-empreendimento`

> **Resumo dos buckets:**
> | Bucket | Usado para | Caminho dos arquivos |
> |---|---|---|
> | `fotos` | Fotos dos itens/produtos | `itens/{id_empreendimento}/` |
> | `fotos-empreendimento` | Fotos do perfil do empreendimento | `{id_empreendimento}/` |

---

## PASSO 5 — Obter as credenciais do projeto

O frontend precisa de duas informações para se conectar ao Supabase:

1. No painel do Supabase, clique em **"Settings"** (engrenagem no menu lateral)
2. Clique em **"API"**
3. Copie:
   - **Project URL** → algo como `https://xyzxyz.supabase.co`
   - **anon public** (em "Project API Keys") → uma chave longa começando com `eyJ...`

4. Abra o arquivo **`assets/js/supabase.js`** no projeto e substitua:
   ```js
   const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co'
   const SUPABASE_KEY = 'SUA_CHAVE_ANON_AQUI'
   ```

---

## PASSO 6 — Criar o primeiro administrador

O sistema precisa de pelo menos um admin para aprovar os empreendimentos cadastrados.

**Para criar o primeiro admin:**

1. **Primeiro, crie uma conta normal pelo site** — acesse a página de cadastro (`cadastrar.html`) e crie uma conta com o e-mail que será do admin

2. **Depois, promova esse usuário a admin pelo SQL Editor:**

   No SQL Editor do Supabase, execute:
   ```sql
   -- Substitua 'email@do.admin' pelo e-mail que você cadastrou
   INSERT INTO administrador (id_usuario, situacao)
   SELECT u.id, 'ativo'
   FROM usuario u
   WHERE u.email = 'email@do.admin';
   ```

3. **Verificação:** faça logout e login novamente com esse e-mail — você deve ver o menu "Admin" no painel

---

## PASSO 7 — Testar o sistema

Faça estes testes na ordem para confirmar que tudo está funcionando:

### ✅ Teste 1 — Busca pública funciona
- Acesse `index.html` no navegador
- A página deve carregar sem erros no console (F12)

### ✅ Teste 2 — Cadastro de empreendimento funciona
- Acesse `pages/cadastrar.html`
- Cadastre um empreendimento de teste
- Após o cadastro, você deve ser redirecionado para `status-pendente.html`
- No Supabase → Table Editor → `empreendimento`, o novo registro deve aparecer com `id_situacao = 1`

### ✅ Teste 3 — Painel do empreendedor funciona
- Faça login com a conta criada no teste anterior
- Acesse `pages/painel.html`
- O painel deve mostrar o empreendimento (mesmo com situação Pendente)

### ✅ Teste 4 — Aprovação pelo admin funciona
- Faça login com a conta de admin
- Acesse `pages/admin.html`
- O empreendimento de teste deve aparecer na lista de pendentes
- Aprove o empreendimento (muda `id_situacao` para 2)
- Acesse `index.html` e busque — o empreendimento deve aparecer nos resultados

### ✅ Teste 5 — Recuperação de senha funciona
- Faça logout
- Acesse `pages/entrar.html` → clique em "Esqueci minha senha"
- Digite o e-mail cadastrado
- Verifique o e-mail (pode cair no spam)
- Clique no link recebido — deve abrir `redefinir-senha.html` com o formulário de nova senha

### ✅ Teste 6 — Upload de foto funciona
- Faça login como empreendedor
- Acesse `pages/perfil.html`
- Clique em "Trocar foto" e envie uma imagem
- A foto deve aparecer no perfil

---

## Estrutura do Banco de Dados (Resumo Visual)

```
auth.users (Supabase Auth — gerenciado automaticamente)
    │
    └─► usuario (perfil do usuário)
            │
            ├─► usuario_empreendimento ◄─── empreendimento ◄─── categoria_de_empreendimento
            │                                     │
            └─► administrador                     ├─► endereco
                                                  └─► item ◄─── tipo_de_item ◄─── natureza_de_item
                                                          │
                                                          ├─► foto_item
                                                          └─► item_tipo_de_item

config_home (configurações da página inicial — editadas pelo admin)
```

---

## Situações (id_situacao)

### Empreendimentos

| Código | Significado | Aparece na busca? |
|---|---|---|
| 1 | Pendente (aguarda aprovação do admin) | Não |
| 2 | Ativo | **Sim** |
| 4 | Suspenso (admin bloqueou temporariamente) | Não |
| 5 | Recusado (admin recusou o cadastro) | Não |
| 6 | Excluído | Não |

### Itens (produtos/serviços)

Itens cadastrados pelo empreendedor **já nascem ativos** (`id_situacao = 2`). Não há fila de aprovação para itens — apenas para o empreendimento. O admin pode suspender ou excluir um item a qualquer momento.

| Código | Significado |
|---|---|
| 2 | Ativo (padrão ao criar) |
| 4 | Suspenso |
| 5 | Recusado |
| 6 | Excluído |

---

## Problemas Comuns

### "Não consigo fazer login — diz que e-mail não confirmado"
Vá em Supabase → Authentication → Settings → desmarque **"Enable email confirmations"** durante o desenvolvimento (ou configure um servidor SMTP real).

### "A busca não retorna resultados"
Verifique se o empreendimento tem `id_situacao = 2`. Apenas empreendimentos ativos aparecem na busca.

### "Erro ao fazer upload de foto"
Verifique se o bucket `fotos` foi criado como **público** e se as policies de INSERT foram criadas corretamente.

### "Painel de admin não aparece"
Verifique se o usuário está na tabela `administrador` com `situacao = 'ativo'` e se fez logout/login após a inserção.

### "Link de recuperação de senha não funciona"
Verifique se a **Site URL** em Authentication → URL Configuration está correta com o endereço do site.

---

## Tecnologias Utilizadas

- **Supabase** — Backend as a Service (banco PostgreSQL, autenticação, storage)
- **HTML / CSS / JavaScript** — Frontend estático puro (sem framework)
- **ES Modules** — organização do JavaScript em módulos
- **ViaCEP** — API gratuita para busca de endereço por CEP

---

*Projeto Trama Viamão · IFRS Campus Viamão*
