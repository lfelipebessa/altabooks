// Edge Function: metadados-xlsx
// 2 ações:
//   1. parse-pcp       — recebe { pcp_b64 } e retorna { pcp_texto, alertas_pcp }
//   2. generate-bookinfo — recebe { metadados_json } e retorna { xlsx_b64 }
//
// Chamada pelo n8n no fluxo de geração de metadados.
// Deploy: via Supabase MCP (deploy_edge_function).
// Bucket: lê o template em `metadados/templates/bookinfo-template.xlsx` via service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const COLUMN_MAP: Record<string, string> = {
  'A4': 'dados_basicos.isbn',
  'B4': 'dados_basicos.titulo',
  'C4': 'dados_basicos.subtitulo',
  'E4': 'dados_editoriais.colecao',
  'G4': 'dados_editoriais.formato',
  'H4': 'dados_editoriais.selo',
  'I4': 'dados_basicos.edicao',
  'K4': 'dados_basicos.autor|JOIN_COAUTORES',
  'T4': 'dados_basicos.ilustrador',
  'U4': 'dados_basicos.tradutor',
  'W4': 'dados_basicos.prefacio_por',
  'AN4': 'textos.palavras_chave_seo',
  'AO4': 'dados_editoriais.categorias_alta_books',
  'AP4': 'dados_editoriais.cdd',
  'AQ4': 'dados_editoriais.bisac[0]',
  'AR4': 'dados_editoriais.bisac[1]',
  'AS4': 'dados_editoriais.bisac[2]',
  'AT4': 'dados_editoriais.bisac[3]',
  'AU4': 'dados_editoriais.bisac[4]',
  'AV4': 'dados_editoriais.bisac[5]',
  'AW4': 'dados_editoriais.bisac[6]',
  'AX4': 'dados_editoriais.bisac[7]',
  'AY4': 'dados_editoriais.bisac[8]',
  'AZ4': 'dados_editoriais.bisac[9]',
  'BA4': 'dados_editoriais.thema[0]',
  'BB4': 'dados_editoriais.thema[1]',
  'BC4': 'dados_basicos.ano_publicacao',
  'BF4': 'dados_basicos.idioma_publicacao',
  'BH4': 'dados_editoriais.faixa_etaria',
  'BI4': 'dados_editoriais.publico_alvo',
  'BJ4': 'textos.sinopse',
  'BN4': 'dados_editoriais.num_paginas',
  'BO4': 'dados_editoriais.dimensoes_cm.altura',
  'BP4': 'dados_editoriais.dimensoes_cm.largura',
  'BQ4': 'dados_editoriais.dimensoes_cm.lombada',
  'BR4': 'dados_editoriais.peso_g|TO_KG',
  'CC4': 'dados_editoriais.preco_capa_brl',
  'CD4': 'dados_basicos.ean',
};

const CAMPOS_ESPERADOS_PCP = [
  'titulo', 'subtitulo', 'autor', 'coautores', 'tradutor', 'prefacio por', 'ilustrador',
  'idioma original', 'idioma de publicacao', 'edicao', 'ano de publicacao', 'isbn', 'ean',
  'selo', 'colecao', 'formato',
  'largura', 'altura', 'lombada', 'peso', 'numero de paginas',
  'preco de capa', 'cdd', 'cdu',
  'bisac', 'thema', 'categorias',
  'publico-alvo', 'faixa etaria',
  'sinopse', 'biografia do autor', 'palavras-chave',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function getByPath(obj: unknown, path: string): unknown {
  const arrMatch = path.match(/^(.+)\[(\d+)\]$/);
  if (arrMatch) {
    const arr = getByPath(obj, arrMatch[1]);
    return Array.isArray(arr) ? arr[parseInt(arrMatch[2], 10)] : undefined;
  }
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function applyTransform(value: unknown, transform: string, json: unknown): unknown {
  if (transform === 'TO_KG') {
    if (value === null || value === undefined || value === '') return null;
    return Number(value) / 1000;
  }
  if (transform === 'JOIN_COAUTORES') {
    const autor = (getByPath(json, 'dados_basicos.autor') as string) || '';
    const co = (getByPath(json, 'dados_basicos.coautores') as unknown[]) || [];
    return [autor, ...(Array.isArray(co) ? co : [])].filter(Boolean).join('; ');
  }
  return value;
}

function resolveCell(spec: string, json: unknown): unknown {
  const [pathPart, transform] = spec.split('|');
  let value = getByPath(json, pathPart);
  if (transform) value = applyTransform(value, transform, json);
  if (Array.isArray(value)) value = value.join('; ');
  return value;
}

function parsePcp(pcpB64: string) {
  const binary = Uint8Array.from(atob(pcpB64), (c) => c.charCodeAt(0));
  const wb = XLSX.read(binary, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws['!ref']) {
    return { pcp_texto: '', alertas_pcp: [{ campo: 'pcp', severidade: 'aviso', mensagem: 'PCP vazio ou ilegível' }] };
  }
  const range = XLSX.utils.decode_range(ws['!ref']);

  const found: Record<string, unknown> = {};
  for (let r = range.s.r; r <= range.e.r; r++) {
    const keyCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    const valCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    const key = norm(keyCell?.v);
    if (key) found[key] = valCell ? valCell.v : null;
  }

  const alertas_pcp: Array<{ campo: string; severidade: string; mensagem: string }> = [];
  for (const k of CAMPOS_ESPERADOS_PCP) {
    if (!(k in found) || found[k] === null || found[k] === '') {
      alertas_pcp.push({
        campo: 'pcp.' + k,
        severidade: 'aviso',
        mensagem: `Campo "${k}" ausente na PCP — Gemini tentará extrair de capa/miolo`,
      });
    }
  }

  const pcp_texto = Object.entries(found)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  return { pcp_texto, alertas_pcp };
}

async function generateBookinfo(metadados_json: unknown): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Env vars SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas no projeto');
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.storage
    .from('metadados')
    .download('templates/bookinfo-template.xlsx');
  if (error) throw new Error('Falha ao baixar template: ' + error.message);
  if (!data) throw new Error('Template vazio');

  const buf = await data.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellStyles: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  for (const [cell, spec] of Object.entries(COLUMN_MAP)) {
    const v = resolveCell(spec, metadados_json);
    if (v === undefined || v === null || v === '') continue;
    const existing = ws[cell] || {};
    const cellType: 'n' | 's' = typeof v === 'number' ? 'n' : 's';
    ws[cell] = { ...existing, v, t: cellType };
  }

  // Atualiza !ref se necessário (cell A4 deve estar dentro do range existente já)
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true });
  const bytes = new Uint8Array(out);

  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Use POST' }, 405);
  }

  let body: { action?: string; pcp_b64?: string; metadados_json?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido no body' }, 400);
  }

  try {
    if (body.action === 'parse-pcp') {
      if (!body.pcp_b64) return jsonResponse({ error: 'pcp_b64 obrigatório' }, 400);
      const result = parsePcp(body.pcp_b64);
      return jsonResponse(result);
    }

    if (body.action === 'generate-bookinfo') {
      if (!body.metadados_json) return jsonResponse({ error: 'metadados_json obrigatório' }, 400);
      const xlsx_b64 = await generateBookinfo(body.metadados_json);
      return jsonResponse({ xlsx_b64 });
    }

    return jsonResponse({ error: 'action desconhecida; use "parse-pcp" ou "generate-bookinfo"' }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: msg }, 500);
  }
});
