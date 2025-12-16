import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Play, Server, Box, Terminal, 
    Wifi, CheckCircle2, AlertCircle, RefreshCw, Loader2, Hammer, Power, ChevronRight, Plug, Link as LinkIcon, Settings, Database, Globe,
    PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { McpState, UserFunction, EditorType, RestParam, McpToolDefinition, McpConnection } from '../../lib/types';
import { CodeEditor } from '../shared-ui/CodeEditor';
import { KeyValueEditor } from '../shared-ui/KeyValueEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { interpolateString, insertIntoNativeInput } from '../../lib/utils';
import { McpConnectionModal } from './McpConnectionModal';

interface McpEditorProps {
    config: McpState;
    onChange: (config: McpState) => void;
    
    // Connections
    connections: McpConnection[];
    onUpdateConnections: (connections: McpConnection[]) => void;
    activeConnectionId: string;
    onActiveConnectionChange: (id: string) => void;

    // Store Props
    variablesJson: string;
    onVariablesChange: (json: string) => void;
    functions: UserFunction[];
    onFunctionsChange: (funcs: UserFunction[]) => void;
    
    // Services
    onAiAssist?: (prompt: string) => Promise<string>;

    // Visibility
    showVariables?: boolean;
    showFunctions?: boolean;
    showAi?: boolean;
    enableLocalServers?: boolean;
}

