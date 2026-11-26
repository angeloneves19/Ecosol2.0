-- =============================================================================
-- TRAMA VIAMÃO — Rede Solidária Viamão
-- IFRS Campus Viamão
-- =============================================================================
-- ARQUIVO 1 de 4: CRIAÇÃO DE TODAS AS TABELAS
-- Execute este arquivo PRIMEIRO, antes dos outros.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NATUREZA DE ITEM
--    Define se um item é "produto" ou "servico".
--    Sem dependências — criada primeiro.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS natureza_de_item (
  id   SERIAL PRIMARY KEY,
  nome TEXT NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CATEGORIA DE EMPREENDIMENTO
--    Categorias dos empreendimentos (ex: Artesanato, Alimentação, etc.)
--    Sem dependências — criada antes de empreendimento.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categoria_de_empreendimento (
  id   SERIAL PRIMARY KEY,
  nome TEXT NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TIPO DE ITEM
--    Tipos específicos de produto/serviço (ex: Artesanato em Argila).
--    Depende de: natureza_de_item
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipo_de_item (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  id_natureza INT REFERENCES natureza_de_item(id) ON DELETE SET NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. EMPREENDIMENTO
--    Núcleo do sistema. Cada negócio/cooperativa cadastrado na rede.
--    Depende de: categoria_de_empreendimento
--
--    id_situacao:
--      1 = Pendente (aguardando aprovação do admin)
--      2 = Ativo (visível na busca pública)
--      4 = Suspenso (admin bloqueou temporariamente)
--      5 = Recusado (admin recusou o cadastro)
--      6 = Excluído (removido definitivamente)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empreendimento (
  id                    SERIAL PRIMARY KEY,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  email                 TEXT,
  email_visivel         BOOLEAN DEFAULT true,
  id_situacao           INT NOT NULL DEFAULT 1,
  telefone1             TEXT,
  telefone1_visivel     BOOLEAN DEFAULT true,
  telefone2             TEXT,
  telefone3             TEXT,
  whatsapp1             TEXT,
  whatsapp1_visivel     BOOLEAN DEFAULT true,
  cpf                   TEXT,
  cpf_visivel           BOOLEAN DEFAULT false,
  cnpj                  TEXT,
  cnpj_visivel          BOOLEAN DEFAULT false,
  nome_fantasia         TEXT,
  nome_fantasia_visivel BOOLEAN DEFAULT true,
  site                  TEXT,
  site_visivel          BOOLEAN DEFAULT true,
  facebook              TEXT,
  facebook_visivel      BOOLEAN DEFAULT true,
  instagram             TEXT,
  instagram_visivel     BOOLEAN DEFAULT true,
  foto_url              TEXT,
  id_categoria          INT REFERENCES categoria_de_empreendimento(id) ON DELETE SET NULL,
  motivo_situacao       TEXT,       -- preenchido pelo admin ao recusar/suspender
  criado_em             TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. USUARIO
--    Perfil de cada usuário cadastrado no sistema.
--    auth_id é a chave que liga ao sistema de autenticação do Supabase (auth.users).
--    Depende de: auth.users (tabela interna do Supabase Auth)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario (
  id      SERIAL PRIMARY KEY,
  nome    TEXT,
  email   TEXT NOT NULL,
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. USUARIO_EMPREENDIMENTO
--    Tabela de ligação: quais usuários são donos de quais empreendimentos.
--    Um usuário pode ter um empreendimento; um empreendimento pode ter vários donos.
--    Depende de: usuario, empreendimento
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_empreendimento (
  id                SERIAL PRIMARY KEY,
  id_usuario        INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_empreendimento INT NOT NULL REFERENCES empreendimento(id) ON DELETE CASCADE
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ADMINISTRADOR
--    Usuários com poderes administrativos (aprovam empreendimentos, editam config).
--    Depende de: usuario
--
--    situacao: 'ativo' (pode fazer tudo) | 'inativo' (bloqueado)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS administrador (
  id         SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  situacao   TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  fone       TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ITEM
--    Produtos e serviços oferecidos por cada empreendimento.
--    Depende de: empreendimento, tipo_de_item, natureza_de_item
--
--    id_situacao:
--      1 = Pendente (aguardando aprovação — não usado mais para itens*)
--      2 = Ativo (visível na busca pública)
--      4 = Suspenso
--      5 = Recusado
--      6 = Excluído
--
--    * Desde a versão atual, itens cadastrados pelo empreendedor já nascem
--      com id_situacao = 2 (aprovados automaticamente). O admin pode
--      suspender ou excluir a qualquer momento. Apenas o cadastro do
--      EMPREENDIMENTO fica pendente para aprovação do admin.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item (
  id                  SERIAL PRIMARY KEY,
  id_empreendimento   INT NOT NULL REFERENCES empreendimento(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  preco_atual         NUMERIC(10,2) DEFAULT 0,
  preco_atual_visivel BOOLEAN DEFAULT true,
  estoque             INT DEFAULT 0,
  estoque_visivel     BOOLEAN DEFAULT true,
  id_situacao         INT NOT NULL DEFAULT 2,
  foto_url            TEXT,
  id_tipo             INT REFERENCES tipo_de_item(id) ON DELETE SET NULL,
  id_natureza         INT REFERENCES natureza_de_item(id) ON DELETE SET NULL,
  unidade             TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FOTO_ITEM
--    Galeria de fotos de um item. seq define a ordem (1 = capa).
--    Bucket de storage: "fotos"  (pasta itens/{id_empreendimento}/)
--    Depende de: item
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foto_item (
  id         SERIAL PRIMARY KEY,
  id_item    INT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  url_imagem TEXT NOT NULL,
  seq        INT NOT NULL DEFAULT 1
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9b. FOTO_EMPREENDIMENTO
--     Galeria de fotos do empreendimento (perfil/capa). seq=1 é a foto principal.
--     Bucket de storage: "fotos-empreendimento"  (pasta {id_empreendimento}/)
--     Depende de: empreendimento
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foto_empreendimento (
  id                SERIAL PRIMARY KEY,
  id_empreendimento INT NOT NULL REFERENCES empreendimento(id) ON DELETE CASCADE,
  url_imagem        TEXT NOT NULL,
  descricao         TEXT,
  seq               INT NOT NULL DEFAULT 1
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ITEM_TIPO_DE_ITEM
--     Relação N:N entre item e tipo_de_item (um item pode ter vários tipos).
--     Complementar à coluna id_tipo direto no item.
--     Depende de: item, tipo_de_item
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_tipo_de_item (
  id_item         INT NOT NULL REFERENCES item(id) ON DELETE CASCADE,
  id_tipo_de_item INT NOT NULL REFERENCES tipo_de_item(id) ON DELETE CASCADE,
  PRIMARY KEY (id_item, id_tipo_de_item)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ENDERECO
--     Endereço(s) de um empreendimento. seq=1 é o endereço principal.
--     latitude/longitude permitem busca por proximidade (Haversine).
--     Depende de: empreendimento
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS endereco (
  id                SERIAL PRIMARY KEY,
  id_empreendimento INT NOT NULL REFERENCES empreendimento(id) ON DELETE CASCADE,
  rua               TEXT,
  numero            TEXT,
  complemento       TEXT,
  bairro            TEXT,
  cidade            TEXT,
  uf                CHAR(2),
  cep               TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  coordenadas_visivel   BOOLEAN DEFAULT true,  -- exibe o mapa no site público?
  seq                   INT NOT NULL DEFAULT 1,
  visivel               BOOLEAN DEFAULT true   -- exibe este endereço no perfil?
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. CONFIG_HOME
--     Configurações editáveis pelo administrador para a página inicial.
--     Deve ter APENAS UMA linha (singleton). Use UPDATE para alterar.
--     Depende de: auth.users (para registrar quem editou por último)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_home (
  id                  SERIAL PRIMARY KEY,
  hero_titulo         TEXT,
  hero_subtitulo      TEXT,
  hero_imagem         TEXT,       -- URL de uma imagem para o hero (compatibilidade)
  hero_imagens        TEXT[],     -- Array de URLs para o carrossel de imagens
  banner_texto        TEXT,       -- Texto do banner ecosol
  banner_cta          TEXT,       -- Texto do botão call-to-action
  sobre_texto         TEXT,       -- Texto institucional (rodapé/seção sobre)
  categorias_destaque INTEGER[],  -- IDs das categorias em destaque (máx. 4)
  atualizado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
