import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserFunction, EditorType } from '../types';
import { executeScript } from '../utils';
import { Play, RefreshCw, PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { TreeView } from '../components/TreeView';
import { CodeEditor } from '../components/CodeEditor';
import { ToolsPanel } from '../components/ToolsPanel';

interface ScriptEditorProps {
    content: string;
    onChange: (val: string) => void;
    
    // Store Props
    variables: Record<string, any>;
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    variableError: string | null;
    functions: UserFunction[];
    onFunctionsChange: (funcs: UserFunction[]) => void;
    
    // Optional
    onUpdateVariables?: (newVars: Record<string, any>) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ 
    content, 
    onChange, 
    variables, 
    variablesJson,
    onVariablesChange,
    variableError,
    functions,
    onFunctionsChange,
    onUpdateVariables 
}) => {
    const [executionResult, setExecutionResult] = useState<{ logs: string[], finalContext: any, error?: string } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isConsoleOpen, setIsConsoleOpen] = useState(true);
    const [isContextOpen, setIsContextOpen] = useState(true);

    // Resize State
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = containerRect.right - e.clientX;
            
            if (newWidth > 200 && newWidth < containerRect.width - 200) {
                setSidebarWidth(newWidth);
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

    const runScript = () => {
        const result = executeScript(content, variables, functions);
        setExecutionResult(result);
        
        // Ensure sidebar and console are open to see results
        if (!isSidebarOpen) {
            setIsSidebarOpen(true);
        }
        if (!isConsoleOpen && !isContextOpen) {
            setIsConsoleOpen(true);
        }
        
        if (onUpdateVariables && !result.error) {
            // Optional: Auto-update global variables if passed
            // onUpdateVariables(result.finalContext); 
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" ref={containerRef}>
                <div className="flex-1 flex flex-col lg:flex-row gap-0 h-full">
                    {/* Code Editor */}
                    <div className={`flex-1 flex flex-col min-h-0 p-4 min-w-0`}>
                        <div className="mb-2 flex justify-between items-center h-6">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span>Logic Script</span>
                                <button 
                                    onClick={toggleSidebar}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded transition-colors"
                                    title={isSidebarOpen ? "Collapse Output Sidebar" : "Show Output Sidebar"}
                                >
                                    {isSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                                </button>
                            </div>
                            <button 
                                onClick={runScript} 
                                className="flex items-center gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm shadow-teal-600/20"
                            >
                                <Play size={12} /> Run
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                             <CodeEditor 
                                language="javascript" 
                                value={content} 
                                onChange={(val) => onChange(val || '')} 
                            />
                        </div>
                    </div>

                    {/* Resizable Output Sidebar */}
                    {isSidebarOpen && (
                        <>
                            {/* Resize Handle */}
                            <div 
                                className="w-1 bg-slate-200 hover:bg-teal-400 cursor-col-resize z-10 hover:w-1.5 -ml-0.5 transition-all flex items-center justify-center group flex-shrink-0"
                                onMouseDown={startResizing}
                            >
                                <div className="h-8 w-1 bg-slate-400 rounded-full group-hover:bg-white/80 hidden group-hover:block" />
                            </div>

                            <div 
                                className="flex flex-col min-h-0 bg-slate-50/50 p-4 gap-4 flex-shrink-0"
                                style={{ width: sidebarWidth }}
                            >
                                {/* Logs Console */}
                                <div className={`bg-slate-900 border border-slate-800 rounded-xl flex flex-col shadow-lg overflow-hidden transition-all duration-300 ${isConsoleOpen ? 'flex-1 min-h-[150px]' : 'flex-none h-10'}`}>
                                    <div 
                                        className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center cursor-pointer hover:bg-slate-800/50 select-none"
                                        onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <span>Console</span>
                                        </div>
                                        {executionResult?.error && <span className="text-red-400">Error</span>}
                                    </div>
                                    
                                    {isConsoleOpen && (
                                        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1">
                                            {!executionResult ? (
                                                <div className="text-slate-600 italic">Run script to see logs...</div>
                                            ) : executionResult.logs.length === 0 ? (
                                                <div className="text-slate-600 italic">No logs emitted.</div>
                                            ) : (
                                                executionResult.logs.map((log, i) => (
                                                    <div key={i} className="text-slate-300 border-b border-slate-800/50 pb-1 mb-1 last:border-0 break-all">
                                                        <span className="text-teal-500 mr-2 select-none">[{i+1}]</span>
                                                        {log}
                                                    </div>
                                                ))
                                            )}
                                            {executionResult?.error && (
                                                <div className="text-red-400 mt-2 pt-2 border-t border-red-900/30">
                                                    Runtime Error: {executionResult.error}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Final Context State */}
                                <div className={`bg-white border border-slate-300 rounded-xl flex flex-col shadow-sm overflow-hidden transition-all duration-300 ${isContextOpen ? 'flex-1 min-h-[150px]' : 'flex-none h-10'}`}>
                                    <div 
                                        className="px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center bg-slate-50 cursor-pointer hover:bg-slate-100 select-none"
                                        onClick={() => setIsContextOpen(!isContextOpen)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isContextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <span>Resulting Context</span>
                                        </div>
                                        <RefreshCw size={12} className="text-slate-400" />
                                    </div>
                                    
                                    {isContextOpen && (
                                        <div className="flex-1 p-3 overflow-y-auto">
                                            {executionResult?.finalContext ? (
                                                <TreeView data={executionResult.finalContext} />
                                            ) : (
                                                <div className="text-slate-400 text-sm italic">Waiting for execution...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Tools Panel */}
            <ToolsPanel 
                variablesObj={variables}
                variablesJson={variablesJson}
                onVariablesChange={onVariablesChange}
                variableError={variableError}
                functions={functions}
                onFunctionsChange={onFunctionsChange}
                activeEditorType={EditorType.SCRIPT_JS}
            />
        </div>
    );
};