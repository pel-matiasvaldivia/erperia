import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  id: number;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  getOptionLabel: (option: Option) => string;
  getOptionSublabel?: (option: Option) => string;
  searchFields: string[]; // Fields to filter options by, e.g. ['razon_social', 'cuit', 'codigo', 'descripcion']
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  getOptionLabel,
  getOptionSublabel,
  searchFields,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options when search term or options change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
      return;
    }

    const query = searchTerm.toLowerCase();
    const filtered = options.filter((option) =>
      searchFields.some((field) => {
        const val = option[field];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      })
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options, searchFields]);

  // Click outside detection to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Control field */}
      <div
        onClick={toggleDropdown}
        className={`flex items-center justify-between w-full px-4 py-3 bg-white border rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
          isOpen ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex-1 overflow-hidden pr-2">
          {selectedOption ? (
            <div className="flex flex-col text-left">
              <span className="text-slate-900 truncate leading-snug">
                {getOptionLabel(selectedOption)}
              </span>
              {getOptionSublabel && (
                <span className="text-[10px] text-slate-400 font-bold font-mono tracking-wide mt-0.5 leading-none">
                  {getOptionSublabel(selectedOption)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate block">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {value !== '' && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          ) }
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-violet-500' : ''
            }`}
          />
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Input Box */}
          <div className="flex items-center px-3.5 py-3 border-b border-slate-100 bg-slate-50/50">
            <Search className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options Menu */}
          <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50 text-left">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400 italic font-medium">
                Sin resultados
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;
                return (
                  <li
                    key={option.id}
                    onClick={() => handleSelect(option)}
                    className={`px-4 py-3 text-xs font-semibold cursor-pointer transition flex flex-col ${
                      isSelected
                        ? 'bg-violet-50 text-violet-700 font-bold border-l-4 border-violet-500 pl-3'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-violet-600'
                    }`}
                  >
                    <span className="truncate leading-normal">{getOptionLabel(option)}</span>
                    {getOptionSublabel && (
                      <span className="text-[9px] text-slate-400 font-bold font-mono tracking-wide mt-0.5 leading-none">
                        {getOptionSublabel(option)}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
