import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { CodeEditor } from './CodeEditor';

interface VariablesEditorModalProps {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (newValue: string) => void;
}

export const VariablesEditorModal: React.FC<VariablesEditorModalProps> = ({
  isOpen,
  initialValue,
  onClose,
  onSave,
}) => {
  const [value, setValue] = useState(initialValue);
  
  // Sync value when modal opens or initialValue changes externally
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const isDirty = value !== initialValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col h-[80vh] border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Edit Test Data</h2>
            <p className="text-sm text-slate-400">Modify the JSON context variables used in templates</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 p-0 min-h-0 bg-slate-50">
             <CodeEditor 
                language="json" 
                value={value} 
                onChange={(val) => setValue(val || '')} 
            />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white">
           <button
             onClick={() => setValue(initialValue)}
             disabled={!isDirty}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
               ${isDirty 
                 ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' 
                 : 'text-slate-300 cursor-not-allowed'
               }`}
             title="Reset to value at open"
           >
             <RotateCcw size={16} />
             Reset Changes
           </button>

           <div className="flex gap-3">
             <button
               onClick={onClose}
               className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={() => {
                 onSave(value);
                 onClose();
               }}
               disabled={!isDirty}
               className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-all
                ${isDirty
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
             >
               <Save size={16} />
               Save Changes
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};