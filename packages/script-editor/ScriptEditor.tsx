import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserFunction, EditorType } from '../../lib/types';
import { executeScript } from '../../lib/utils';
import { Play, PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight, Wand2, RefreshCw } from 'lucide-react';
import { TreeView } from '../shared-ui/TreeView';
import { CodeEditor, CodeEditorRef } from '../shared-ui/CodeEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';

interface ScriptEditorProps {
    content: string;
    onChange: (val: string) => void;
    
    // Store Props
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    functions: UserFunction[];
    onFunctionsChange: (funcs: UserFunction[]) => void;
    
    // Optional
    onUpdateVariables?: (newVars: Record<string, any>) => void;

    // AI Prop
    onAiAssist?: (prompt: string) => Promise<string>;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ 
    content = '', 
    onChange, 
    variablesJson = '{}',
    onVariablesChange,
    functions = [],
    onFunctionsChange,
    onUpdateVariables,
    onAiAssist
}) => {
    const [executionResult, setExecutionResult] = useState<{ logs: string[], result: any, error?: string } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isConsoleOpen, setIsConsoleOpen] = useState(true);
    const [isContextOpen, setIsContextOpen] = useState(true);

    // Internal Variable Parsing
    const variablesObj = useMemo(() => {
        try {
            return JSON.parse(variablesJson);
        } catch {
            return {};
        }
    }, [variablesJson]);

    // Editor Ref
    const editorRef = useRef<CodeEditorRef>(null);

    // Resize & Layout State
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    // Layout Breakpoint
    const isStacked = containerWidth < 768;

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

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
        const result = executeScript(content, variablesObj, functions);
        setExecutionResult(result);
        
        // Ensure sidebar and console are open to see results
        if (!isSidebarOpen) {
            setIsSidebarOpen(true);
        }
        if (!isConsoleOpen && !isContextOpen) {
            setIsConsoleOpen(true);
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleInsert = (text: string) => {
        if (editorRef.current) {
            editorRef.current.insertText(text);
        }
    };

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" ref={containerRef}>
                <div className={`flex-1 flex ${isStacked ? 'flex-col' : 'flex-row'} gap-0 h-full relative`}>
                    {/* Code Editor */}
                    <div className={`flex-1 flex flex-col min-h-0 p-4 min-w-0`}>
                        <div className="mb-2 flex justify-between items-center h-6">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span>Logic Script</span>
                                <button 
                                    onClick={() => editorRef.current?.format()}
                                    className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 p-0.5 rounded transition-colors"
                                    title="Format Code (Ctrl+F)"
                                >
                                    <Wand2 size={14} />
                                </button>
                                <button 
                                    onClick={toggleSidebar}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded transition-colors ml-2"
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
                                ref={editorRef}
                                language="javascript" 
                                value={content} 
                                onChange={(val) => onChange(val || '')} 
                            />
                        </div>
                    </div>

                    {/* Resizable Output Sidebar */}
                    {isSidebarOpen && (
                        <>
                            {/* Resize Handle - Only when not stacked */}
                            {!isStacked && (
                                <div 
                                    className="w-1 bg-slate-200 hover:bg-teal-400 cursor-col-resize z-10 hover:w-1.5 -ml-0.5 transition-all flex items-center justify-center group flex-shrink-0"
                                    onMouseDown={startResizing}
                                >
                                    <div className="h-8 w-1 bg-slate-400 rounded-full group-hover:bg-white/80 hidden group-hover:block" />
                                </div>
                            )}

                            <div 
                                className="flex flex-col min-h-0 bg-slate-50/50 p-4 gap-4 flex-shrink-0"
                                style={{ 
                                    width: isStacked ? '100%' : sidebarWidth,
                                    height: isStacked ? '50%' : '100%',
                                    borderTop: isStacked ? '1px solid #e2e8f0' : 'none',
                                    borderLeft: isStacked ? 'none' : undefined
                                }}
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

                                {/* Final Result */}
                                <div className={`bg-white border border-slate-300 rounded-xl flex flex-col shadow-sm overflow-hidden transition-all duration-300 ${isContextOpen ? 'flex-1 min-h-[150px]' : 'flex-none h-10'}`}>
                                    <div 
                                        className="px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center bg-slate-50 cursor-pointer hover:bg-slate-100 select-none"
                                        onClick={() => setIsContextOpen(!isContextOpen)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isContextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <span>Result</span>
                                        </div>
                                        <RefreshCw size={12} className="text-slate-400" />
                                    </div>
                                    
                                    {isContextOpen && (
                                        <div className="flex-1 p-3 overflow-y-auto">
                                            {executionResult ? (
                                                executionResult.result !== undefined ? (
                                                    <TreeView data={executionResult.result} label="Output" defaultOpen={true} />
                                                ) : (
                                                    <div className="text-slate-400 text-sm italic">Script executed but returned no value (undefined).</div>
                                                )
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
                variablesJson={variablesJson}
                onVariablesChange={onVariablesChange}
                functions={functions}
                onFunctionsChange={onFunctionsChange}
                activeEditorType={EditorType.SCRIPT_JS}
                onInsert={handleInsert}
                onUpdateContent={(val) => onChange(val)}
                onAiAssist={onAiAssist}
            />
        </div>
    );
};