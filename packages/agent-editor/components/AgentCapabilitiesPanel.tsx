import React, { useState } from 'react';
import { AgentConfig, UserFunction, MemoryBackend, McpConnection, McpServer } from '../../../lib/types';
import { 
    CloudLightning, Hammer, Server, Plus, X, 
    Box, HardDrive, Cpu, CircleOff, Zap, Database, Terminal, Globe
} from 'lucide-react';
import { McpConnectionModal } from '../../mcp-editor/McpConnectionModal';

interface Props {
    config: AgentConfig;
    onChange: (config: AgentConfig) => void;
    functions: UserFunction[];
}

export const AgentCapabilitiesPanel: React.FC<Props> = ({ config, onChange, functions }) => {
    // MCP Modal Local State
    const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
    const [selectedMcpId, setSelectedMcpId] = useState<string | null>(null);
    
    const update = (key: keyof AgentConfig, value: any) => {
        onChange({ ...config, [key]: value });
    };

    const handleToolToggle = (toolId: string) => {
        const current = new Set(config.connectedTools);
        if (current.has(toolId)) {
            current.delete(toolId);
        } else {
            current.add(toolId);
        }
        update('connectedTools', Array.from(current));
    };

    const handleRemoveMcp = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        update('mcpServers', config.mcpServers.filter(s => s.id !== id));
    };

    const handleEditMcp = (id: string) => {
        setSelectedMcpId(id);
        setIsMcpModalOpen(true);
    };

    const handleAddMcp = () => {
        setSelectedMcpId('new');
        setIsMcpModalOpen(true);
    };

    // --- MCP Server / Connection Mapper ---
    // AgentConfig uses McpServer { id, name, config: string }
    // Modal uses McpConnection { id, name, url, type, stdIoConfig ... }
    
    const serverToConnection = (server: McpServer): McpConnection => {
        let parsedConfig: any = {};
        try {
            parsedConfig = JSON.parse(server.config);
        } catch {}

        // Heuristic: If config has 'command', it's stdio. Else likely sse.
        const isStdio = !!parsedConfig.command;
        
        return {
            id: server.id,
            name: server.name,
            type: isStdio ? 'stdio' : 'sse',
            stdIoConfig: isStdio ? server.config : '{}',
            url: !isStdio ? (parsedConfig.url || '') : '',
            headers: [], // Ideally parsed from config if available, simplified here
            env: [],
            auth: { type: 'none' } // Simplified, assuming config string has everything
        };
    };

    const connectionToServer = (conn: McpConnection): McpServer => {
        let configStr = '{}';
        
        if (conn.type === 'stdio') {
            configStr = conn.stdIoConfig || '{}';
        } else {
            // Reconstruct JSON config from SSE fields
            const configObj: any = {
                url: conn.url,
            };
            
            // Add headers if present
            if (conn.headers && conn.headers.length > 0) {
                configObj.headers = conn.headers.reduce((acc, h) => {
                    if (h.enabled) acc[h.key] = h.value;
                    return acc;
                }, {} as Record<string, string>);
            }
            
            // Add env if present
            if (conn.env && conn.env.length > 0) {
                configObj.env = conn.env.reduce((acc, e) => {
                    if (e.enabled) acc[e.key] = e.value;
                    return acc;
                }, {} as Record<string, string>);
            }

            configStr = JSON.stringify(configObj, null, 2);
        }

        return {
            id: conn.id,
            name: conn.name,
            config: configStr
        };
    };

    // Derived connections list for the modal
    const derivedConnections = config.mcpServers.map(serverToConnection);

    const handleUpdateConnections = (newConnections: McpConnection[]) => {
        const newServers = newConnections.map(connectionToServer);
        update('mcpServers', newServers);
    };

    const memoryOptions: {id: MemoryBackend, label: string, icon: React.ElementType, desc: string}[] = [
        { id: 'NONE', label: 'No Memory', icon: CircleOff, desc: 'Stateless execution' },
        { id: 'IN_MEMORY', label: 'In-Memory', icon: Cpu, desc: 'Ephemeral window' },
        { id: 'REDIS', label: 'Redis', icon: Zap, desc: 'Fast distributed cache' },
        { id: 'POSTGRES', label: 'Postgres', icon: Database, desc: 'Relational vector store' },
        { id: 'MYSQL', label: 'MySQL', icon: Server, desc: 'Standard relational' },
    ];

    return (
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CloudLightning size={20} className="text-amber-500" />
                Capabilities
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Tools Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                            <Hammer size={18} className="text-slate-500" />
                            <span>Tools (Optional)</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">MCP Compatible</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Add MCP Button */}
                        <div 
                            onClick={handleAddMcp}
                            className="p-3 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-all group min-h-[100px]"
                        >
                            <Plus size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-medium">Add MCP Server</span>
                        </div>

                        {/* MCP Servers */}
                        {derivedConnections.map(server => (
                            <div 
                                key={server.id}
                                onClick={() => handleEditMcp(server.id)}
                                className="p-3 rounded-xl border bg-slate-50 border-slate-200 flex flex-col justify-between min-h-[100px] relative group cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all"
                            >
                                <div>
                                    <div className="flex justify-between items-start">
                                        {server.type === 'stdio' ? <Terminal size={18} className="text-indigo-500" /> : <Globe size={18} className="text-teal-500" />}
                                    </div>
                                    <div className="text-xs font-bold text-slate-700 mt-2 truncate" title={server.name}>
                                        {server.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate mt-1">
                                        {server.type === 'stdio' ? 'Local Process' : 'Remote SSE'}
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleRemoveMcp(server.id, e)}
                                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {/* Existing Functions */}
                        {functions.map(fn => {
                            const isSelected = config.connectedTools.includes(fn.id);
                            return (
                                <div 
                                    key={fn.id}
                                    onClick={() => handleToolToggle(fn.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 min-h-[100px] relative overflow-hidden group
                                        ${isSelected 
                                            ? 'bg-teal-50 border-teal-500 shadow-sm ring-1 ring-teal-500/20' 
                                            : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <Box size={18} className={isSelected ? 'text-teal-600' : 'text-slate-400'} />
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                                    </div>
                                    <div>
                                        <div className={`text-xs font-bold ${isSelected ? 'text-teal-800' : 'text-slate-700'}`}>
                                            {fn.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                                            ({fn.params.join(', ')})
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Memory Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
                    <div className="flex items-center gap-2 font-bold text-slate-700 mb-4">
                        <HardDrive size={18} className="text-slate-500" />
                        <span>Memory (Optional)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {memoryOptions.map(opt => {
                            const isSelected = config.memoryBackend === opt.id;
                            return (
                                <div 
                                    key={opt.id}
                                    onClick={() => update('memoryBackend', opt.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 min-h-[80px]
                                        ${isSelected 
                                            ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <opt.icon size={18} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                    </div>
                                    <div>
                                        <div className={`text-xs font-bold ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>
                                            {opt.label}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-4">
                            {['REDIS', 'POSTGRES', 'MYSQL'].includes(config.memoryBackend) && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    {config.memoryBackend === 'REDIS' ? 'Redis URL' : 'Connection String'}
                                </label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                                    placeholder={config.memoryBackend === 'REDIS' ? 'redis://localhost:6379' : 'postgresql://user:pass@localhost:5432/db'}
                                    value={config.memoryOptions?.connectionString || ''}
                                    onChange={e => update('memoryOptions', { ...config.memoryOptions, connectionString: e.target.value })}
                                />
                            </div>
                        )}

                        {config.memoryBackend !== 'NONE' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Key</label>
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                                        value={config.sessionId}
                                        onChange={e => update('sessionId', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Window Size</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                                        value={config.contextWindowLimit}
                                        onChange={e => update('contextWindowLimit', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

             {/* Unified MCP Modal for editing both remote and local */}
             <McpConnectionModal 
                isOpen={isMcpModalOpen}
                connections={derivedConnections}
                onClose={() => setIsMcpModalOpen(false)}
                onUpdateConnections={handleUpdateConnections}
                allowLocal={true} // Agents can always configure local servers
                initialEditingId={selectedMcpId}
            />
        </div>
    );
};