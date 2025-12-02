import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Braces, Brackets } from 'lucide-react';

interface TreeViewProps {
  data: any;
  label?: string;
  defaultOpen?: boolean;
}

export const TreeView: React.FC<TreeViewProps> = ({ data, label, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data).length === 0;

  if (!isObject) {
    return (
      <div className="flex items-center gap-2 py-0.5 pl-4 text-xs font-mono text-slate-600 hover:bg-slate-50 rounded">
        {label && <span className="text-purple-600 font-medium">{label}:</span>}
        <span className="text-teal-600 break-all bg-teal-50/50 px-1 rounded">
          {typeof data === 'string' ? `"${data}"` : String(data)}
        </span>
      </div>
    );
  }

  return (
    <div className="pl-2">
      <div 
        className="flex items-center gap-1 py-0.5 cursor-pointer text-xs font-mono hover:bg-slate-50 rounded select-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isEmpty ? (
            <div className="w-4" />
        ) : isOpen ? (
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
        ) : (
          <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600" />
        )}
        
        {label && <span className="text-purple-600 font-medium mr-1">{label}:</span>}
        
        <span className="text-slate-400 flex items-center gap-1">
          {isArray ? <Brackets size={12} /> : <Braces size={12} />}
          {isArray ? `Array(${data.length})` : 'Object'}
        </span>
      </div>

      {isOpen && !isEmpty && (
        <div className="border-l border-slate-200 ml-2">
          {Object.entries(data).map(([key, value]) => (
            <TreeView key={key} label={key} data={value} />
          ))}
        </div>
      )}
    </div>
  );
};