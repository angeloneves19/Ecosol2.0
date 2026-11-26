-- =============================================================================
-- TRAMA VIAMÃO — Rede Solidária Viamão
-- IFRS Campus Viamão
-- =============================================================================
-- ARQUIVO 2 de 4: RLS — ROW LEVEL SECURITY (Segurança por linha)
-- Execute DEPOIS do 01_tabelas.sql.
--
-- O que é RLS?
--   Por padrão o Supabase bloqueia TUDO via API. Com RLS você define
--   regras do tipo: "quem pode ver/editar o quê?".
--
-- Regras gerais deste projeto:
--   - Dados públicos (empreendimento, item, etc.) → qualquer pessoa vê
--   - Dados do usuário → só o próprio usuário edita
--   - Dados administrativos → só admins acessam
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- TABELAS DE CATÁLOGO (somente leitura pública, escrita só para admin)
-- natureza_de_item, categoria_de_empreendimento, tipo_de_item
-- ─────────────────────────────────────────────────────────────────────────────

-- natureza_de_item
ALTER TABLE natureza_de_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de natureza_de_item"
  ON natureza_de_item FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam natureza_de_item"
  ON natureza_de_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
  );

-- ──────────────────────────────────

-- categoria_de_empreendimento
ALTER TABLE categoria_de_empreendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de categoria_de_empreendimento"
  ON categoria_de_empreendimento FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam categoria_de_empreendimento"
  ON categoria_de_empreendimento FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
  );

-- ──────────────────────────────────

-- tipo_de_item
ALTER TABLE tipo_de_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de tipo_de_item"
  ON tipo_de_item FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam tipo_de_item"
  ON tipo_de_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- EMPREENDIMENTO
--   - Qualquer pessoa pode VER empreendimentos
--   - Só o dono (via usuario_empreendimento) ou admin pode editar
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE empreendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de empreendimento"
  ON empreendimento FOR SELECT USING (true);

CREATE POLICY "Dono ou admin edita empreendimento"
  ON empreendimento FOR ALL
  USING (
    -- É admin ativo?
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
    OR
    -- É o dono do empreendimento?
    EXISTS (
      SELECT 1 FROM usuario_empreendimento ue
      JOIN usuario u ON u.id = ue.id_usuario
      WHERE ue.id_empreendimento = empreendimento.id
        AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- USUARIO
--   - Usuário autenticado vê o próprio perfil
--   - Admin vê todos
--   - Cada usuário edita só o próprio perfil
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê o próprio perfil"
  ON usuario FOR SELECT
  USING (
    auth_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u2 ON u2.id = a.id_usuario
      WHERE u2.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
  );

CREATE POLICY "Usuário edita o próprio perfil"
  ON usuario FOR UPDATE
  USING (auth_id = auth.uid());

-- INSERT é feito pela função cadastrar_empreendimento (SECURITY DEFINER)
-- então não precisa de policy de INSERT aqui para o usuário comum.
CREATE POLICY "Permite insert via função de cadastro"
  ON usuario FOR INSERT
  WITH CHECK (auth_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- USUARIO_EMPREENDIMENTO
--   - Usuário autenticado vê suas próprias vinculações
--   - Admin vê todas
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE usuario_empreendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas vinculações"
  ON usuario_empreendimento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario u WHERE u.id = id_usuario AND u.auth_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
  );

CREATE POLICY "Permite insert via função de cadastro"
  ON usuario_empreendimento FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario u WHERE u.id = id_usuario AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- ADMINISTRADOR
--   - Qualquer usuário autenticado PODE LER a tabela de admins
--     (necessário para o guarda-admin.js verificar se o usuário é admin)
--   - Apenas admins ativos podem inserir/atualizar/deletar outros admins
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE administrador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura autenticada de administrador"
  ON administrador FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins ativos gerenciam equipe de admins"
  ON administrador FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- ITEM
--   - Qualquer pessoa pode VER itens
--   - Só o dono do empreendimento ou admin pode criar/editar/excluir
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de item"
  ON item FOR SELECT USING (true);

CREATE POLICY "Dono ou admin gerencia item"
  ON item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
    OR
    EXISTS (
      SELECT 1 FROM usuario_empreendimento ue
      JOIN usuario u ON u.id = ue.id_usuario
      WHERE ue.id_empreendimento = item.id_empreendimento
        AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FOTO_ITEM
--   - Leitura pública
--   - Escrita: dono do empreendimento do item ou admin
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE foto_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de foto_item"
  ON foto_item FOR SELECT USING (true);

CREATE POLICY "Dono ou admin gerencia foto_item"
  ON foto_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
    OR
    EXISTS (
      SELECT 1 FROM item i
      JOIN usuario_empreendimento ue ON ue.id_empreendimento = i.id_empreendimento
      JOIN usuario u ON u.id = ue.id_usuario
      WHERE i.id = foto_item.id_item
        AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FOTO_EMPREENDIMENTO
--   - Leitura pública
--   - Escrita: dono do empreendimento ou admin
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE foto_empreendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de foto_empreendimento"
  ON foto_empreendimento FOR SELECT USING (true);

CREATE POLICY "Dono ou admin gerencia foto_empreendimento"
  ON foto_empreendimento FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
    OR
    EXISTS (
      SELECT 1 FROM usuario_empreendimento ue
      JOIN usuario u ON u.id = ue.id_usuario
      WHERE ue.id_empreendimento = foto_empreendimento.id_empreendimento
        AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- ITEM_TIPO_DE_ITEM
--   - Leitura pública
--   - Escrita: dono ou admin (mesma lógica do item)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE item_tipo_de_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de item_tipo_de_item"
  ON item_tipo_de_item FOR SELECT USING (true);

CREATE POLICY "Dono ou admin gerencia item_tipo_de_item"
  ON item_tipo_de_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
    OR
    EXISTS (
      SELECT 1 FROM item i
      JOIN usuario_empreendimento ue ON ue.id_empreendimento = i.id_empreendimento
      JOIN usuario u ON u.id = ue.id_usuario
      WHERE i.id = item_tipo_de_item.id_item
        AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- ENDERECO
--   - Leitura pública
--   - Escrita: dono do empreendimento ou admin
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE endereco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de endereco"
  ON endereco FOR SELECT USING (true);

CREATE POLICY "Dono ou admin gerencia endereco"
  ON endereco FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid() AND a.situacao = 'ativo'
    )
    OR
    EXISTS (
      SELECT 1 FROM usuario_empreendimento ue
      JOIN usuario u ON u.id = ue.id_usuario
      WHERE ue.id_empreendimento = endereco.id_empreendimento
        AND u.auth_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- CONFIG_HOME
--   - Qualquer pessoa pode LER as configurações da home
--   - Só admins ativos podem editar
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE config_home ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública da config_home"
  ON config_home FOR SELECT USING (true);

CREATE POLICY "Apenas admins editam config_home"
  ON config_home FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM administrador a
      JOIN usuario u ON u.id = a.id_usuario
      WHERE u.auth_id = auth.uid()
    )
  );
