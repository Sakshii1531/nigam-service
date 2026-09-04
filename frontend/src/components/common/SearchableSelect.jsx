import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Plus } from 'lucide-react';

/**
 * SearchableSelect
 * A sleek, searchable combobox dropdown suitable for selecting States, Cities, etc.
 * 
 * Props:
 * - value: string (currently selected value)
 * - onChange: (val: string) => void
 * - options: string[] (list of option strings)
 * - placeholder: string
 * - label: string (optional)
 * - error: string (optional)
 * - disabled: boolean
 * - size: 'sm' | 'md' (default 'sm')
 * - buttonClassName: string (optional class override)
 * - labelClassName: string (optional class override)
 * - required: boolean
 * - allowCustom: boolean (allows user to type & select a custom value)
 */
const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  label,
  error,
  disabled = false,
  size = 'sm',
  buttonClassName = '',
  labelClassName = '',
  required = false,
  allowCustom = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const exactMatch = options.some(
    opt => opt.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    const customVal = searchQuery.trim();
    if (customVal) {
      onChange(customVal);
      setIsOpen(false);
    }
  };

  const isMd = size === 'md';

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {label && (
        <label className={`block mb-1 ${
          labelClassName || (isMd ? 'text-xs font-semibold text-[#64748B]' : 'text-[10px] font-bold text-slate-500 uppercase tracking-wider')
        }`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white border transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
          error 
            ? 'border-rose-400 ring-1 ring-rose-400' 
            : isOpen 
              ? 'border-[#0D47A1] ring-2 ring-[#0D47A1]/20' 
              : 'border-[#E2E8F0] hover:border-slate-300'
        } ${
          buttonClassName || (isMd ? 'px-4 py-2.5 rounded-lg text-sm bg-[#F8FAFC]' : 'px-3 py-2 rounded-xl text-xs font-medium')
        }`}
      >
        <span className={`truncate ${value ? 'text-slate-800 font-semibold' : 'text-slate-400 font-normal'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={isMd ? 16 : 14}
          className={`text-slate-400 transition-transform duration-200 ml-1.5 shrink-0 ${
            isOpen ? 'rotate-180 text-[#0D47A1]' : ''
          }`}
        />
      </button>

      {error && (
        <span className="text-[10px] font-semibold text-rose-500 mt-1 block">{error}</span>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${label || 'options'}...`}
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none py-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="py-4 px-3 text-center">
                <p className="text-xs text-slate-500 font-medium">No standard matching results</p>
                {allowCustom && searchQuery.trim() && !exactMatch && (
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#0D47A1] text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={13} /> Use "{searchQuery.trim()}"
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredOptions.map((opt) => {
                  const isSelected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#E3ECF9] text-[#0D47A1] font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D47A1] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}

                {allowCustom && searchQuery.trim() && !exactMatch && (
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-[#0D47A1] bg-blue-50/60 hover:bg-blue-100/70 font-semibold flex items-center gap-1.5 border-t border-blue-100 transition-colors"
                  >
                    <Plus size={13} /> Add custom: "{searchQuery.trim()}"
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { SearchableSelect };
export default SearchableSelect;
