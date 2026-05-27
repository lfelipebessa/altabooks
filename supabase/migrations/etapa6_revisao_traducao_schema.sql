-- Etapa 6: Revisão de tradução por LLM
-- Adiciona colunas para guardar versão revisada (LLM) ao lado da tradução DeepL original.
-- Mantém as duas versões pra cliente comparar e escolher.

ALTER TABLE public.capitulos_traducao
  ADD COLUMN titulo_revisado          TEXT NULL,
  ADD COLUMN conteudo_revisado        TEXT NULL,
  ADD COLUMN status_revisao           VARCHAR(20) NOT NULL DEFAULT 'nao_revisado'
    CHECK (status_revisao IN ('nao_revisado','revisando','revisado','erro')),
  ADD COLUMN mensagem_erro_revisao    TEXT NULL,
  ADD COLUMN revisado_em              TIMESTAMPTZ NULL,
  ADD COLUMN modelo_revisao           VARCHAR(50) NULL;

CREATE INDEX idx_capitulos_traducao_status_revisao
  ON public.capitulos_traducao(traducao_id, status_revisao);

ALTER TABLE public.traducoes_arquivo_itens
  ADD COLUMN conteudo_original        TEXT NULL,
  ADD COLUMN conteudo_revisado        TEXT NULL,
  ADD COLUMN status_revisao           VARCHAR(20) NOT NULL DEFAULT 'nao_revisado'
    CHECK (status_revisao IN ('nao_revisado','revisando','revisado','erro')),
  ADD COLUMN mensagem_erro_revisao    TEXT NULL,
  ADD COLUMN revisado_em              TIMESTAMPTZ NULL,
  ADD COLUMN modelo_revisao           VARCHAR(50) NULL;

CREATE INDEX idx_traducoes_arquivo_itens_status_revisao
  ON public.traducoes_arquivo_itens(projeto_id, idioma, status_revisao);
