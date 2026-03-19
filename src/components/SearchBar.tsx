import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
    return (
        <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-brand-bg-card placeholder-gray-500 focus:outline-none focus:bg-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary sm:text-sm transition-colors duration-200"
                placeholder="Buscar por projeto ou autor..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};
