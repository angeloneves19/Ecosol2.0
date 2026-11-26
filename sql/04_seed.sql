-- =============================================================================
-- TRAMA VIAMÃO — Rede Solidária Viamão
-- IFRS Campus Viamão
-- =============================================================================
-- ARQUIVO 4 de 4: DADOS INICIAIS (Seed)
-- Execute DEPOIS do 03_funcoes.sql.
--
-- Este arquivo insere os dados mínimos para o sistema funcionar:
--   - Naturezas de item (produto / serviço)
--   - Categorias de empreendimento
--   - Tipos de item
--   - Configuração inicial da página inicial
--
-- Estratégia: nunca usa IDs explícitos. Funciona com SERIAL e com
-- GENERATED ALWAYS AS IDENTITY. Pode ser rodado mais de uma vez.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NATUREZA DE ITEM
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO natureza_de_item (nome)
SELECT v.nome
FROM (VALUES ('produto'), ('servico')) AS v(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM natureza_de_item WHERE lower(nome) = lower(v.nome)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CATEGORIAS DE EMPREENDIMENTO
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO categoria_de_empreendimento (nome)
SELECT v.nome
FROM (VALUES
  ('Alimentação'),
  ('Artesanato'),
  ('Serviços'),
  ('Produção Rural'),
  ('Reciclagem e Sustentabilidade'),
  ('Cultura e Arte'),
  ('Moda e Confecção'),
  ('Tecnologia e Inovação'),
  ('Saúde e Bem-estar'),
  ('Educação'),
  ('Outros')
) AS v(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM categoria_de_empreendimento WHERE lower(nome) = lower(v.nome)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TIPOS DE ITEM
--    Referencia a natureza pelo nome (não pelo ID), então funciona
--    independente de quais IDs foram gerados para natureza_de_item.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO tipo_de_item (nome, id_natureza)
SELECT v.nome, n.id
FROM (VALUES
  -- Produto
  ('Alimento',          'produto'),
  ('Bebida',            'produto'),
  ('Comida',            'produto'),
  ('Roupa',             'produto'),
  ('Ferramenta',        'produto'),
  ('Artesanato',        'produto'),
  ('Higiene e Limpeza', 'produto'),
  -- Serviço
  ('Avulso',      'servico'),
  ('Locação',     'servico'),
  ('Assinatura',  'servico'),
  ('Reserva',     'servico'),
  ('Agendamento', 'servico'),
  ('Instalação',  'servico'),
  ('Licença',     'servico'),
  ('Consultoria', 'servico'),
  ('Aula',        'servico')
) AS v(nome, natureza)
JOIN natureza_de_item n ON n.nome = v.natureza
WHERE NOT EXISTS (
  SELECT 1 FROM tipo_de_item WHERE lower(nome) = lower(v.nome)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CONFIGURAÇÃO INICIAL DA PÁGINA INICIAL
--    Insere apenas se a tabela estiver vazia (singleton).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO config_home (
  hero_titulo,
  hero_subtitulo,
  banner_texto,
  banner_cta,
  sobre_texto
)
SELECT
  'Encontre produtos e serviços locais',
  'Apoie a economia solidária de Viamão — RS',
  'Faça parte da rede solidária de Viamão. Cadastre seu empreendimento e alcance mais pessoas.',
  'Cadastrar meu empreendimento',
  'A Rede Solidária Viamão é uma iniciativa do Projeto Trama — IFRS Campus Viamão — para fortalecer a economia solidária e o comércio justo na região.'
WHERE NOT EXISTS (SELECT 1 FROM config_home);
