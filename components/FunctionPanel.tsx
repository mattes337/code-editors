import React, { useState } from 'react';
import { UserFunction, EditorType } from '../types';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { FunctionEditorModal } from './FunctionEditorModal';

interface FunctionPanelProps {
  functions: UserFunction[];
  onUpdateFunctions: (funcs: UserFunction[]) => void;
  activeEditorType?: EditorType;
}

export const FunctionPanel: React.FC<FunctionPanelProps> = ({ functions, onUpdateFunctions, activeEditorType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFunc, setEditingFunc] = useState<UserFunction | undefined>(undefined);

  const handleEdit = (func: UserFunction) => {
    setEditingFunc(func);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingFunc(undefined);
    setIsModalOpen(true);
  };

  const handleSave = (func: UserFunction) => {
    let newFunctions = [...functions];
    const existingIndex = newFunctions.findIndex(f => f.id === func.id);
    
    if (existingIndex >= 0) {
      newFunctions[existingIndex] = func;
    } else {
      newFunctions.push(func);
    }
    
    onUpdateFunctions(newFunctions);
  };

  const deleteFunction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateFunctions(functions.filter(f => f.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, func: UserFunction) => {
    let text = `${func.name}(${func.params.join(', ')})`;
    
    // If not in script editor, wrap in handlebars syntax
    if (activeEditorType !== EditorType.SCRIPT_JS) {
        // Use the custom syntax supported by utils.ts for function calls
        text = `{{#func:${text}}}`;
    }

    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 relative group">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {functions.map(func => (
          <div 
            key={func.id}
            draggable
            onDragStart={(e) => handleDragStart(e, func)}
            className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-grab active:cursor-grabbing group/card relative"
          >
            <div className="flex justify-between items-start mb-2">
                <div className="font-mono text-sm text-teal-700 font-semibold flex items-center gap-2">
                    {func.name}
                    <span className="text-xs font-normal text-slate-400">({func.params.join(', ')})</span>
                </div>
            </div>
            <pre className="text-xs text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-lg overflow-hidden max-h-16 whitespace-pre-wrap font-mono pointer-events-none opacity-80">
                {func.body}
            </pre>
            
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                <button 
                    onClick={() => handleEdit(func)} 
                    className="p-1.5 hover:bg-teal-50 rounded text-slate-400 hover:text-teal-600 transition-colors"
                    title="Edit Function"
                >
                    <Edit2 size={14} />
                </button>
                <button 
                    onClick={(e) => deleteFunction(func.id, e)} 
                    className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete Function"
                >
                    <Trash2 size={14} />
                </button>
            </div>
          </div>
        ))}

        {functions.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                No functions defined.<br/>Click + to add one.
            </div>
        )}
      </div>
      
      {/* Floating Action Button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <button 
            onClick={handleCreate}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg shadow-teal-600/30 transition-all transform hover:scale-105 active:scale-95 font-bold text-sm"
          >
            <Plus size={16} />
            <span>Add Function</span>
          </button>
      </div>

      <FunctionEditorModal 
        isOpen={isModalOpen} 
        initialFunction={editingFunc} 
        onSave={handleSave} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};