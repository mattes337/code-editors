import React, { useState } from 'react';
import { X, Save, Trash2, Key, Plus, Shield } from 'lucide-react';
import { NamedAuthConfig } from '../../lib/types';

interface AuthManagerModalProps {
  isOpen: boolean;
  credentials: NamedAuthConfig[];
  onClose: () => void;
  onUpdateCredentials: (creds: NamedAuthConfig[]) => void;
}

export const AuthManagerModal: React.FC<AuthManagerModalProps> = ({
  isOpen,
  credentials,
  onClose,
  onUpdateCredentials,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NamedAuthConfig>({
    id: '',
    name: '',
    type: 'none'
  });

  if (!isOpen) return null;

  const handleEdit = (cred: NamedAuthConfig) => {
    setEditingId(cred.id);
    setFormData({ ...cred });
  };

  const handleCreate = () => {
    setEditingId('new');
    setFormData({
      id: Date.now().toString(),
      name: 'New Credential',
      type: 'bearer',
      token: ''
    });
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingId === 'new') {
        onUpdateCredentials([...credentials, formData]);
    } else {
        const updated = credentials.map(c => 
            c.id === editingId ? formData : c
        );
        onUpdateCredentials(updated);
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateCredentials(credentials.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateField = (key: keyof NamedAuthConfig, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex h-[70vh] border border-slate-200 overflow-hidden">
        
        {/* Sidebar List */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Shield size={18} className="text-teal-600" />
                    Credentials
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {credentials.map(cred => (
                    <div 
                        key={cred.id}
                        onClick={() => handleEdit(cred)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative
                            ${editingId === cred.id 
                                ? 'bg-white border-teal-500 shadow-sm ring-1 ring-teal-500/20' 
                                : 'bg-white border-slate-200 hover:border-teal-300'}`}
                    >
                        <div className="font-medium text-slate-700 text-sm mb-1">{cred.name}</div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-1 uppercase">
                            <Key size={10} /> {cred.type}
                        </div>
                        <button 
                            onClick={(e) => handleDelete(cred.id, e)}
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
                    <Plus size={16} /> Add Credential
                </button>
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-white">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                 <h3 className="font-bold text-slate-700">
                    {editingId === 'new' ? 'New Credential' : editingId ? 'Edit Credential' : 'Select a credential'}
                 </h3>
                 <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                 </button>
            </div>

            {editingId ? (
                <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Credential Name</label>
                        <input 
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                            value={formData.name}
                            onChange={e => updateField('name', e.target.value)}
                            placeholder="Production Key"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Type</label>
                        <select 
                            value={formData.type}
                            onChange={(e) => updateField('type', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition-colors"
                        >
                            <option value="none">No Auth</option>
                            <option value="basic">Basic Auth</option>
                            <option value="bearer">Bearer Token</option>
                            <option value="apiKey">API Key</option>
                        </select>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/30">
                        {formData.type === 'basic' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Username</label>
                                    <input 
                                        value={formData.username || ''}
                                        onChange={(e) => updateField('username', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Password</label>
                                    <input 
                                        type="password"
                                        value={formData.password || ''}
                                        onChange={(e) => updateField('password', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {formData.type === 'bearer' && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Token</label>
                                <input 
                                    value={formData.token || ''}
                                    onChange={(e) => updateField('token', e.target.value)}
                                    placeholder="ey..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                        )}

                        {formData.type === 'apiKey' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Key</label>
                                    <input 
                                        value={formData.apiKeyKey || ''}
                                        onChange={(e) => updateField('apiKeyKey', e.target.value)}
                                        placeholder="X-API-Key"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Value</label>
                                    <input 
                                        value={formData.apiKeyValue || ''}
                                        onChange={(e) => updateField('apiKeyValue', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Add To</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                className="accent-teal-600"
                                                checked={formData.apiKeyIn !== 'query'}
                                                onChange={() => updateField('apiKeyIn', 'header')}
                                            /> Header
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                className="accent-teal-600"
                                                checked={formData.apiKeyIn === 'query'}
                                                onChange={() => updateField('apiKeyIn', 'query')}
                                            /> Query Params
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {formData.type === 'none' && (
                            <div className="text-center p-4 text-slate-400 italic text-sm">
                                No authentication fields required.
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-lg shadow-teal-600/20 transition-all w-full justify-center"
                        >
                            <Save size={18} />
                            {editingId === 'new' ? 'Create Credential' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                    <Shield size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Credential Selected</p>
                    <p className="text-sm">Select a credential from the left or create a new one.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};