import React from 'react';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { RestParam } from '../../lib/types';

interface KeyValueEditorProps {
  items: RestParam[];
  onChange: (items: RestParam[]) => void;
  title: string;
  readOnlyKeys?: boolean; // For Path Params where keys come from URL
  hideAddButton?: boolean;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({ 
  items, 
  onChange, 
  title, 
  readOnlyKeys = false,
  hideAddButton = false
}) => {
  const handleAdd = () => {
    onChange([
      ...items,
      { id: Date.now().toString(), key: '', value: '', enabled: true }
    ]);
  };

  const handleChange = (id: string, field: 'key' | 'value', value: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleToggle = (id: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const handleDelete = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 group mb-1">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleToggle(item.id)}
                className={`p-1 rounded transition-colors ${item.enabled ? 'text-teal-600 hover:bg-teal-50' : 'text-slate-300 hover:text-slate-500'}`}
                title="Toggle parameter"
              >
                {item.enabled ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                  placeholder="Key"
                  readOnly={readOnlyKeys}
                  className={`w-full px-2 py-1.5 text-sm border rounded transition-colors focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 font-mono 
                    ${readOnlyKeys ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : !item.enabled ? 'text-slate-400 bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}
                  `}
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                  placeholder="Value"
                  className={`w-full px-2 py-1.5 text-sm border rounded transition-colors focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 font-mono 
                    ${!item.enabled ? 'text-slate-400 bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}
                  `}
                />
              </div>
              
              {!readOnlyKeys && (
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {readOnlyKeys && <div className="w-7"></div>}
            </div>
            
            {/* Type Hint / Description */}
            {item.description && (
                <div className="flex items-center gap-1.5 ml-8 pl-1">
                     <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 px-1.5 rounded-sm font-mono">
                         {item.description}
                     </span>
                </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded bg-slate-50/50">
            No {title.toLowerCase()} needed
          </div>
        )}

        {!hideAddButton && (
            <button 
              onClick={handleAdd}
              className="flex items-center gap-2 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-2 rounded transition-colors w-fit mt-2"
            >
              <Plus size={14} /> Add Parameter
            </button>
        )}
      </div>
    </div>
  );
};