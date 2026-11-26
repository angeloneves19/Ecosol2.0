-- =============================================================================
-- TRAMA VIAMÃO — Rede Solidária Viamão
-- IFRS Campus Viamão
-- =============================================================================
-- ARQUIVO 3 de 4: FUNÇÕES (Stored Procedures / RPC)
-- Execute DEPOIS do 02_rls.sql.
--
-- Por que usar SECURITY DEFINER?
--   Com SECURITY DEFINER a função roda com os poderes do dono (geralmente
--   o próprio Supabase/postgres), não com as permissões do usuário que chama.
--   Isso permite que a função insira em tabelas que o usuário não poderia
--   inserir diretamente, garantindo que o cadastro seja atômico e seguro.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- FUNÇÃO: cadastrar_empreendimento
--
-- O que faz:
--   Em uma única operação atômica (tudo junto ou nada):
--   1. Cria ou atualiza o registro do usuário na tabela `usuario`
--   2. Cria o empreendimento na tabela `empreendimento` (situação = 1 / Pendente)
--   3. Vincula o usuário ao empreendimento em `usuario_empreendimento`
--
-- Por que é necessária:
--   O cadastro precisa criar registros em 3 tabelas ao mesmo tempo.
--   Se uma falhar, as outras devem ser desfeitas (rollback automático).
--   Isso não seria possível de forma segura pelo frontend.
--
-- Chamada pelo frontend (cadastro.js):
--   supabase.rpc('cadastrar_empreendimento', {
--     dados: {
--       nome_empreendimento: '...',
--       nome_usuario:        '...',
--       email_usuario:       '...',
--       id_categoria:        123,
--       telefone1:           '...'
--     }
--   })
--
-- Retorno:
--   { ok: true,  mensagem: '...', id_empreendimento: 42 }  → sucesso
--   { ok: false, mensagem: '...' }                         → erro
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cadastrar_empreendimento(dados JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id    UUID;
  v_usuario_id INT;
  v_emp_id     INT;
BEGIN
  -- 1. Pega o ID do usuário autenticado (fornecido automaticamente pelo Supabase)
  v_auth_id := auth.uid();

  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'mensagem', 'Usuário não autenticado. Faça login antes de cadastrar.'
    );
  END IF;

  -- 2. Verifica se o usuário já existe na tabela `usuario`
  SELECT id INTO v_usuario_id
  FROM usuario
  WHERE auth_id = v_auth_id;

  -- 3. Se não existe, cria o registro do usuário
  IF v_usuario_id IS NULL THEN
    INSERT INTO usuario (nome, email, auth_id)
    VALUES (
      dados->>'nome_usuario',
      dados->>'email_usuario',
      v_auth_id
    )
    RETURNING id INTO v_usuario_id;
  ELSE
    -- Atualiza o nome caso já exista
    UPDATE usuario
    SET nome = dados->>'nome_usuario'
    WHERE id = v_usuario_id;
  END IF;

  -- 4. Cria o empreendimento com situação 1 (Pendente — aguarda aprovação do admin)
  INSERT INTO empreendimento (
    nome,
    email,
    id_situacao,
    telefone1,
    id_categoria
  )
  VALUES (
    dados->>'nome_empreendimento',
    dados->>'email_usuario',
    1,
    dados->>'telefone1',
    (dados->>'id_categoria')::INT
  )
  RETURNING id INTO v_emp_id;

  -- 5. Vincula o usuário ao empreendimento criado
  INSERT INTO usuario_empreendimento (id_usuario, id_empreendimento)
  VALUES (v_usuario_id, v_emp_id);

  -- Retorna sucesso com o ID do novo empreendimento
  RETURN jsonb_build_object(
    'ok', true,
    'mensagem', 'Empreendimento cadastrado com sucesso! Aguarde a aprovação do administrador.',
    'id_empreendimento', v_emp_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Se qualquer erro ocorrer, o PostgreSQL faz rollback automático
  RETURN jsonb_build_object(
    'ok', false,
    'mensagem', 'Erro interno: ' || SQLERRM
  );
END;
$$;

-- Concede permissão para usuários autenticados chamarem esta função
GRANT EXECUTE ON FUNCTION cadastrar_empreendimento(JSONB) TO authenticated;
-- Também permite chamada anônima (o usuário acaba de criar a conta e pode não estar autenticado ainda)
GRANT EXECUTE ON FUNCTION cadastrar_empreendimento(JSONB) TO anon;
