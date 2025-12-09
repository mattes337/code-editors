import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { interpolateString, insertIntoNativeInput } from '../../lib/utils';
import { UserFunction, EditorType, DbConnection, SmsMessageState, SmsMeta } from '../../lib/types';
import { CodeEditor, CodeEditorRef } from '../shared-ui/CodeEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { PanelRightClose, PanelRightOpen, Wand2, MessageSquare, Database, ChevronDown, ChevronRight } from 'lucide-react';

interface SmsEditorProps {
    content: SmsMessageState;
    onChange: (val: SmsMessageState) => void;
    
    // Store Props
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    functions: UserFunction[];
    onFunctionsChange: (funcs: UserFunction[]) => void;
    
    // Connections
    connections: DbConnection[];

    // AI Prop
    onAiAssist?: (prompt: string) => Promise<string>;
}

export const SmsEditor: React.FC<SmsEditorProps> = ({ 
    content, 
    onChange, 
    variablesJson = '{}',
    onVariablesChange,
    functions = [],
    onFunctionsChange,
    connections = [],
    onAiAssist
}) => {
    // Destructure content
    const { body, meta } = content;

    const [isMetaCollapsed, setIsMetaCollapsed] = useState(false);

    // Preview State
    const [previewContent, setPreviewContent] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(true);
    const [missingFunctions, setMissingFunctions] = useState<string[]>([]);

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
    const [previewWidth, setPreviewWidth] = useState(600);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    // Layout Breakpoint
    const isStacked = containerWidth < 850;

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
            
            if (newWidth > 300 && newWidth < containerRect.width - 200) {
                setPreviewWidth(newWidth);
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

    // Check for missing functions
    useEffect(() => {
        const safeFunctions = Array.isArray(functions) ? functions : [];
        const regex = /{{#func:([a-zA-Z0-9_]+)\(/g;
        const missing: Set<string> = new Set();
        let match;
        while ((match = regex.exec(body)) !== null) {
            const funcName = match[1];
            if (!safeFunctions.some(f => f.name === funcName)) {
                missing.add(funcName);
            }
        }
        
        const legacyRegex = /{{\s*func\s+['"]([a-zA-Z0-9_]+)['"]/g;
        while ((match = legacyRegex.exec(body)) !== null) {
            const funcName = match[1];
            if (!safeFunctions.some(f => f.name === funcName)) {
                missing.add(funcName);
            }
        }
        setMissingFunctions(Array.from(missing));
    }, [body, functions]);

    useEffect(() => {
        try {
            const interpolated = interpolateString(body, variablesObj, functions || []);
            setPreviewContent(interpolated);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, [body, variablesObj, functions]);

    const handleInsert = (text: string) => {
        if (insertIntoNativeInput(document.activeElement, text)) return;

        if (editorRef.current && editorRef.current.hasTextFocus()) {
            editorRef.current.insertText(text);
        }
    };

    const updateMeta = (key: keyof SmsMeta, val: string) => {
        onChange({ ...content, meta: { ...meta, [key]: val } });
    };

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" ref={containerRef}>
                {/* Header Toolbar */}
                <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-teal-700 font-bold text-sm">
                            <MessageSquare size={16} />
                            <span>SMS Composer</span>
                        </div>

                        <div className="h-4 w-px bg-slate-200"></div>

                        <div className="flex items-center gap-2">
                            <Database size={14} className="text-slate-400" />
                            <select 
                                value={meta.connectionId}
                                onChange={(e) => updateMeta('connectionId', e.target.value)}
                                className="appearance-none bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer hover:text-teal-700"
                            >
                                <option value="">Select Connection...</option>
                                {connections.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 pointer-events-none -ml-1" />
                        </div>
                     </div>
                </div>

                {/* Metadata Fields */}
                <div className="bg-slate-50 border-b border-slate-200 flex flex-col shrink-0">
                    <div 
                        className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => setIsMetaCollapsed(!isMetaCollapsed)}
                    >
                        {isMetaCollapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Properties</span>
                    </div>
                    
                    {!isMetaCollapsed && (
                        <div className="grid grid-cols-2 gap-4 px-4 pb-4 animate-in slide-in-from-top-2">
                             <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">From (Sender ID)</label>
                                <input 
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                                    value={meta.from}
                                    onChange={e => updateMeta('from', e.target.value)}
                                    placeholder="PromoBot"
                                />
                             </div>
                             <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">To (Recipient)</label>
                                <input 
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 font-mono text-slate-600"
                                    value={meta.to}
                                    onChange={e => updateMeta('to', e.target.value)}
                                />
                             </div>
                        </div>
                    )}
                </div>

                <div className={`flex-1 flex ${isStacked ? 'flex-col' : 'flex-row'} gap-0 min-h-0 relative`}>
                     {/* Source Editor */}
                     <div className={`flex-1 flex flex-col min-h-0 p-4 min-w-0`}>
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex justify-between items-center h-6">
                            <span>Message Body</span>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => editorRef.current?.format()}
                                    className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 p-0.5 rounded transition-colors"
                                    title="Format Code (Ctrl+F)"
                                >
                                    <Wand2 size={14} />
                                </button>
                                <span className="text-teal-600 font-mono text-[10px]">Handlebars</span>
                                <button 
                                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded transition-colors"
                                    title={isPreviewOpen ? "Collapse Preview" : "Show Preview"}
                                >
                                    {isPreviewOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                             <CodeEditor 
                                ref={editorRef}
                                language={'handlebars'}
                                value={body} 
                                onChange={(val) => onChange({ ...content, body: val || '' })} 
                            />
                        </div>
                    </div>

                    {/* Resizable Preview */}
                    {isPreviewOpen && (
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
                                className="flex flex-col min-h-0 bg-slate-50/50 p-4 overflow-hidden flex-shrink-0"
                                style={{ 
                                    width: isStacked ? '100%' : previewWidth,
                                    height: isStacked ? '50%' : '100%',
                                    borderTop: isStacked ? '1px solid #e2e8f0' : 'none',
                                    borderLeft: isStacked ? 'none' : undefined
                                }}
                            >
                                <div className="flex justify-between items-center mb-2 h-6">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Preview</div>
                                    {error && <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded truncate max-w-[300px]">{error}</span>}
                                </div>
                                
                                <div className="flex-1 flex items-center justify-center bg-slate-200 rounded-xl border border-slate-300 relative shadow-inner overflow-hidden">
                                    <div className="w-[300px] bg-white rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                                        {/* Fake Phone Header */}
                                        <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                                            <div className="text-[10px] font-bold text-slate-500">9:41</div>
                                            <div className="flex gap-1">
                                                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                                                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                                            </div>
                                        </div>
                                        
                                        {/* Fake Phone Body */}
                                        <div className="flex-1 bg-slate-50 p-4 overflow-y-auto">
                                            <div className="flex flex-col gap-2 items-start">
                                                <div className="bg-slate-200 text-slate-600 text-xs px-3 py-2 rounded-2xl rounded-bl-none max-w-[80%]">
                                                    Sent from {meta.from}
                                                </div>
                                                <div className="bg-blue-500 text-white text-sm px-4 py-3 rounded-2xl rounded-bl-none shadow-sm max-w-[90%] break-words whitespace-pre-wrap">
                                                    {previewContent || <span className="opacity-50 italic">Message content...</span>}
                                                </div>
                                                <div className="text-[9px] text-slate-400 ml-1">Delivered</div>
                                            </div>
                                        </div>

                                        {/* Fake Phone Input */}
                                        <div className="bg-slate-100 p-3 border-t border-slate-200 shrink-0">
                                            <div className="h-8 bg-white rounded-full border border-slate-200 w-full"></div>
                                        </div>
                                    </div>
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
                activeEditorType={EditorType.SMS_MSG}
                missingFunctions={missingFunctions}
                onInsert={handleInsert}
                onUpdateContent={(val) => onChange({ ...content, body: val })}
                onAiAssist={onAiAssist}
            />
        </div>
    );
};