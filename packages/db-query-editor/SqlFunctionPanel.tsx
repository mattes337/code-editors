import React, { useState } from 'react';
import { SqlDialect, SqlLibrary } from '../../lib/types';
import { ChevronDown, ChevronRight, LayoutTemplate, FunctionSquare } from 'lucide-react';
import { DEFAULT_SQL_DIALECT_DATA, DEFAULT_SQL_COMMON_GROUPS } from '../../lib/constants';

interface SqlFunctionPanelProps {
  dialect?: SqlDialect;
  library?: SqlLibrary;
  onInsert?: (text: string) => void;
}

export const SqlFunctionPanel: React.FC<SqlFunctionPanelProps> = ({ 
  dialect = 'postgres',
  library = DEFAULT_SQL_DIALECT_DATA,
  onInsert
}) => {
  const groups = library[dialect] || DEFAULT_SQL_COMMON_GROUPS;
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
      // Default all open
      const initial: Record<string, boolean> = {};
      groups.forEach(g => initial[g.id] = true);
      return initial;
  });

  const toggleGroup = (id: string) => {
      setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (e: React.DragEvent, text: string) => {
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (text: string) => {
      if (onInsert) {
          onInsert(text);
      }
  };

  const getDialectLabel = (d: string) => {
      if (d === 'postgres-vector') return 'PG Vector';
      if (d === 'mssql') return 'MS SQL';
      if (d === 'duckdb') return 'DuckDB';
      if (d === 'seekdb') return 'SeekDB';
      return d.charAt(0).toUpperCase() + d.slice(1);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
        <div className="px-4 py-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between shadow-sm z-10">
            <span>{getDialectLabel(dialect)} Library</span>
        </div>
        
      <div className="flex-1 overflow-y-auto p-2 pb-20">
        {groups.map((group) => (
            <div key={group.id} className="mb-2">
                <div 
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-100 rounded text-slate-500 font-bold text-xs uppercase tracking-wide select-none transition-colors"
                >
                    {openGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {group.title}
                </div>
                
                {openGroups[group.id] && (
                    <div className="mt-1 space-y-1 pl-2">
                        {group.items.map((func, idx) => (
                            <div 
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, func.value || func.name)}
                                onClick={() => handleClick(func.value || func.name)}
                                className="group flex items-start gap-2 p-2 bg-white rounded border border-slate-200 hover:border-teal-400 hover:shadow-sm cursor-pointer active:cursor-grabbing transition-all relative"
                                title="Click or drag to insert"
                            >
                                <div className="mt-0.5 text-slate-400 group-hover:text-teal-500">
                                    {func.value?.includes('\n') ? <LayoutTemplate size={14} /> : <FunctionSquare size={14} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-mono text-xs text-teal-700 font-semibold truncate" title={func.value || func.name}>
                                        {func.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                        {func.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ))}

        {groups.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm">
                No functions available for this dialect.
            </div>
        )}
      </div>
    </div>
  );
};