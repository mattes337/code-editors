import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Server, Plus, Terminal, Link as LinkIcon, Database, Shield, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Search, RefreshCw, Globe } from 'lucide-react';
import { McpConnection, RestParam } from '../../lib/types';
import { KeyValueEditor } from '../shared-ui/KeyValueEditor';

interface McpConnectionModalProps {
  isOpen: boolean;
  connections: McpConnection[];
  onClose: () => void;
  onUpdateConnections: (connections: McpConnection[]) => void;
}

// Generate random string for state/pkce
const generateRandomString = (length: number) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }
    return result;
};

// Helper to fetch with CORS proxy fallback
const fetchWithProxy = async (url: string) => {
    const tryFetch = async (u: string) => {
        const res = await fetch(u);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
    };

    try {
        return await tryFetch(url);
    } catch (directError) {
        console.warn(`Direct fetch to ${url} failed, trying proxy...`, directError);
        try {
            // Using allorigins as a reliable fallback for discovery
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            return await tryFetch(proxyUrl);
        } catch (proxyError: any) {
             throw new Error(`Failed to fetch metadata (Direct & Proxy failed): ${proxyError.message}`);
        }
    }
};

export const McpConnectionModal: React.FC<McpConnectionModalProps> = ({
  isOpen,
  connections = [],
  onClose,
  onUpdateConnections,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<McpConnection>({
    id: '',
    name: '',
    url: '',
    useProxy: false,
    headers: [],
    env: [],
    auth: { type: 'none' }
  });

  const [activeTab, setActiveTab] = useState<'details' | 'headers' | 'env' | 'auth'>('details');
  
  // OAuth State
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Reset form when changing edit target
  useEffect(() => {
      if (editingId) {
          if (editingId === 'new') {
              setFormData({
                  id: Date.now().toString(),
                  name: 'New Server',
                  url: 'http://localhost:3000/sse',
                  useProxy: false,
                  headers: [],
                  env: [],
                  auth: { type: 'none' }
              });
          } else {
              const conn = connections.find(c => c.id === editingId);
              if (conn) setFormData({ ...conn });
          }
          setActiveTab('details');
          setOauthError(null);
          setOauthSuccess(false);
      }
  }, [editingId, connections]);

  if (!isOpen) return null;

  const handleCreate = () => {
    setEditingId('new');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingId === 'new') {
        onUpdateConnections([...connections, formData]);
    } else {
        const updated = connections.map(c => 
            c.id === editingId ? formData : c
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

  const updateField = (key: keyof McpConnection, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateAuth = (config: any) => {
      setFormData(prev => ({
          ...prev,
          auth: {
              ...prev.auth,
              ...config
          }
      }));
  };

  const updateOAuth = (field: string, value: any) => {
      setFormData(prev => ({
          ...prev,
          auth: {
              type: prev.auth?.type || 'none',
              oauth2: {
                  clientId: '',
                  authorizationUrl: '',
                  tokenUrl: '',
                  scope: '',
                  redirectUrl: window.location.origin,
                  ...prev.auth?.oauth2,
                  [field]: value
              }
          }
      }));
  };

  const discoverAuthConfiguration = async () => {
      if (!formData.url) return;
      setDiscoveryLoading(true);
      setOauthError(null);

      try {
          // 1. Try to fetch the URL to check for 401 and headers
          let metadataUrl = '';
          try {
              const res = await fetch(formData.url, { method: 'HEAD' });
              
              // Standard OAuth 2.0 Protected Resource Metadata (RFC 9396)
              // Header: WWW-Authenticate: Bearer ... resource_metadata="URL"
              const authHeader = res.headers.get('www-authenticate');
              if (res.status === 401 && authHeader) {
                  const match = authHeader.match(/resource_metadata="([^"]+)"/);
                  if (match && match[1]) {
                      metadataUrl = match[1];
                  }
              }
          } catch (e) {
              console.warn("Direct fetch failed (CORS?), trying heuristic discovery", e);
          }

          // 2. Heuristic for Supabase or standard well-known locations
          if (!metadataUrl) {
              if (formData.url.includes('supabase.com')) {
                  metadataUrl = 'https://mcp.supabase.com/.well-known/oauth-protected-resource/mcp';
              } else {
                  // Try to guess from base URL
                  try {
                      const u = new URL(formData.url);
                      metadataUrl = `${u.origin}/.well-known/oauth-authorization-server`;
                  } catch {}
              }
          }

          if (!metadataUrl) {
              throw new Error("Could not detect OAuth metadata URL from 401 header or known providers.");
          }

          // 3. Fetch Metadata (Handle CORS via Proxy)
          let meta = await fetchWithProxy(metadataUrl);
          
          // 3b. Follow RFC 9396 Indirection (if metadata points to an Auth Server)
          if (!meta.authorization_endpoint && meta.authorization_servers && meta.authorization_servers.length > 0) {
              const asBase = meta.authorization_servers[0];
              // Try standard locations for AS metadata
              const asMetaUrl = `${asBase.replace(/\/$/, '')}/.well-known/oauth-authorization-server`;
              try {
                  const asMeta = await fetchWithProxy(asMetaUrl);
                  // Merge AS metadata (endpoints) with Resource metadata (scopes)
                  meta = { ...meta, ...asMeta };
              } catch (e) {
                  console.warn("Failed to fetch AS metadata, falling back to openid-configuration");
                  const oidcUrl = `${asBase.replace(/\/$/, '')}/.well-known/openid-configuration`;
                  const oidcMeta = await fetchWithProxy(oidcUrl);
                  meta = { ...meta, ...oidcMeta };
              }
          }

          if (!meta.authorization_endpoint) {
              throw new Error("Metadata found, but no 'authorization_endpoint' defined.");
          }
          
          // 4. Update Form
          setFormData(prev => ({
              ...prev,
              auth: {
                  ...prev.auth,
                  type: 'oauth2',
                  oauth2: {
                      clientId: prev.auth?.oauth2?.clientId || meta.client_id || '', 
                      clientSecret: '',
                      authorizationUrl: meta.authorization_endpoint,
                      tokenUrl: meta.token_endpoint,
                      scope: meta.scopes_supported ? meta.scopes_supported.join(' ') : (prev.auth?.oauth2?.scope || ''),
                      redirectUrl: window.location.origin
                  }
              }
          }));
          
          setActiveTab('auth');
          setOauthSuccess(true); // Re-purpose as "Discovery Success" indicator temporarily
          setTimeout(() => setOauthSuccess(false), 3000);

      } catch (e: any) {
          setOauthError(`Discovery failed: ${e.message}`);
      } finally {
          setDiscoveryLoading(false);
      }
  };

  const handleGetToken = async () => {
      if (!formData.auth?.oauth2) return;
      
      const { authorizationUrl, clientId, redirectUrl, scope } = formData.auth.oauth2;
      
      if (!authorizationUrl || !clientId) {
          setOauthError("Authorization URL and Client ID are required.");
          return;
      }

      setOauthLoading(true);
      setOauthError(null);
      setOauthSuccess(false);

      const state = generateRandomString(16);
      
      const isImplicit = !formData.auth.oauth2.clientSecret;
      const responseType = isImplicit ? 'token' : 'code';

      const params = new URLSearchParams({
          response_type: responseType,
          client_id: clientId,
          redirect_uri: redirectUrl || window.location.origin,
          scope: scope || '',
          state: state
      });

      const fullAuthUrl = `${authorizationUrl}?${params.toString()}`;
      
      // Open Popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
          fullAuthUrl, 
          'OAuth', 
          `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
          setOauthError("Popup blocked. Please allow popups for this site.");
          setOauthLoading(false);
          return;
      }

      // Handler for message from popup
      const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === 'OAUTH_CALLBACK') {
              
              if (event.data.error) {
                  window.removeEventListener('message', messageHandler);
                  setOauthError(`OAuth Error: ${event.data.errorDescription || event.data.error}`);
                  setOauthLoading(false);
                  return;
              }

              if (event.data.state !== state) {
                  window.removeEventListener('message', messageHandler);
                  setOauthError("State mismatch. Possible CSRF attack.");
                  setOauthLoading(false);
                  return;
              }

              // Handle Implicit Flow (Access Token directly returned)
              if (event.data.accessToken) {
                  window.removeEventListener('message', messageHandler);
                  applyAccessToken(event.data.accessToken);
                  return;
              }

              // Handle Code Flow
              const code = event.data.code;
              if (code) {
                  window.removeEventListener('message', messageHandler);
                  await exchangeCodeForToken(code);
              } else {
                  window.removeEventListener('message', messageHandler);
                  setOauthError("No code or token received.");
                  setOauthLoading(false);
              }
          }
      };

      window.addEventListener('message', messageHandler);

      // Cleanup if popup closed manually
      const checkPopup = setInterval(() => {
          if (popup.closed) {
              clearInterval(checkPopup);
              window.removeEventListener('message', messageHandler);
              if (!oauthSuccess && oauthLoading) {
                 setTimeout(() => {
                     setOauthLoading(prev => {
                         if (prev) setOauthError("Authentication window closed.");
                         return false;
                     });
                 }, 500);
              }
          }
      }, 1000);
  };

  const applyAccessToken = (token: string) => {
      // Switch to Bearer type and set token
      setFormData(prev => ({
          ...prev,
          auth: {
              ...prev.auth,
              type: 'bearer',
              bearer: { token }
          }
      }));
      setOauthSuccess(true);
      setOauthLoading(false);
  };

  const exchangeCodeForToken = async (code: string) => {
      if (!formData.auth?.oauth2) return;
      const { tokenUrl, clientId, clientSecret, redirectUrl } = formData.auth.oauth2;

      try {
          const bodyParams = new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirectUrl || window.location.origin,
              client_id: clientId,
          });

          if (clientSecret) {
              bodyParams.append('client_secret', clientSecret);
          }

          const response = await fetch(tokenUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Accept': 'application/json'
              },
              body: bodyParams
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.error_description || data.error || 'Failed to exchange token');
          }

          const accessToken = data.access_token;
          if (accessToken) {
              applyAccessToken(accessToken);
          } else {
              throw new Error("No access_token in response");
          }

      } catch (e: any) {
          setOauthError(e.message);
          setOauthLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex h-[70vh] border border-slate-200 overflow-hidden">
        
        {/* Sidebar List */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-white">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Server size={18} className="text-teal-600" />
                    MCP Servers
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {connections.map(conn => (
                    <div 
                        key={conn.id}
                        onClick={() => handleEdit(conn.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative
                            ${editingId === conn.id 
                                ? 'bg-white border-teal-500 shadow-sm ring-1 ring-teal-500/20' 
                                : 'bg-white border-slate-200 hover:border-teal-300'}`}
                    >
                        <div className="font-medium text-slate-700 text-sm mb-1">{conn.name}</div>
                        <div className="text-xs text-slate-400 font-mono truncate">
                            {conn.url}
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
                    <Plus size={16} /> Add Server
                </button>
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-white">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                 <h3 className="font-bold text-slate-700">
                    {editingId === 'new' ? 'New Server Config' : editingId ? 'Edit Server Config' : 'Select a server'}
                 </h3>
                 <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                 </button>
            </div>

            {editingId ? (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Tab Bar */}
                    <div className="flex border-b border-slate-100 px-6 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'details' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('auth')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'auth' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Authentication
                            {formData.auth?.type !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('headers')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'headers' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Headers ({formData.headers.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('env')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'env' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Environment ({formData.env.length})
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'details' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Server Name</label>
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                                        value={formData.name}
                                        onChange={e => updateField('name', e.target.value)}
                                        placeholder="My Local Server"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Server URL (SSE)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800"
                                            value={formData.url}
                                            onChange={e => updateField('url', e.target.value)}
                                            placeholder="http://localhost:3000/sse"
                                        />
                                        <button 
                                            onClick={discoverAuthConfiguration}
                                            disabled={discoveryLoading || !formData.url}
                                            className="px-3 bg-white border border-slate-300 text-slate-600 hover:text-teal-600 hover:border-teal-400 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                                            title="Auto-detect Auth Config from URL (Uses CORS Proxy)"
                                        >
                                            {discoveryLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                            Detect Auth
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Must support Server-Sent Events (SSE). Use 'Detect Auth' to find OAuth settings.</p>
                                </div>
                                <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <input 
                                        type="checkbox" 
                                        id="useProxy"
                                        checked={formData.useProxy || false}
                                        onChange={e => updateField('useProxy', e.target.checked)}
                                        className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                    />
                                    <div>
                                        <label htmlFor="useProxy" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2">
                                            <Globe size={14} className="text-teal-600" />
                                            Use CORS Proxy
                                        </label>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Routes requests through a public CORS proxy (corsproxy.io) to bypass browser restrictions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'auth' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                                        value={formData.auth?.type || 'none'}
                                        onChange={e => {
                                            const newType = e.target.value as any;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                auth: { 
                                                    ...prev.auth, 
                                                    type: newType,
                                                    // Preserve existing data objects so we don't lose config when switching temporarily
                                                    basic: prev.auth?.basic || { username: '', password: '' },
                                                    bearer: prev.auth?.bearer || { token: '' },
                                                    oauth2: prev.auth?.oauth2 || { clientId: '', authorizationUrl: '', tokenUrl: '', scope: '', redirectUrl: window.location.origin }
                                                } 
                                            }));
                                        }}
                                    >
                                        <option value="none">None (or Custom Headers)</option>
                                        <option value="basic">Basic Auth</option>
                                        <option value="bearer">Bearer Token</option>
                                        <option value="oauth2">OAuth 2.0</option>
                                    </select>
                                </div>

                                {formData.auth?.type === 'basic' && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Username</label>
                                            <input 
                                                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
                                                value={formData.auth.basic?.username || ''}
                                                onChange={e => updateAuth({ basic: { ...formData.auth?.basic, username: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Password</label>
                                            <input 
                                                type="password"
                                                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
                                                value={formData.auth.basic?.password || ''}
                                                onChange={e => updateAuth({ basic: { ...formData.auth?.basic, password: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.auth?.type === 'bearer' && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Token</label>
                                            <input 
                                                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                                                value={formData.auth.bearer?.token || ''}
                                                onChange={e => updateAuth({ bearer: { ...formData.auth?.bearer, token: e.target.value } })}
                                                placeholder="ey..."
                                            />
                                        </div>
                                        {oauthSuccess && (
                                            <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                                                <CheckCircle2 size={12} /> Token acquired via OAuth
                                            </p>
                                        )}
                                    </div>
                                )}

                                {formData.auth?.type === 'oauth2' && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Authorization URL</label>
                                                <input 
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                                                    value={formData.auth.oauth2?.authorizationUrl || ''}
                                                    onChange={e => updateOAuth('authorizationUrl', e.target.value)}
                                                    placeholder="https://api.example.com/oauth/authorize"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Token URL</label>
                                                <input 
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                                                    value={formData.auth.oauth2?.tokenUrl || ''}
                                                    onChange={e => updateOAuth('tokenUrl', e.target.value)}
                                                    placeholder="https://api.example.com/oauth/token"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Client ID</label>
                                                <input 
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                                                    value={formData.auth.oauth2?.clientId || ''}
                                                    onChange={e => updateOAuth('clientId', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Client Secret (Optional)</label>
                                                <input 
                                                    type="password"
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                                                    value={formData.auth.oauth2?.clientSecret || ''}
                                                    onChange={e => updateOAuth('clientSecret', e.target.value)}
                                                    placeholder="Leave empty for Implicit Flow"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Scope</label>
                                                <input 
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                                                    value={formData.auth.oauth2?.scope || ''}
                                                    onChange={e => updateOAuth('scope', e.target.value)}
                                                    placeholder="read write"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Callback URL (Auto-set)</label>
                                                <div className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded px-2 py-1.5 text-xs font-mono flex items-center justify-between">
                                                    <span>{window.location.origin}</span>
                                                    <span className="text-[10px] uppercase bg-slate-200 px-1 rounded">Read Only</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Ensure this origin is whitelisted in your OAuth Provider settings.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                            <div className="flex-1">
                                                {oauthSuccess && (
                                                    <div className="text-green-600 text-xs font-bold flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> Configured / Token Acquired
                                                    </div>
                                                )}
                                                {oauthError && (
                                                    <div className="text-red-600 text-xs flex items-center gap-1">
                                                        <AlertTriangle size={12} /> {oauthError}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleGetToken}
                                                disabled={oauthLoading}
                                                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                                            >
                                                {oauthLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                                                Login with Provider
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'headers' && (
                            <div className="h-full flex flex-col animate-in fade-in slide-in-from-left-2">
                                <div className="mb-2 text-xs text-slate-500">
                                    HTTP Headers sent with connection requests (e.g. Authentication).
                                </div>
                                <div className="flex-1 border border-slate-200 rounded-lg bg-slate-50/50 p-2">
                                    <KeyValueEditor 
                                        items={formData.headers}
                                        onChange={items => updateField('headers', items)}
                                        hideTitle={true}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'env' && (
                            <div className="h-full flex flex-col animate-in fade-in slide-in-from-left-2">
                                <div className="mb-2 text-xs text-slate-500">
                                    Environment variables required by the MCP server.
                                </div>
                                <div className="flex-1 border border-slate-200 rounded-lg bg-slate-50/50 p-2">
                                    <KeyValueEditor 
                                        items={formData.env}
                                        onChange={items => updateField('env', items)}
                                        hideTitle={true}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 flex justify-end">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-lg shadow-teal-600/20 transition-all"
                        >
                            <Save size={18} />
                            {editingId === 'new' ? 'Create Server' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                    <Database size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Server Selected</p>
                    <p className="text-sm">Select a server configuration from the left or create a new one.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};