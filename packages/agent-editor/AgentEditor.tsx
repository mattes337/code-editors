import React, { useState, useCallback, useMemo } from 'react';
import { AgentConfig, UserFunction, EditorType } from '../../lib/types';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { interpolateString, insertIntoNativeInput } from '../../lib/utils';
import { 
    Play, Edit2, AlertCircle
} from 'lucide-react';

// Atomic Organisms
import { AgentModelPanel } from './components/AgentModelPanel';
import { AgentPromptPanel } from './components/AgentPromptPanel';
import { AgentOutputPanel } from './components/AgentOutputPanel';
import { AgentCapabilitiesPanel } from './components/AgentCapabilitiesPanel';

interface AgentEditorProps {
    // Data
    config: AgentConfig;
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    functions: UserFunction[];

    // Callbacks
    onChange: (config: AgentConfig) => void;
    onFunctionsChange: (funcs: UserFunction[]) => void;
    
    // Services
    onAiAssist?: (prompt: string) => Promise<string>;
    onRun?: () => void;

    // Execution State
    isRunning?: boolean;
    runError?: string | null;
    externalRunTrigger?: { message: string, timestamp: number } | null;

    // Visibility
    showVariables?: boolean;
    showFunctions?: boolean;
    showAi?: boolean;
}

export const AgentEditor: React.FC<AgentEditorProps> = ({ 
    config, 
    onChange, 
    variablesJson = '{}', 
    onVariablesChange, 
    functions = [],
    onFunctionsChange,
    onAiAssist,
    onRun,
    isRunning,
    runError,
    externalRunTrigger,
    showVariables = true,
    showFunctions = true,
    showAi = true
}) => {
    // Local State for Run Trigger interpolation
    const [processedRunTrigger, setProcessedRunTrigger] = useState<{message: string, timestamp: number} | null>(null);

    // Internal Variable Parsing
    const variablesObj = useMemo(() => {
        try {
            return JSON.parse(variablesJson);
        } catch {
            return {};
        }
    }, [variablesJson]);

    // Update generic config key
    const updateConfig = useCallback((key: keyof AgentConfig, value: any) => {
        onChange({ ...config, [key]: value });
    }, [config, onChange]);

    // Handle External Run Trigger (from App)
    React.useEffect(() => {
        if (externalRunTrigger) {
            try {
                // Interpolate before sending to chat panel
                const interpolated = interpolateString(config.userMessageInput, variablesObj, functions);
                setProcessedRunTrigger({ 
                    message: interpolated, 
                    timestamp: externalRunTrigger.timestamp 
                });
            } catch (e: any) {
                // If interpolation fails, we still trigger but might show raw template
                setProcessedRunTrigger({ 
                    message: config.userMessageInput, 
                    timestamp: externalRunTrigger.timestamp 
                });
            }
        }
    }, [externalRunTrigger, config.userMessageInput, variablesObj, functions]);

    return (
        <div className="flex h-full w-full relative">
            {/* Left: Configuration Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50 custom-scrollbar">
                
                {/* Editor Header (Internal) */}
                <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 shadow-sm">
                    <div className="max-w-5xl mx-auto flex justify-between items-start">
                        <div className="flex-1 mr-8">
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span>Agent Configuration</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-teal-600">{config.agentType}</span>
                            </div>
                            <div className="flex items-center gap-3 mb-2 group">
                                <input 
                                    className="text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-teal-500 focus:outline-none w-full transition-all placeholder-slate-300" 
                                    value={config.name}
                                    onChange={e => updateConfig('name', e.target.value)}
                                    placeholder="Agent Name"
                                />
                                <Edit2 size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <input 
                                className="text-slate-500 text-sm bg-transparent border-none focus:ring-0 p-0 w-full placeholder-slate-300" 
                                value={config.description}
                                onChange={e => updateConfig('description', e.target.value)}
                                placeholder="Describe the purpose of this agent..."
                            />
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <button 
                                onClick={onRun}
                                disabled={isRunning}
                                className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95
                                    ${isRunning 
                                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                        : 'bg-teal-600 hover:bg-teal-700 hover:scale-105 shadow-teal-600/20'}`}
                            >
                                <Play size={18} fill="currentColor" className={isRunning ? "opacity-50" : ""} />
                                <span>{isRunning ? 'Running...' : 'Run Agent'}</span>
                            </button>
                            {runError && (
                                <div className="text-xs text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                                    <AlertCircle size={12} /> {runError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Editor Body: Composition of Atomic Panels */}
                <div className="max-w-5xl mx-auto w-full p-8 pb-24 space-y-8">
                    
                    <AgentModelPanel 
                        config={config} 
                        onChange={onChange} 
                    />

                    <AgentPromptPanel 
                        config={config} 
                        onChange={onChange} 
                        variables={variablesObj}
                        functions={functions}
                    />

                    <AgentOutputPanel 
                        config={config}
                        onChange={onChange}
                    />

                    <AgentCapabilitiesPanel 
                        config={config} 
                        onChange={onChange} 
                        functions={functions}
                    />

                </div>
            </div>

            {/* Right: Tools & Assistant */}
            <ToolsPanel 
                variablesJson={variablesJson}
                onVariablesChange={onVariablesChange}
                functions={functions}
                onFunctionsChange={onFunctionsChange}
                activeEditorType={EditorType.AGENT}
                onInsert={(text) => {
                    if (insertIntoNativeInput(document.activeElement, text)) return;
                    navigator.clipboard.writeText(text);
                }}
                onAiAssist={onAiAssist}
                runTrigger={processedRunTrigger}
                showVariables={showVariables}
                showFunctions={showFunctions}
                showChat={showAi}
            />
        </div>
    );
};