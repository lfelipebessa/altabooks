import React from 'react';

interface ProgressBarProps {
    current: number;
    total: number;
    label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, label = 'Processando arquivos...' }) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className="w-full mt-3">
            <div className="flex justify-between text-xs mb-1 text-brand-text-body">
                <span>{label}</span>
                <span className="font-semibold">{current} de {total} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                    className="bg-brand-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};
