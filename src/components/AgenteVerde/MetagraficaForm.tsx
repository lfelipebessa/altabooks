import React from 'react'
import type { Metagrafica } from '../../types/agenteVerde'

interface MetagraficaFormProps {
  value: Metagrafica
  onChange: (next: Metagrafica) => void
}

export const MetagraficaForm: React.FC<MetagraficaFormProps> = ({ value, onChange }) => {
  const set = <K extends keyof Metagrafica>(key: K, v: Metagrafica[K]) => onChange({ ...value, [key]: v })
  const setNum = (key: keyof Metagrafica) => (v: string) => set(key, (Number(v) || 0) as never)

  return (
    <div className="p-6 space-y-6">
      <Secao titulo="Dimensões físicas" subtitulo="Calculadas a partir do miolo e tipo de capa">
        <div className="grid grid-cols-3 gap-4">
          <Campo label="Largura (mm)"><InputNum value={value.largura_mm} onChange={setNum('largura_mm')} /></Campo>
          <Campo label="Altura (mm)"><InputNum value={value.altura_mm} onChange={setNum('altura_mm')} /></Campo>
          <Campo label="Lombada (mm)"><InputNum value={value.lombada_mm} onChange={setNum('lombada_mm')} /></Campo>
        </div>
      </Secao>

      <Secao titulo="Papel" subtitulo="Gramaturas do miolo e capa">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Gramatura miolo (g/m²)"><InputNum value={value.gramatura_miolo} onChange={setNum('gramatura_miolo')} /></Campo>
          <Campo label="Gramatura capa (g/m²)"><InputNum value={value.gramatura_capa} onChange={setNum('gramatura_capa')} /></Campo>
        </div>
      </Secao>

      <Secao titulo="Identificação e peso" subtitulo="Para logística e cadastro CDD">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Peso (g)"><InputNum value={value.peso_g} onChange={setNum('peso_g')} /></Campo>
          <Campo label="CDD">
            <input
              type="text"
              value={value.cdd}
              onChange={e => set('cdd', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Código de barras">
            <input
              type="text"
              value={value.codigo_barras}
              onChange={e => set('codigo_barras', e.target.value)}
              className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Categorias internas" subtitulo="Taxonomia Metagráfica (departamento → cat1 → cat2 → cat3)">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Departamento">
            <input
              type="text"
              value={value.departamento}
              onChange={e => set('departamento', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Categoria 1">
            <input
              type="text"
              value={value.cat1}
              onChange={e => set('cat1', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Categoria 2">
            <input
              type="text"
              value={value.cat2}
              onChange={e => set('cat2', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Categoria 3">
            <input
              type="text"
              value={value.cat3}
              onChange={e => set('cat3', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
        </div>
      </Secao>
    </div>
  )
}

const Secao: React.FC<{ titulo: string; subtitulo: string; children: React.ReactNode }> = ({ titulo, subtitulo, children }) => (
  <div>
    <h3 className="font-serif text-lg text-brand-text-main mb-1">{titulo}</h3>
    <p className="text-xs text-gray-500 mb-3">{subtitulo}</p>
    {children}
  </div>
)

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
    {children}
  </div>
)

const InputNum: React.FC<{ value: number; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="number"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
  />
)
