import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { interpolateString, insertIntoNativeInput } from '../../lib/utils';
import { UserFunction, EditorType, EmailSnippetGroup, HostImage, DbConnection, EmailMessageState, EmailMeta } from '../../lib/types';
import { CodeEditor, CodeEditorRef } from '../shared-ui/CodeEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { PanelRightClose, PanelRightOpen, Wand2, Mail, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { DEFAULT_EMAIL_SNIPPET_GROUPS } from '../../lib/constants';

interface EmailEditorProps {
    content: EmailMessageState;
    onChange: (val: EmailMessageState) => void;
    
    // Store Props
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    functions: UserFunction[];
    onFunctionsChange: (funcs: UserFunction[]) => void;
    
    // Config
    emailBlockGroups?: EmailSnippetGroup[];
    hostImages?: HostImage[];
    onAddImage?: (img: HostImage) => void;
    onDeleteImage?: (id: string) => void;

    // Connections
    connections: DbConnection[];

    // AI Prop
    onAiAssist?: (prompt: string) => Promise<string>;
}

export const EmailEditor: React.FC<EmailEditorProps> = ({ 
    content, 
    onChange, 
    variablesJson = '{}',
    onVariablesChange,
    functions = [],
    onFunctionsChange,
    emailBlockGroups = DEFAULT_EMAIL_SNIPPET_GROUPS,
    hostImages = [],
    onAddImage,
    onDeleteImage,
    connections = [],
    onAiAssist
}) => {
    // Destructure content state
    const { html, meta } = content;

    const [resolvedMeta, setResolvedMeta] = useState({
        to: '',
        from: '',
        subject: '',
        cc: '',
        bcc: '',
        replyTo: ''
    });

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
        while ((match = regex.exec(html)) !== null) {
            const funcName = match[1];
            if (!safeFunctions.some(f => f.name === funcName)) {
                missing.add(funcName);
            }
        }
        
        const legacyRegex = /{{\s*func\s+['"]([a-zA-Z0-9_]+)['"]/g;
        while ((match = legacyRegex.exec(html)) !== null) {
            const funcName = match[1];
            if (!safeFunctions.some(f => f.name === funcName)) {
                missing.add(funcName);
            }
        }
        setMissingFunctions(Array.from(missing));
    }, [html, functions]);

    useEffect(() => {
        try {
            const imagesContext = (hostImages || []).reduce((acc, img) => {
                acc[img.name] = img.url;
                return acc;
            }, {} as Record<string, string>);

            const combinedContext = {
                ...variablesObj,
                images: imagesContext
            };

            const interpolated = interpolateString(html, combinedContext, functions || []);
            setPreviewContent(interpolated);

            // Interpolate Meta Fields
            const safeInterpolate = (tmpl: string) => {
                try {
                    return interpolateString(tmpl, combinedContext, functions || []);
                } catch {
                    return tmpl;
                }
            };

            setResolvedMeta({
                to: safeInterpolate(meta.to),
                from: safeInterpolate(meta.from),
                subject: safeInterpolate(meta.subject),
                cc: safeInterpolate(meta.cc),
                bcc: safeInterpolate(meta.bcc),
                replyTo: safeInterpolate(meta.replyTo)
            });

            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, [html, variablesObj, functions, hostImages, meta]);

    const handleInsert = (text: string) => {
        // Prioritize the main editor insertion if it has focus
        if (editorRef.current && editorRef.current.hasTextFocus()) {
            editorRef.current.insertText(text);
            return;
        }
        // Fallback to native input (e.g. sidebar inputs)
        insertIntoNativeInput(document.activeElement, text);
    };

    const updateMeta = (key: keyof EmailMeta, val: string) => {
        onChange({ ...content, meta: { ...meta, [key]: val } });
    };

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" ref={containerRef}>
                {/* Header Toolbar */}
                <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-teal-700 font-bold text-sm">
                            <Mail size={16} />
                            <span>Email Editor</span>
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
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Properties</span>
                    </div>
                    
                    {!isMetaCollapsed && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-4 animate-in slide-in-from-top-2">
                             <div className="col-span-2 lg:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking