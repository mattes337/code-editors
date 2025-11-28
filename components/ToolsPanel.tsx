import React, { useState, useEffect, useCallback } from 'react';
import { UserFunction, EditorType, SqlDialect } from '../types';
import { Braces, Code2, PanelRightClose, PanelRightOpen, Edit2, AlertTriangle, Plus, LayoutTemplate } from 'lucide-react';
import { VariableTree } from './VariableTree';
import { FunctionPanel } from './FunctionPanel';
import { SqlFunctionPanel } from './SqlFunctionPanel';
import { HtmlBlocksPanel } from './HtmlBlocksPanel';
import { VariablesEditorModal } from './VariablesEditorModal';
import { FunctionEditorModal } from './FunctionEditorModal';

interface ToolsPanelProps {
  variablesObj: Record<string, any>;
  variablesJson: string;
  onVariablesChange: (json: string) => void;
  variableError: string | null;
  functions: UserFunction[];
  onFunctionsChange: (funcs: UserFunction[]) => void;
  activeEditorType?: EditorType;
  sqlDialect?: SqlDialect;
  missingFunctions?: string[];
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  variablesObj,
  variablesJson,
  onVariablesChange,
  variableError,
  functions,
  onFunctionsChange,
  activeEditorType,
  sqlDialect,
  missingFunctions = []
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'functions' | 'blocks'>('variables');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  
  // Quick Add Function State
  const [newFuncName, setNewFuncName] = useState<string | undefined>(undefined);
  const [isFuncModalOpen, setIsFuncModalOpen] = useState(false);

  // Auto-switch to functions tab if missing functions detected
  useEffect(() => {
    if (missingFunctions.length > 0) {
        setActiveTab('functions');
        setIsCollapsed(false);
    }
  }, [missingFunctions.length]);

