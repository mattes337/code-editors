import React from 'react';
import { SqlDialect } from '../types';

interface SqlFunctionPanelProps {
  dialect?: SqlDialect;
}

const DIALECT_FUNCTIONS: Record<SqlDialect, { name: string; desc: string }[]> = {
  postgres: [
    { name: 'NOW()', desc: 'Current date and time' },
    { name: 'COALESCE(val, default)', desc: 'Return first non-null' },
    { name: 'TO_CHAR(date, format)', desc: 'Format date/time' },
    { name: 'JSON_BUILD_OBJECT()', desc: 'Build JSON object' },
    { name: 'STRING_AGG(expr, del)', desc: 'Concatenate strings' },
    { name: 'EXTRACT(field FROM source)', desc: 'Get date subfield' },
  ],
  mysql: [
    { name: 'NOW()', desc: 'Current date and time' },
    { name: 'IFNULL(val, default)', desc: 'Return default if null' },
    { name: 'DATE_FORMAT(date, format)', desc: 'Format date' },
    { name: 'CONCAT(str1, str2, ...)', desc: 'Concatenate strings' },
    { name: 'GROUP_CONCAT(expr)', desc: 'Concatenate group results' },
    { name: 'JSON_OBJECT(key, val)', desc: 'Create JSON object' },
  ],
  mssql: [
    { name: 'GETDATE()', desc: 'Current date and time' },
    { name: 'ISNULL(val, default)', desc: 'Return default if null' },
    { name: 'FORMAT(value, format)', desc: 'Format value' },
    { name: 'TOP(n)', desc: 'Limit rows' },
    { name: 'STRING_AGG(expr, del)', desc: 'Concatenate strings' },
    { name: 'DATEDIFF(part, start, end)', desc: 'Difference between dates' },
  ]
};

export const SqlFunctionPanel: React.FC<SqlFunctionPanelProps> = ({ dialect = 'postgres' }) => {
  const functions = DIALECT_FUNCTIONS[dialect] || [];

  const handleDragStart = (e: React.DragEvent, text: string) => {
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
            <span>{dialect} Functions</span>
            <span className="text-teal-600 text-[10px]">Drag to insert</span>
        </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
        {functions.map((func, idx) => (
          <div 
            key={idx}
            draggable
            onDragStart={(e) => handleDragStart(e, func.name)}
            className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-grab active:cursor-grabbing group"
          >
            <div className="font-mono text-sm text-teal-700 font-semibold mb-1">
                {func.name}
            </div>
            <div className="text-xs text-slate-500">
                {func.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};