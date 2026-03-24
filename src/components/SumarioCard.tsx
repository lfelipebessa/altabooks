import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { Sumario } from '../types';

interface SumarioCardProps {
  sumario: Sumario;
  onSelecionar: (id: string) => Promise<void>;
}

export const SumarioCard: React.FC<SumarioCardProps> = ({ sumario, onSelecionar }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl p-5 transition-all ${sumario.selecionado ? 'border-brand-primary bg-brand-bg-badge' : 'border-gray-200 bg-brand-bg hover:border-brand-primary hover:shadow-md'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-serif text-xl font-bold text-brand-text-main">
              Opção {sumario.opcao}
            </h3>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold capitalize border border-gray-200">
              {sumario.abordagem}
            </span>
            {sumario.selecionado && (
              <span className="px-2 py-1 bg-brand-primary text-brand-text-main rounded text-xs font-bold shadow-sm">
                Selecionado
              </span>
            )}
          </div>
          <p className="text-brand-text-body font-medium text-lg">
            {sumario.titulo_sumario || 'Sem título'}
          </p>
          <div className="text-sm text-gray-500 mt-1">
            {sumario.capitulos ? sumario.capitulos.length : 0} capítulos
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sumario.drive_url && (
            <a 
              href={sumario.drive_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-brand-primary font-medium hover:bg-brand-primary/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no Drive
            </a>
          )}
          {!sumario.selecionado && (
            <button 
              onClick={() => onSelecionar(sumario.id)}
              className="px-4 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-medium hover:border-brand-primary hover:text-brand-primary transition-colors shadow-sm cursor-pointer"
            >
              Selecionar este sumário
            </button>
          )}
        </div>
      </div>

      {sumario.capitulos && sumario.capitulos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100/50">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors focus:outline-none"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Ver capítulos
          </button>
          
          {expanded && (
            <div className="mt-4 space-y-4">
              {sumario.capitulos.map((cap) => (
                <div key={cap.numero} className="pl-4 border-l-2 border-brand-primary/40 text-sm">
                  <h4 className="font-bold text-brand-text-main">
                    Capítulo {cap.numero}: {cap.titulo}
                  </h4>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    {cap.descricao}
                  </p>
                  {cap.subassuntos && cap.subassuntos.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Subassuntos</span>
                    <ul className="mt-1 space-y-1">
                      {cap.subassuntos.map((sub, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-500">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-primary/60 shrink-0" />
                          {sub}
                        </li>
                      ))}
                    </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