  // Resizing State
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, stopResizing]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isSqlMode = activeEditorType === EditorType.DB_QUERY;
  const isHtmlMode = activeEditorType === EditorType.EMAIL_HTML;

  const handleQuickAdd = (name: string) => {
      setNewFuncName(name);
      setIsFuncModalOpen(true);
  };

  const handleSaveFunc = (func: UserFunction) => {
      onFunctionsChange([...functions, func]);
  };

  return (
    <div 
        className={`flex h-full bg-white border-l border-slate-200 shrink-0 relative`}
        style={{ width: isCollapsed ? '3rem' : `${width}px` }}
    >
        {!isCollapsed && (
            <div 
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500 hover:w-1.5 -ml-0.5 z-20 transition-all flex items-center justify-center group"
                onMouseDown={startResizing}
            >
                <div className="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-white/50 hidden group-hover:block" />
            </div>
        )}

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header & Tabs */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col py-2 gap-2' : 'justify-between'} border-b border-slate-200 shrink-0 bg-slate-50/50 min-h-[48px]`}>
            
            {!isCollapsed && (
            <div className="flex flex-1">
                <button
                    onClick={() => setActiveTab('variables')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors
                        ${activeTab === 'variables'
                        ? 'border-teal-500 text-teal-700 bg-teal-50/50'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    <Braces size={14} /> Variables
                </button>
                <button
                    onClick={() => setActiveTab('functions')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors
                        ${activeTab === 'functions'
                        ? 'border-teal-500 text-teal-700 bg-teal-50/50'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    <Code2 size={14} /> {isSqlMode ? 'SQL Funcs' : 'Functions'}
                    {missingFunctions.length > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
                            {missingFunctions.length}
                        </span>
                    )}
                </button>
                {isHtmlMode && (
                    <button
                        onClick={() => setActiveTab('blocks')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors
                            ${activeTab === 'blocks'
                            ? 'border-teal-500 text-teal-700 bg-teal-50/50'
                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        <LayoutTemplate size={14} /> Blocks
                    </button>
                )}
            </div>
            )}

            <button 
                onClick={toggleCollapse}
                className={`p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${isCollapsed ? '' : 'mr-1'}`}
                title={isCollapsed ? "Expand Tools" : "Collapse Tools"}
            >
                {isCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
            </button>
        </div>

        {/* Collapsed State Quick Actions */}
        {isCollapsed && (
            <div className="flex flex-col items-center gap-4 mt-4">
                <button 
                    onClick={() => { 
                        setIsCollapsed(false); 
                        setActiveTab('variables'); 
                    }}
                    className={`p-2 rounded-lg ${activeTab === 'variables' ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Variables"
                >
                    <Braces size={16} />
                </button>
                <button 
                    onClick={() => { 
                        setIsCollapsed(false); 
                        setActiveTab('functions'); 
                    }}
                    className={`p-2 rounded-lg ${activeTab === 'functions' ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'} relative`}
                    title="Functions"
                >
                    <Code2 size={16} />
                    {missingFunctions.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-red-500 border border-white"></span>
                    )}
                </button>
                {isHtmlMode && (
                    <button 
                        onClick={() => { 
                            setIsCollapsed(false); 
                            setActiveTab('blocks'); 
                        }}
                        className={`p-2 rounded-lg ${activeTab === 'blocks' ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Blocks"
                    >
                        <LayoutTemplate size={16} />
                    </button>
                )}
            </div>
        )}

        {/* Expanded Content */}
        {!isCollapsed && (
            <div className="flex-1 overflow-hidden relative bg-slate-50/30">
            {activeTab === 'variables' ? (
                <div className="flex flex-col h-full relative">
                {variableError && (
                    <div className="bg-red-50 border-b border-red-100 p-2 text-xs text-red-600 font-medium break-all">
                    Error: {variableError}
                    </div>
                )}
                <div className="flex-1 overflow-hidden pb-20 pt-2">
                    <VariableTree 
                        data={variablesObj} 
                        editorType={activeEditorType}
                    />
                </div>
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <button
                    onClick={() => setIsVariableModalOpen(true)}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg shadow-teal-600/30 transition-all transform hover:scale-105 active:scale-95 font-bold text-sm"
                    >
                    <Edit2 size={16} />
                    <span>Edit Variables</span>
                    </button>
                </div>
                </div>
            ) : activeTab === 'blocks' ? (
                <HtmlBlocksPanel />
            ) : isSqlMode ? (
                 <SqlFunctionPanel dialect={sqlDialect} />
            ) : (
                <div className="flex flex-col h-full">
                    {/* Missing Functions Alert */}
                    {missingFunctions.length > 0 && (
                        <div className="bg-amber-50 border-b border-amber-100 p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                                <AlertTriangle size={14} />
                                <span>Missing Functions Detected</span>
                            </div>
                            <div className="space-y-1">
                                {missingFunctions.map(name => (
                                    <div key={name} className="flex items-center justify-between bg-white border border-amber-200 rounded px-2 py-1">
                                        <span className="text-xs font-mono text-amber-800">{name}</span>
                                        <button 
                                            onClick={() => handleQuickAdd(name)}
                                            className="text-[10px] flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium transition-colors"
                                        >
                                            <Plus size={10} /> Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <FunctionPanel 
                        functions={functions} 
                        onUpdateFunctions={onFunctionsChange}
                        activeEditorType={activeEditorType} 
                    />
                </div>
            )}
            </div>
        )}

        <VariablesEditorModal
            isOpen={isVariableModalOpen}
            initialValue={variablesJson}
            onClose={() => setIsVariableModalOpen(false)}
            onSave={onVariablesChange}
        />

        <FunctionEditorModal 
            isOpen={isFuncModalOpen}
            initialFunction={newFuncName ? { id: '', name: newFuncName, params: ['arg1'], body: '// return ...' } : undefined}
            onClose={() => { setIsFuncModalOpen(false); setNewFuncName(undefined); }}
            onSave={handleSaveFunc}
        />
      </div>
    </div>
  );
};