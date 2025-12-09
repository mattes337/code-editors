import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserFunction, DbConnection, EditorType, SqlLibrary } from '../../lib/types';
import { CodeEditor, CodeEditorRef } from '../shared-ui/CodeEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { ConnectionManagerModal } from './ConnectionManagerModal';
import { Settings, Database, Play, Loader2, X, RefreshCw, Wand2 } from 'lucide-react';
import { interpolateString } from '../../lib/utils';
import { DEFAULT_SQL_DIALECT_DATA } from '../../lib/constants';

interface DbQueryEditorProps {
    content: string;
    onChange: (val: string) => void;
    
    // Store Props
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    functions: UserFunction[];
    onFunctionsChange: (funcs: UserFunction[]) => void;

    // DB Props
    connections: DbConnection[];
    activeConnectionId: string;
    onActiveConnectionChange: (id: string) => void;
    onUpdateConnections: (conns: DbConnection[]) => void;
    onExecuteQuery: (query: string, connection: DbConnection) => void;
    
    // Execution State
    isExecuting: boolean;
    executionResult: string | null;
    onCancelQuery: () => void;

    // Config
    sqlLibrary?: SqlLibrary;

    // AI Prop
    onAiAssist?: (prompt: string) => Promise<string>;
}

export const DbQueryEditor: React.FC<DbQueryEditorProps> = ({ 
    content = '', 
    onChange, 
    variablesJson = '{}',
    onVariablesChange,
    functions = [],
    onFunctionsChange,
    connections = [],
    activeConnectionId,
    onActiveConnectionChange,
    onUpdateConnections,
    onExecuteQuery,
    isExecuting,
    executionResult,
    onCancelQuery,
    sqlLibrary = DEFAULT_SQL_DIALECT_DATA,
    onAiAssist
}) => {
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [interpolatedQuery, setInterpolatedQuery] = useState('');
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

    const activeConnection = connections.find(c => c.id === activeConnectionId);
    
    // Check for missing functions
    useEffect(() => {
        const regex = /{{#func:([a-zA-Z0-9_]+)\(/g;
        const missing: Set<string> = new Set();
        let match;
        while ((match = regex.exec(content)) !== null) {
            const funcName = match[1];
            if (!functions.some(f => f.name === funcName)) {
                missing.add(funcName);
            }
        }
        setMissingFunctions(Array.from(missing));
    }, [content, functions]);

    useEffect(() => {
        try {
            const result = interpolateString(content, variablesObj, functions);
            setInterpolatedQuery(result);
        } catch (e: any) {
            setInterpolatedQuery(`Error interpolating variables: ${e.message}`);
        }
    }, [content, variablesObj, functions]);

    const handleExecute = () => {
        if (activeConnection) {
            onExecuteQuery(interpolatedQuery, activeConnection);
        }
    };

    const handleInsert = (text: string) => {
        if (editorRef.current) {
            editorRef.current.insertText(text);
        }
    };

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Editor Header / Toolbar */}
                <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Database size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-slate-700">Connection:</span>
                        </div>
                        
                        <div className="relative flex items-center">
                            <select 
                                value={activeConnectionId}
                                onChange={(e) => onActiveConnectionChange(e.target.value)}
                                disabled={isExecuting}
                                className={`appearance-none pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 w-48 truncate cursor-pointer ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="" disabled>Select Connection</option>
                                {connections.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.dialect})</option>
                                ))}
                            </select>
                            {/* Manage Connections Button */}
                            <button 
                                onClick={() => setIsManagerOpen(true)}
                                disabled={isExecuting}
                                className="ml-2 p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Manage Connections"
                            >
                                <Settings size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
                    {/* Source Editor */}
                    <div className="flex-1 flex flex-col min-h-0 p-4 min-w-0">
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex justify-between items-center h-6">
                            <span>SQL Query Template</span>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => editorRef.current?.format()}
                                    className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 p-0.5 rounded transition-colors"
                                    title="Format Code (Ctrl+F)"
                                >
                                    <Wand2 size={14} />
                                </button>
                                <span className="text-teal-600 font-mono text-[10px]">Handlebars Supported</span>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            <CodeEditor 
                                ref={editorRef}
                                language="sql" 
                                value={content} 
                                onChange={(val) => onChange(val || '')} 
                                readOnly={isExecuting}
                            />
                        </div>
                    </div>

                    {/* Preview / Results Panel */}
                    <div className="lg:w-1/3 flex flex-col min-h-0 bg-slate-50/50 p-4 border-l border-slate-200">
                         
                         {/* Compiled Query Section */}
                         <div className="flex-col flex-shrink-0 h-1/3 min-h-[150px] mb-4 flex">
                            <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider h-6">Compiled Query</div>
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden relative">
                                <CodeEditor 
                                    language="sql" 
                                    value={interpolatedQuery} 
                                    onChange={() => {}} 
                                    readOnly={true}
                                />
                            </div>
                         </div>
                         
                         {/* Execution Results Section */}
                         <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex justify-between items-center mb-2 h-6">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Query Results</span>
                                {executionResult && !isExecuting && (
                                    <button 
                                        onClick={handleExecute}
                                        className="text-[10px] flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium"
                                    >
                                        <RefreshCw size={10} /> Re-run
                                    </button>
                                )}
                            </div>

                            <div className={`flex-1 rounded-xl border flex flex-col overflow-hidden relative shadow-sm
                                ${isExecuting ? 'bg-slate-50 border-teal-200' : 'bg-white border-slate-200'}`}>
                                
                                {isExecuting ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="mb-4 relative">
                                            <div className="absolute inset-0 bg-teal-200/50 rounded-full animate-ping"></div>
                                            <div className="relative p-3 bg-white rounded-full border border-teal-100 shadow-sm">
                                                <Loader2 size={24} className="text-teal-600 animate-spin" />
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-700 mb-1">Executing Query...</h4>
                                        <p className="text-sm text-slate-400 mb-6">Waiting for database response</p>
                                        <button 
                                            onClick={onCancelQuery}
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <X size={14} /> Cancel
                                        </button>
                                    </div>
                                ) : executionResult ? (
                                    <div className="flex-1 flex flex-col min-h-0 relative">
                                        <CodeEditor 
                                            language="json" 
                                            value={executionResult} 
                                            onChange={() => {}} 
                                            readOnly={true}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="p-4 bg-teal-50 rounded-full mb-3">
                                            <Play size={24} className="text-teal-600 ml-1" />
                                        </div>
                                        <h4 className="font-bold text-slate-700 mb-1">Ready to Execute</h4>
                                        <p className="text-sm text-slate-400 mb-4 max-w-[200px]">
                                            Execute against <span className="font-mono text-teal-600">{activeConnection?.name || '...'}</span>
                                        </p>
                                        <button 
                                            onClick={handleExecute}
                                            disabled={!activeConnection}
                                            className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-lg
                                                ${activeConnection 
                                                    ? 'bg-teal-600 hover:bg-teal-700 hover:scale-105 shadow-teal-600/30' 
                                                    : 'bg-slate-300 cursor-not-allowed'}`}
                                        >
                                            Run Query
                                        </button>
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Tools Panel */}
            <ToolsPanel 
                variablesJson={variablesJson}
                onVariablesChange={onVariablesChange}
                functions={functions}
                onFunctionsChange={onFunctionsChange}
                activeEditorType={EditorType.DB_QUERY}
                sqlDialect={activeConnection?.dialect}
                missingFunctions={missingFunctions}
                sqlLibrary={sqlLibrary}
                onInsert={handleInsert}
                onUpdateContent={(val) => onChange(val)}
                onAiAssist={onAiAssist}
            />

            <ConnectionManagerModal 
                isOpen={isManagerOpen}
                connections={connections}
                onClose={() => setIsManagerOpen(false)}
                onUpdateConnections={onUpdateConnections}
            />
        </div>
    );
};