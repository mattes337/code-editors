import React, { useState, useEffect } from 'react';
import { UserFunction } from '../types';
import { X, Save, Play, AlertCircle } from 'lucide-react';
import { CodeEditor } from './CodeEditor';

interface FunctionEditorModalProps {
  isOpen: boolean;
  initialFunction?: UserFunction;
  onClose: () => void;
  onSave: (func: UserFunction) => void;
}

export const FunctionEditorModal: React.FC<FunctionEditorModalProps> = ({
  isOpen,
  initialFunction,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [params, setParams] = useState('');
  const [body, setBody] = useState('');
  
  // Test State
  const [testArgs, setTestArgs] = useState<Record<string, string>>({});
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialFunction) {
        setName(initialFunction.name);
        setParams(initialFunction.params.join(', '));
        setBody(initialFunction.body);
        // Initialize test args based on params
        const initialArgs: Record<string, string> = {};
        initialFunction.params.forEach(p => initialArgs[p] = '');
        setTestArgs(initialArgs);
      } else {
        setName('myFunction');
        setParams('a, b');
        setBody('return a + b;');
        setTestArgs({ a: '10', b: '20' });
      }
      setTestOutput(null);
      setTestError(null);
    }
  }, [isOpen, initialFunction]);

  // Update test args when params string changes
  useEffect(() => {
    const paramList = params.split(',').map(p => p.trim()).filter(Boolean);
    setTestArgs(prev => {
        const next: Record<string, string> = {};
        paramList.forEach(p => {
            next[p] = prev[p] || '';
        });
        return next;
    });
  }, [params]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newFunc: UserFunction = {
      id: initialFunction?.id || Date.now().toString(),
      name,
      params: params.split(',').map(p => p.trim()).filter(Boolean),
      body
    };
    onSave(newFunc);
    onClose();
  };

  const handleRunTest = () => {
      try {
          const paramList = params.split(',').map(p => p.trim()).filter(Boolean);
          const args = paramList.map(p => {
              const val = testArgs[p];
              // Try to parse JSON/Number, fallback to string
              try {
                  if (val === 'true') return true;
                  if (val === 'false') return false;
                  if (val === 'null') return null;
                  if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);
                  if (val.startsWith('{') || val.startsWith('[')) return JSON.parse(val);
              } catch {}
              return val;
          });

          // eslint-disable-next-line no-new-func
          const func = new Function(...paramList, body);
          const result = func(...args);
          setTestOutput(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
          setTestError(null);
      } catch (e: any) {
          setTestError(e.message);
          setTestOutput(null);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col h-[85vh] border border-slate-200 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{initialFunction ? 'Edit Function' : 'New Function'}</h2>
            <p className="text-sm text-slate-400">Define and test a global helper function</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
             {/* Left: Editor */}
             <div className="flex-1 flex flex-col min-h-0 bg-slate-50 p-6 gap-4 border-r border-slate-200">
                 <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Function Name</label>
                        <input 
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="myFunction"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Parameters (comma sep.)</label>
                        <input 
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                            value={params}
                            onChange={e => setParams(e.target.value)}
                            placeholder="a, b"
                        />
                    </div>
                 </div>
                 
                 <div className="flex-1 flex flex-col min-h-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Body (JavaScript)</label>
                    <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden relative">
                        <CodeEditor 
                            language="javascript" 
                            value={body} 
                            onChange={(val) => setBody(val || '')} 
                        />
                    </div>
                 </div>
             </div>

             {/* Right: Test Panel */}
             <div className="w-[350px] flex flex-col min-h-0 bg-white p-6 gap-4 overflow-hidden flex-shrink-0">
                 <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                     <Play size={16} className="text-teal-600" />
                     Test Function
                 </div>

                 <div className="flex-1 overflow-y-auto pr-1">
                    {Object.keys(testArgs).length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(testArgs).map(([key, val]) => (
                                <div key={key}>
                                    <label className="text-xs font-bold text-slate-400 font-mono block mb-1">{key}</label>
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-mono focus:border-teal-400 focus:outline-none focus:bg-white transition-colors"
                                        value={val}
                                        onChange={(e) => setTestArgs(prev => ({...prev, [key]: e.target.value}))}
                                        placeholder="Value..."
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm italic p-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                            No parameters defined.
                        </div>
                    )}
                 </div>

                 <div className="pt-4 border-t border-slate-100 mt-auto">
                     <button 
                        onClick={handleRunTest}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors mb-4"
                     >
                         <Play size={14} /> Run Test
                     </button>

                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Output</label>
                     <div className={`p-3 rounded-lg border text-sm font-mono min-h-[100px] whitespace-pre-wrap break-all overflow-y-auto max-h-[200px] ${testError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                         {testError ? (
                             <div className="flex gap-2 items-start">
                                 <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                 <span>{testError}</span>
                             </div>
                         ) : testOutput !== null ? (
                             testOutput
                         ) : (
                             <span className="text-slate-400 italic">Run test to see output...</span>
                         )}
                     </div>
                 </div>
             </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white flex-shrink-0">
             <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
               Cancel
             </button>
             <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-teal-600/20 transition-all">
               <Save size={16} />
               Save Function
             </button>
        </div>
      </div>
    </div>
  );
};