export const McpEditor: React.FC<McpEditorProps> = ({ 
    config, 
    onChange, 
    connections = [],
    onUpdateConnections,
    activeConnectionId,
    onActiveConnectionChange,
    variablesJson = '{}', 
    onVariablesChange, 
    functions = [],
    onFunctionsChange,
    onAiAssist,
    showVariables = true,
    showFunctions = true,
    showAi = true,
    enableLocalServers = true
}) => {
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [statusMessage, setStatusMessage] = useState('');
    const [availableTools, setAvailableTools] = useState<McpToolDefinition[]>([]);
    
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isOutputOpen, setIsOutputOpen] = useState(false);

    // Connection State
    const eventSourceRef = useRef<EventSource | null>(null);
    const [postEndpoint, setPostEndpoint] = useState<string | null>(null);
    
    // Request Management
    // Maps Request ID -> { resolve, reject }
    const pendingRequests = useRef<Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>>(new Map());

    // Internal Variable Parsing
    const variablesObj = useMemo(() => {
        try {
            return JSON.parse(variablesJson);
        } catch {
            return {};
        }
    }, [variablesJson]);

    const activeConnection = connections.find(c => c.id === activeConnectionId);
    const isLocalConnection = activeConnection?.type === 'stdio';

    const updateConfig = (key: keyof McpState, value: any) => {
        onChange({ ...config, [key]: value });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            // Reject all pending requests
            pendingRequests.current.forEach(({ reject }) => reject(new Error('Component unmounted')));
            pendingRequests.current.clear();
        };
    }, []);

    // When active connection changes, disconnect current
    useEffect(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            setConnectionStatus('disconnected');
            setPostEndpoint(null);
            setAvailableTools([]);
            setStatusMessage('');
        }
    }, [activeConnectionId]);

    const getAuthHeaders = () => {
        if (!activeConnection || !activeConnection.auth) return {};
        const headers: Record<string, string> = {};
        const { auth } = activeConnection;

        if (auth.type === 'basic' && auth.basic) {
            const user = interpolateString(auth.basic.username || '', variablesObj, functions);
            const pass = interpolateString(auth.basic.password || '', variablesObj, functions);
            const b64 = btoa(`${user}:${pass}`);
            headers['Authorization'] = `Basic ${b64}`;
        } else if (auth.type === 'bearer' && auth.bearer) {
            const token = interpolateString(auth.bearer.token || '', variablesObj, functions);
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Note: OAuth2 sets type to 'bearer' via applyAccessToken in the new logic
        
        return headers;
    };

    const getProxiedUrl = (url: string) => {
        if (activeConnection?.useProxy) {
            return `https://corsproxy.io/?${encodeURIComponent(url)}`;
        }
        return url;
    };

    // RPC Call - Supports both Direct HTTP Response and Async SSE Response
    const rpcCall = async (method: string, params: any = {}, endpoint: string) => {
        const id = Date.now();
        const payload = {
            jsonrpc: "2.0",
            method,
            params,
            id
        };
        
        const reqHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream' 
        };
        
        // Add headers from active connection
        if (activeConnection) {
            activeConnection.headers.forEach(h => { 
                if(h.enabled) reqHeaders[h.key] = interpolateString(h.value, variablesObj, functions); 
            });
            // Merge explicit auth headers
            Object.assign(reqHeaders, getAuthHeaders());
        }

        // Create a promise that waits for the SSE response
        // We race this against the HTTP response below
        const responsePromise = new Promise((resolve, reject) => {
            pendingRequests.current.set(id, { resolve, reject });
            
            // Timeout safety (30s)
            setTimeout(() => {
                if (pendingRequests.current.has(id)) {
                    pendingRequests.current.delete(id);
                    reject(new Error(`RPC Timeout: No response received for method '${method}' within 30s`));
                }
            }, 30000);
        });

        try {
            const res = await fetch(getProxiedUrl(endpoint), {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(payload)
            });

            // Always try to read body text first for debugging errors
            const textBody = await res.text();
            
            // Check content type for JSON response
            const contentType = res.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");

            if (!res.ok) {
                let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
                
                // Try to parse error details from body
                if (textBody) {
                    try {
                        const errorJson = JSON.parse(textBody);
                        if (errorJson.error && errorJson.error.message) {
                            errorMessage = errorJson.error.message;
                        } else if (errorJson.message) {
                            errorMessage = errorJson.message;
                        } else {
                            errorMessage = textBody.substring(0, 200); // Truncate long HTML bodies
                        }
                    } catch {
                        // If text body isn't JSON, append it if it's short
                        if (textBody.length < 200) errorMessage += ` (${textBody})`;
                    }
                }
                
                pendingRequests.current.delete(id);
                throw new Error(errorMessage);
            }

            // Check if server returned the result directly (JSON-RPC over HTTP)
            if (isJson && textBody) {
                try {
                    const json = JSON.parse(textBody);
                    
                    // If it's a direct JSON-RPC response matching our ID
                    if (json.id === id || json.jsonrpc) {
                        pendingRequests.current.delete(id); // Clear pending since we got it here
                        if (json.error) throw new Error(json.error.message || 'Unknown RPC error');
                        return json.result;
                    }
                } catch (e) {
                    console.warn("Failed to parse successful HTTP response as JSON-RPC", e);
                }
            }

            // If not JSON or standard 202 Accepted, await the SSE response
            return await responsePromise;

        } catch (e) {
            pendingRequests.current.delete(id);
            throw e;
        }
    };

    // 1. Connect (SSE)
    const handleConnect = () => {
        if (!activeConnection || isLocalConnection) return;
        
        // Close existing
        if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
            eventSourceRef.current?.close();
            setConnectionStatus('disconnected');
            setPostEndpoint(null);
            setAvailableTools([]);
            return;
        }

        setConnectionStatus('connecting');
        setStatusMessage('Establishing SSE connection...');
        setAvailableTools([]);
        setPostEndpoint(null);

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const es = new EventSource(getProxiedUrl(activeConnection.url));
            eventSourceRef.current = es;

            let endpointTimeout: any;

            es.onopen = () => {
                setStatusMessage('SSE Connected. Waiting for endpoint...');
                
                // Fallback: If no endpoint event received in 5s, try using the serverUrl itself
                endpointTimeout = setTimeout(() => {
                    if (!postEndpoint) {
                        console.warn("No endpoint event received. Falling back to Server URL.");
                        handleEndpointDiscovery(activeConnection.url);
                    }
                }, 5000);
            };

            // Standard MCP 'endpoint' event
            es.addEventListener('endpoint', (e: MessageEvent) => {
                clearTimeout(endpointTimeout);
                handleEndpointDiscovery(e.data);
            });

            // Handle incoming JSON-RPC responses
            es.onmessage = (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    
                    // 1. Check for RPC Responses (matching ID)
                    if (data.id && pendingRequests.current.has(data.id)) {
                        const { resolve, reject } = pendingRequests.current.get(data.id)!;
                        if (data.error) {
                            reject(new Error(data.error.message));
                        } else {
                            resolve(data.result);
                        }
                        pendingRequests.current.delete(data.id);
                    }
                    
                    // 2. Handle Notifications (no ID)
                    if (!data.id && data.method) {
                        console.log("MCP Notification:", data);
                    }

                } catch (err) {
                    console.debug("Non-JSON message received:", e.data);
                }
            };

            es.onerror = (e) => {
                clearTimeout(endpointTimeout);
                setConnectionStatus('error');
                setStatusMessage('Connection failed. Check URL and CORS.');
                es.close();
            };

        } catch (e: any) {
            setConnectionStatus('error');
            setStatusMessage(e.message);
        }
    };

    const handleEndpointDiscovery = async (uri: string) => {
        if (!activeConnection) return;

        // Resolve URI relative to serverUrl (use original URL, not proxy wrapper for resolution)
        let finalEndpoint = uri;
        try {
            finalEndpoint = new URL(uri, activeConnection.url).toString();
        } catch {
            // keep as is if invalid
        }
        
        setPostEndpoint(finalEndpoint);
        setStatusMessage(`Endpoint set: ${finalEndpoint}`);
        
        // Start Initialization Flow
        try {
            await performHandshake(finalEndpoint);
        } catch (err: any) {
            setConnectionStatus('error');
            setStatusMessage(`Handshake failed: ${err.message}`);
            eventSourceRef.current?.close();
        }
    };

    // 2. Initialize & List Tools
    const performHandshake = async (endpoint: string) => {
        setStatusMessage('Initializing MCP...');
        
        // Init
        await rpcCall('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {
                roots: { listChanged: true },
                sampling: {}
            },
            clientInfo: {
                name: 'DevForgeClient',
                version: '1.0.0'
            }
        }, endpoint);

        // Notify initialized
        const notificationPayload = {
            jsonrpc: "2.0",
            method: "notifications/initialized"
        };
        
        const reqHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        };

        if (activeConnection) {
            activeConnection.headers.forEach(h => { 
                if(h.enabled) reqHeaders[h.key] = interpolateString(h.value, variablesObj, functions); 
            });
            // Merge explicit auth headers
            Object.assign(reqHeaders, getAuthHeaders());
        }
        
        await fetch(getProxiedUrl(endpoint), {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(notificationPayload)
        });

        // List Tools
        setStatusMessage('Fetching tools...');
        const toolsRes = await rpcCall('tools/list', {}, endpoint);
        
        if (toolsRes && toolsRes.tools) {
            setAvailableTools(toolsRes.tools);
            setConnectionStatus('connected');
            setStatusMessage('Ready');
        } else {
            setStatusMessage('Connected, but no tools returned.');
            setConnectionStatus('connected');
        }
    };

    // When selecting a tool, generate arguments based on schema
    const handleSelectTool = (toolName: string) => {
        const tool = availableTools.find(t => t.name === toolName);
        if (!tool) return;

        // Parse Schema to RestParam[]
        const newArgs: RestParam[] = [];
        if (tool.inputSchema && tool.inputSchema.properties) {
            Object.entries(tool.inputSchema.properties).forEach(([key, schema]: [string, any]) => {
                const desc = schema.description || (schema.enum ? `Enum: ${schema.enum.join(', ')}` : '');
                // Handle basic types defaults
                let defaultValue = '';
                if (schema.default !== undefined) defaultValue = String(schema.default);

                newArgs.push({
                    id: key,
                    key: key,
                    value: defaultValue,
                    enabled: true,
                    description: desc
                });
            });
        }

        onChange({
            ...config,
            operation: 'CallTool',
            toolName: toolName,
            args: newArgs,
            toolArguments: '{}' // Reset raw JSON
        });
    };

    const handleRefreshTools = async () => {
        if (!postEndpoint) {
            handleConnect();
            return;
        }
        try {
            setIsLoading(true);
            const toolsRes = await rpcCall('tools/list', {}, postEndpoint);
            if (toolsRes && toolsRes.tools) {
                setAvailableTools(toolsRes.tools);
            }
        } catch (e: any) {
            setResult(JSON.stringify({ error: e.message }, null, 2));
        } finally {
            setIsLoading(false);
        }
    };

    // Execute the Tool
    const handleExecute = async () => {
        if (!config.toolName || !postEndpoint) return;
        setIsLoading(true);
        setResult('');
        setIsOutputOpen(true); // Auto-expand output

        try {
            // Build Args Object
            const argsObj: Record<string, any> = {};
            config.args.forEach(arg => {
                if (arg.enabled) {
                    let val: any = interpolateString(arg.value, variablesObj, functions);
                    // Attempt to cast to number/boolean if it looks like one
                    if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
                    else if (val === 'true') val = true;
                    else if (val === 'false') val = false;
                    
                    argsObj[arg.key] = val;
                }
            });

            const response = await rpcCall('tools/call', {
                name: config.toolName,
                arguments: argsObj
            }, postEndpoint);

            setResult(JSON.stringify(response, null, 2));
        } catch (e: any) {
            setResult(JSON.stringify({ error: e.message }, null, 2));
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsert = (text: string) => {
        insertIntoNativeInput(document.activeElement, text);
    };

    const isConnected = connectionStatus === 'connected';

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
                
                {/* Header Toolbar */}
                <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-teal-700 font-bold text-sm">
                            <Server size={16} />
                            <span>MCP Client</span>
                        </div>

                        <div className="h-4 w-px bg-slate-200"></div>

                        {/* Connection Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Server</span>
                            <div className="relative flex items-center">
                                {isLocalConnection && (
                                    <div className="absolute left-2 text-slate-400 pointer-events-none">
                                        <Terminal size={14} />
                                    </div>
                                )}
                                {!isLocalConnection && (
                                    <div className="absolute left-2 text-slate-400 pointer-events-none">
                                        <Globe size={14} />
                                    </div>
                                )}
                                <select 
                                    value={activeConnectionId}
                                    onChange={(e) => onActiveConnectionChange(e.target.value)}
                                    disabled={connectionStatus === 'connecting'}
                                    className="appearance-none pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 w-48 truncate cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select Server</option>
                                    {connections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.type === 'stdio' ? '(Local)' : ''}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => setIsManagerOpen(true)}
                                    className="ml-2 p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                    title="Manage Servers"
                                >
                                    <Settings size={16} />
                                </button>
                            </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-4">
                        {statusMessage && (
                            <span className="text-xs text-slate-400 font-mono hidden md:block max-w-[200px] truncate" title={statusMessage}>
                                {statusMessage}
                            </span>
                        )}
                        
                        {isLocalConnection ? (
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium">
                                <AlertCircle size={14} />
                                Cannot test local servers in browser
                            </span>
                        ) : (
                            <button 
                                onClick={handleConnect}
                                disabled={!activeConnection || connectionStatus === 'connecting'}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                                    ${isConnected 
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                                        : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {connectionStatus === 'connecting' ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                {isConnected ? 'Disconnect' : 'Connect'}
                            </button>
                        )}
                     </div>
                </div>

                {/* 2. Main Workspace */}
                <div className="flex-1 flex min-h-0">
                    
                    {/* Sidebar: Tool Discovery */}
                    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Hammer size={14} /> Available Tools
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {availableTools.length === 0 && (
                                <div className="text-center p-6 text-slate-400 text-xs italic">
                                    {isLocalConnection 
                                        ? 'Local tools only available in Agent runtime.' 
                                        : (isConnected ? 'No tools found.' : 'Connect to list tools.')}
                                </div>
                            )}
                            {availableTools.map(tool => (
                                <div 
                                    key={tool.name}
                                    onClick={() => handleSelectTool(tool.name)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border group
                                        ${config.toolName === tool.name 
                                            ? 'bg-white border-teal-500 shadow-sm ring-1 ring-teal-500/20' 
                                            : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm'}`}
                                >
                                    <div className={`text-sm font-bold truncate ${config.toolName === tool.name ? 'text-teal-700' : 'text-slate-700'}`}>{tool.name}</div>
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{tool.description}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-slate-200">
                            <button 
                                onClick={handleRefreshTools} 
                                disabled={!isConnected || isLocalConnection}
                                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-teal-600 py-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={12} /> Refresh List
                            </button>
                        </div>
                    </div>

                    {/* Center: Tool Configuration */}
                    <div className="flex-1 flex flex-col bg-white border-r border-slate-200 min-w-0">
                        {config.toolName ? (
                            <div className="flex flex-col h-full">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Hammer size={20} className="text-teal-600 shrink-0" />
                                            <span className="truncate">{config.toolName}</span>
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-2" title={availableTools.find(t => t.name === config.toolName)?.description}>
                                            {availableTools.find(t => t.name === config.toolName)?.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            onClick={handleExecute}
                                            disabled={isLoading || !isConnected}
                                            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
                                        >
                                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                            Run Tool
                                        </button>
                                        <button
                                            onClick={() => setIsOutputOpen(!isOutputOpen)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title={isOutputOpen ? "Collapse Output" : "Expand Output"}
                                        >
                                            {isOutputOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden flex flex-col p-6 bg-slate-50/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Input Arguments</label>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">Mapped to Variables</span>
                                    </div>
                                    <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm p-3">
                                        <KeyValueEditor 
                                            items={config.args || []}
                                            onChange={items => updateConfig('args', items)}
                                            readOnlyKeys={true} // Keys come from schema
                                            hideTitle={true}
                                            hideAddButton={true} // Schema defines inputs
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 relative">
                                <Box size={64} className="mb-4 opacity-50" />
                                <p className="text-sm font-medium">
                                    {isLocalConnection ? 'Local server selected (Config Only)' : 'Select a tool to configure inputs'}
                                </p>
                                <div className="absolute top-4 right-4">
                                     <button
                                        onClick={() => setIsOutputOpen(!isOutputOpen)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        {isOutputOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Output */}
                    {isOutputOpen && (
                        <div className="w-[400px] flex flex-col bg-slate-50 border-l border-slate-200">
                            <div className="px-4 py-2 border-b border-slate-200 bg-white flex justify-between items-center h-10 shrink-0">
                                 <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Execution Output</div>
                                 {result && (
                                     <div className="text-[10px] text-slate-400 font-mono">
                                         {new Blob([result]).size} bytes
                                     </div>
                                 )}
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                 {result ? (
                                    <CodeEditor 
                                        language="json"
                                        value={result}
                                        onChange={() => {}}
                                        readOnly={true}
                                    />
                                 ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                        <Terminal size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-xs mt-1">Output will appear here.</p>
                                    </div>
                                 )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <ToolsPanel 
                variablesJson={variablesJson}
                onVariablesChange={onVariablesChange}
                functions={functions}
                onFunctionsChange={onFunctionsChange}
                activeEditorType={EditorType.MCP_CLIENT}
                onInsert={handleInsert}
                onAiAssist={onAiAssist}
                showVariables={showVariables}
                showFunctions={showFunctions}
                showChat={showAi}
            />

            <McpConnectionModal 
                isOpen={isManagerOpen}
                connections={connections}
                onClose={() => setIsManagerOpen(false)}
                onUpdateConnections={onUpdateConnections}
                allowLocal={enableLocalServers}
            />
        </div>
    );
};