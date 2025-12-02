import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Database, Plus, Server, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { DbConnection, SqlDialect } from '../../lib/types';

interface ConnectionManagerModalProps {
  isOpen: boolean;
  connections: DbConnection[];
  onClose: () => void;
  onUpdateConnections: (connections: DbConnection[]) => void;
}

export const ConnectionManagerModal: React.FC<ConnectionManagerModalProps> = ({
  isOpen,
  connections,
  onClose,
  onUpdateConnections,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dialect, setDialect] = useState<SqlDialect>('postgres');
  const [connectionString, setConnectionString] = useState('');
  
  // Test Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Reset test state when editing a different connection
  useEffect(() => {
    setTestResult(null);
    setIsTesting(false);
  }, [editingId]);

  // Reset test state when inputs change
  useEffect(() => {
    if (testResult) setTestResult(null);
  }, [name, dialect, connectionString]);

  if (!isOpen) return null;

  const handleEdit = (conn: DbConnection) => {
    setEditingId(conn.id);
    setName(conn.name);
    setDialect(conn.dialect);
    setConnectionString(conn.connectionString);
  };

  const handleCreate = () => {
    setEditingId('new');
    setName('New Connection');
    setDialect('postgres');
    setConnectionString('');
  };

  const handleSave = () => {
    if (!name) return;

    if (editingId === 'new') {
        const newConn: DbConnection = {
            id: Date.now().toString(),
            name,
            dialect,
            connectionString
        };
        onUpdateConnections([...connections, newConn]);
    } else {
        const updated = connections.map(c => 
            c.id === editingId 
            ? { ...c, name, dialect, connectionString }
            : c
        );
        onUpdateConnections(updated);
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateConnections(connections.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Simulation
    setTimeout(() => {
        setIsTesting(false);
        // Fail if empty, otherwise succeed for simulation
        if (connectionString && connectionString.trim().length > 0) {
            setTestResult('success');
        } else {
            setTestResult('error');
        }
    }, 1200);
  };

  const getDisplayName = (d: SqlDialect) => {
      switch(d) {
          case 'mssql': return 'MS SQL';
          case 'postgres-vector': return 'PG Vector';
          case 'duckdb': return 'DuckDB';
          case 'seekdb': return 'SeekDB';
          default: return d;
      }
  };

  const getPlaceholder = (d: SqlDialect) => {
      switch(d) {
          case 'postgres': return 'postgresql://user:pass@host:5432/db';
          case 'postgres-vector': return 'postgresql://user:pass@host:5432/db?sslmode=require';
          case 'mysql': return 'mysql://user:pass@host:3306/db';
          case 'duckdb': return 'duckdb://:memory: or path/to/file.db';
          case 'seekdb': return 'seekdb://api_key@host/instance';
          case 'mssql': return 'sqlserver://host:1433;database=db;user=u;password=p';
          default: return 'Connection URI';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex h-[70vh] border border-slate-200 overflow-hidden">
        
        {/* Sidebar List */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Database size={18} className="text-teal-600" />
                    Connections
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {connections.map(conn => (
                    <div 
                        key={conn.id}
                        onClick={() => handleEdit(conn)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative
                            ${editingId === conn.id 
                                ? 'bg-white border-teal-500 shadow-sm ring-1 ring-teal-500/20' 
                                : 'bg-white border-slate-200 hover:border-teal-300'}`}
                    >
                        <div className="font-medium text-slate-700 text-sm mb-1">{conn.name}</div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Server size={10} /> {getDisplayName(conn.dialect)}
                        </div>
                        <button 
                            onClick={(e) => handleDelete(conn.id, e)}
                            className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                
                <button 
                    onClick={handleCreate}
                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Add Connection
                </button>
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-white">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                 <h3 className="font-bold text-slate-700">
                    {editingId === 'new' ? 'New Connection' : editingId ? 'Edit Connection' : 'Select a connection'}
                 </h3>
                 <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                 </button>
            </div>

            {editingId ? (
                <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Connection Name</label>
                        <input 
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Production DB"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Dialect</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['postgres', 'mysql', 'mssql', 'postgres-vector', 'duckdb', 'seekdb'] as SqlDialect[]).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDialect(d)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex flex-col items-center gap-1
                                        ${dialect === d 
                                            ? 'bg-teal-50 border-teal-500 text-teal-700' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-teal-200'}`}
                                >
                                    <span className={['postgres', 'mysql'].includes(d) ? 'capitalize' : ''}>{getDisplayName(d)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Connection String</label>
                        <div className="flex gap-2">
                             <div className="flex-1">
                                <input 
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                                    value={connectionString}
                                    onChange={e => setConnectionString(e.target.value)}
                                    placeholder={getPlaceholder(dialect)}
                                />
                             </div>
                             <button
                                onClick={handleTestConnection}
                                disabled={isTesting || !connectionString}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all min-w-[80px] justify-center
                                    ${testResult === 'success' 
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : testResult === 'error'
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }
                                    ${(isTesting || !connectionString) ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                title="Test Connection"
                             >
                                {isTesting ? (
                                    <Activity size={16} className="animate-pulse" />
                                ) : testResult === 'success' ? (
                                    <CheckCircle2 size={16} />
                                ) : testResult === 'error' ? (
                                    <AlertCircle size={16} />
                                ) : (
                                    <Activity size={16} />
                                )}
                                {isTesting ? '...' : 'Test'}
                             </button>
                        </div>
                        
                        {testResult === 'success' && (
                             <p className="text-xs text-green-600 mt-1 flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                <CheckCircle2 size={12} /> Connection successful
                             </p>
                        )}
                        {testResult === 'error' && (
                             <p className="text-xs text-red-600 mt-1 flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                <AlertCircle size={12} /> Connection failed (empty string)
                             </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">This is a simulation. No real connection is made.</p>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-lg shadow-teal-600/20 transition-all w-full justify-center"
                        >
                            <Save size={18} />
                            {editingId === 'new' ? 'Create Connection' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                    <Database size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Connection Selected</p>
                    <p className="text-sm">Select a connection from the left or create a new one.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};