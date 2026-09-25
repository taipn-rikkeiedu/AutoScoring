import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '~/src/components/Icons';

export interface Option {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasWarning?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "-- Chọn --",
  className = "",
  hasWarning = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.group && o.group.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedOptions: Record<string, Option[]> = {};
  const ungroupedOptions: Option[] = [];
  filteredOptions.forEach(o => {
    if (o.group) {
      if (!groupedOptions[o.group]) groupedOptions[o.group] = [];
      groupedOptions[o.group].push(o);
    } else {
      ungroupedOptions.push(o);
    }
  });

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className={`flex items-center justify-between w-full p-1 border rounded font-medium cursor-pointer transition-colors ${
          hasWarning
            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus-within:bg-white focus-within:ring-1 focus-within:ring-sky-500'
        }`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <div className="truncate flex-1 text-[12.5px] px-1">
          {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
        </div>
        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mx-0.5" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 flex flex-col">
          <div className="p-1.5 border-b border-slate-100">
            <input
              type="text"
              className="w-full text-[12.5px] p-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-colors"
              placeholder="Tìm kiếm đề bài..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="text-[12.5px] text-slate-400 p-3 text-center">Không tìm thấy kết quả</div>
            ) : (
              <>
                {ungroupedOptions.map(o => (
                  <div
                    key={o.value}
                    className={`text-[12.5px] p-2 rounded cursor-pointer transition-colors ${value === o.value ? 'bg-sky-50 text-sky-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                    onClick={() => { onChange(o.value); setIsOpen(false); }}
                  >
                    {o.label}
                  </div>
                ))}
                {Object.keys(groupedOptions).map(group => (
                  <div key={group}>
                    <div className="text-[11.5px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider mt-1 bg-slate-50/50 rounded-sm">
                      {group}
                    </div>
                    {groupedOptions[group].map(o => (
                      <div
                        key={o.value}
                        className={`text-[12.5px] p-2 pl-3 rounded cursor-pointer transition-colors ${value === o.value ? 'bg-sky-50 text-sky-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                        onClick={() => { onChange(o.value); setIsOpen(false); }}
                      >
                        {o.label}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
