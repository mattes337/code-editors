import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Plus, Clock, Download, 
  ChevronRight, ChevronDown, MoreVertical, 
  Settings, Wifi, Shield, Database, 
  FileCode, Send, RefreshCw, X, Search, Globe, Box,
  PanelLeftClose, PanelLeftOpen, Loader2, Trash2, Key
} from 'lucide-react';
import { RestRequest, RestResponse, RestMethod, ApiSource, UserFunction, EditorType, NamedAuthConfig, RestParam } from '../../lib/types';
import { CodeEditor, CodeEditorRef } from '../shared-ui/CodeEditor';
import { KeyValueEditor } from '../shared-ui/KeyValueEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { interpolateString, insertIntoNativeInput } from '../../lib/utils';
import { AuthManagerModal } from './AuthManagerModal';

interface RestEditorProps {
  variablesJson: string;
  onVariablesChange: (json: string) => void;
  functions: UserFunction[];
  onFunctionsChange: (funcs: UserFunction[]) => void;
  authCredentials: NamedAuthConfig[];
  onAuthCredentialsChange: (creds: NamedAuthConfig[]) => void;
  apiSources: ApiSource[];
  onApiSourcesChange: (sources: ApiSource[]) => void;
  onAiAssist?: (prompt: string) => Promise<string>;
}

const DEFAULT_REQUEST: RestRequest = {
  id: 'req_default',
  name: 'New Custom Request',
  meta: { origin: 'custom' },
  method: 'GET',
  url: 'https://httpbin.org/get',
  pathParams: [],
  params: [],
  headers: [
    { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
    { id: 'h2', key: 'Accept', value: 'application/json', enabled: true }
  ],
  auth: { type: 'none' },
  bodyType: 'json',
  body: '{\n  "key": "value"\n}'
};

// --- Schema Parsing Helpers ---

const resolveRef = (ref: string, root: any): any => {
    if (!ref || typeof ref !== 'string') return null;
    const path = ref.replace(/^#\//, '').split('/');
    let current = root;
    for (const segment of path) {
        if (!current) return null;
        current = current[segment];
    }
    return current;
};

const generateMockData = (schema: any, rootSpec: any, depth = 0): any => {
    if (depth > 5) return null;
    if (!schema) return null;

    if (schema.$ref) {
        const resolved = resolveRef(schema.$ref, rootSpec);
        return generateMockData(resolved, rootSpec, depth + 1);
    }

    if (schema.allOf) {
        let obj = {};
        for (const sub of schema.allOf) {
            const subObj = generateMockData(sub, rootSpec, depth);
            if (typeof subObj === 'object') {
                obj = { ...obj, ...subObj };
            }
        }
        return obj;
    }

    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;

    if (schema.type === 'object' || schema.properties) {
        const obj: any = {};
        if (schema.properties) {
            for (const key in schema.properties) {
                obj[key] = generateMockData(schema.properties[key], rootSpec, depth + 1);
            }
        }
        return obj;
    }

    if (schema.type === 'array') {
        if (schema.items) {
            return [generateMockData(schema.items, rootSpec, depth + 1)];
        }
        return [];
    }

    if (schema.type === 'string') {
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.enum && schema.enum.length > 0) return schema.enum[0];
        return "string";
    }

    if (schema.type === 'integer') return 0;
    if (schema.type === 'number') return 0.0;
    if (schema.type === 'boolean') return true;

    return null;
};

// --- Helper Functions ---
const normalizeUrl = (url: string) => {
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
    }
    return url;
};

const updateSourceFromSpec = (source: ApiSource, spec: any): ApiSource => {
    let newBaseUrl = source.baseUrl;
    let origin = '';
    try {
        if (source.specUrl) {
            origin = new URL(source.specUrl).origin;
        }
    } catch {}
    
    if (spec.swagger === '2.0') {
        const protocol = (spec.schemes && spec.schemes.includes('https')) ? 'https' : 'http';
        const basePath = spec.basePath || '';
        if (spec.host) {
            newBaseUrl = `${protocol}://${spec.host}${basePath}`;
        } else {
             if (!newBaseUrl && origin) {
                 newBaseUrl = `${origin}${basePath}`;
             }
             else if (newBaseUrl && basePath && !newBaseUrl.endsWith(basePath)) {
                 newBaseUrl = `${newBaseUrl.replace(/\/$/, '')}${basePath}`;
             }
        }
    } 
    else if (spec.servers && spec.servers.length > 0) {
        const server = spec.servers[0];
        let serverUrl = server.url;
        if (serverUrl.startsWith('/')) {
             if (newBaseUrl) {
                 serverUrl = `${newBaseUrl.replace(/\/$/, '')}${serverUrl}`;
             } else if (origin) {
                 serverUrl = `${origin}${serverUrl}`;
             }
             newBaseUrl = serverUrl;
        } else {
             newBaseUrl = serverUrl;
        }
    } else {
        if (!newBaseUrl && origin) {
            newBaseUrl = origin;
        }
    }
    
    if (newBaseUrl) {
        newBaseUrl = newBaseUrl.replace(/\/$/, '');
    }
    
    return { ...source, baseUrl: newBaseUrl, spec };
};

const fetchSpecContent = async (url: string): Promise<any> => {
    const tryFetch = async (u: string) => {
        const res = await fetch(u);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.text();
    };

    let text;
    try {
        text = await tryFetch(url);
    } catch {
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            text = await tryFetch(proxyUrl);
        } catch {
            const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            text = await tryFetch(proxyUrl2);
        }
    }

    if (!text) throw new Error("All fetch methods failed");
    return JSON.parse(text);
};

const parseOpenApiPaths = (spec: any): any[] => {
    if (!spec || !spec.paths) return [];
    const endpoints: any[] = [];
    
    Object.keys(spec.paths).forEach(path => {
        const pathItem = spec.paths[path];
        // parameters defined at path level apply to all operations under this path
        const pathParameters = pathItem.parameters || [];
        
        Object.keys(pathItem).forEach(method => {
            if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
                const op = pathItem[method];
                endpoints.push({
                    method: method.toUpperCase(),
                    path: path,
                    summary: op.summary || op.description || `${method.toUpperCase()} ${path}`,
                    operationId: op.operationId,
                    spec: op,
                    pathParameters: pathParameters
                });
            }
        });
    });
    
    return endpoints;
};

export const RestEditor: React.FC<RestEditorProps> = ({
  variablesJson = '{}',
  onVariablesChange,
  functions = [],
  onFunctionsChange,
  authCredentials = [],
  onAuthCredentialsChange,
  apiSources = [],
  onApiSourcesChange,
  onAiAssist
}) => {
  // --- Registry State ---
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceData, setNewSourceData] = useState({ name: '', baseUrl: '', specUrl: '' });
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const fetchedSources = useRef<Set<string>>(new Set());

  // Internal Variable Parsing
  const variablesObj = useMemo(() => {
    try {
        return JSON.parse(variablesJson);
    } catch {
        return {};
    }
  }, [variablesJson]);

  // --- Request State ---
  const [requests, setRequests] = useState<RestRequest[]>([DEFAULT_REQUEST]);
  const [activeRequestId, setActiveRequestId] = useState<string>(DEFAULT_REQUEST.id);
  const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'headers' | 'body'>('params');
  const [response, setResponse] = useState<RestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- UI State ---
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFetchingSpec, setIsFetchingSpec] = useState(false);

  const bodyEditorRef = useRef<CodeEditorRef>(null);

  const activeRequest = requests.find(r => r.id === activeRequestId) || requests[0];

  // --- URL to Path Params Sync ---
  useEffect(() => {
    if (!activeRequest) return;
    
    const matches = activeRequest.url.match(/\{([^}]+)\}/g);
    const keysInUrl = matches ? matches.map(m => m.slice(1, -1)) : [];

    const currentParams = activeRequest.pathParams;
    const currentKeys = currentParams.map(p => p.key);

    const hasNewKeys = keysInUrl.some(k => !currentKeys.includes(k));
    const hasRemovedKeys = currentKeys.some(k => !keysInUrl.includes(k));

    if (hasNewKeys || hasRemovedKeys) {
        const newPathParams = keysInUrl.map(k => {
            const existing = currentParams.find(p => p.key === k);
            return existing || { 
                id: `pp_${Date.now()}_${Math.random()}`, 
                key: k, 
                value: '', 
                enabled: true 
            };
        });
        
        setRequests(prev => prev.map(r => r.id === activeRequestId ? { ...r, pathParams: newPathParams } : r));
    }

  }, [activeRequest?.url, activeRequestId]);

  // --- Initial Fetch ---
  useEffect(() => {
      let isMounted = true;
      const updateSpecs = async () => {
          let hasUpdates = false;
          const promises = apiSources.map(async (s) => {
              if (s.specUrl && !s.spec && !fetchedSources.current.has(s.id)) {
                  try {
                      const spec = await fetchSpecContent(s.specUrl);
                      if (spec) {
                          fetchedSources.current.add(s.id);
                          hasUpdates = true;
                          return updateSourceFromSpec(s, spec);
                      }
                  } catch (e) {
                      console.warn(`Failed to auto-fetch spec for ${s.name}`, e);
                  }
              }
              return s;
          });

          const updatedList = await Promise.all(promises);
          if (isMounted && hasUpdates) {
              onApiSourcesChange(updatedList);
          }
      };
      updateSpecs();
      return () => { isMounted = false; };
  }, [apiSources, onApiSourcesChange]);

  // --- Handlers ---
  const toggleSource = (id: string) => {
      setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSource = async () => {
      if (!newSourceData.specUrl && (!newSourceData.name || !newSourceData.baseUrl)) return;
      
      setIsFetchingSpec(true);
      let spec = null;
      let finalSpecUrl = newSourceData.specUrl ? normalizeUrl(newSourceData.specUrl) : '';
      let finalBaseUrl = newSourceData.baseUrl ? normalizeUrl(newSourceData.baseUrl) : '';
      let finalName = newSourceData.name;

      if (finalSpecUrl) {
          try {
              spec = await fetchSpecContent(finalSpecUrl);
          } catch (e) {
              console.error("Spec fetch failed during add", e);
          }
      }

      if (spec) {
          if (!finalName && spec.info && spec.info.title) finalName = spec.info.title;
          
          if (!finalBaseUrl) {
                if (spec.swagger === '2.0') {
                    const protocol = (spec.schemes && spec.schemes.includes('https')) ? 'https' : 'http';
                    const host = spec.host;
                    const basePath = spec.basePath || '';
                    if (host) {
                        finalBaseUrl = `${protocol}://${spec.host}${basePath}`;
                    } else if (finalSpecUrl) {
                         try {
                             const origin = new URL(finalSpecUrl).origin;
                             finalBaseUrl = `${origin}${basePath}`;
                         } catch {}
                    }
                } 
                else if (spec.servers && spec.servers.length > 0) {
                    finalBaseUrl = spec.servers[0].url;
                    if (finalBaseUrl.startsWith('/') && finalSpecUrl) {
                        try {
                             const origin = new URL(finalSpecUrl).origin;
                             finalBaseUrl = `${origin}${finalBaseUrl}`;
                        } catch (e) {}
                    }
                } 
                else if (finalSpecUrl) {
                    try {
                        finalBaseUrl = new URL(finalSpecUrl).origin;
                    } catch {}
                }
          }
      }

      if (!finalName) {
           finalName = 'New API Source';
           if (finalSpecUrl) {
               try { finalName = new URL(finalSpecUrl).hostname; } catch {}
           }
      }

      if (finalBaseUrl) {
          finalBaseUrl = finalBaseUrl.replace(/\/$/, '');
      }

      let newSource: ApiSource = {
          id: `src_${Date.now()}`,
          name: finalName,
          baseUrl: finalBaseUrl,
          specUrl: finalSpecUrl,
          spec,
          lastFetched: Date.now()
      };

      if (spec) {
          newSource = updateSourceFromSpec(newSource, spec);
          fetchedSources.current.add(newSource.id);
      }

      onApiSourcesChange([...apiSources, newSource]);
      setExpandedSources(prev => ({ ...prev, [newSource.id]: true }));
      setIsAddingSource(false);
      setNewSourceData({ name: '', baseUrl: '', specUrl: '' });
      setIsFetchingSpec(false);
  };

  const loadEndpoint = (source: ApiSource, endpoint: any) => {
      const fullSpec = source.spec;
      const path = endpoint.path;
      
      const newReq: RestRequest = {
          id: `req_${Date.now()}`,
          name: endpoint.summary || `${endpoint.method} ${path}`,
          meta: { origin: 'swagger', sourceId: source.id, operationId: endpoint.operationId },
          method: endpoint.method,
          url: `${source.baseUrl}${path}`,
          pathParams: [],
          params: [], 
          headers: [],
          auth: { type: 'none' },
          bodyType: endpoint.method === 'GET' ? 'none' : 'json',
          body: ''
      };

      const rawOperationParams = endpoint.spec.parameters || [];
      const rawPathParams = endpoint.pathParameters || [];
      const paramMap = new Map<string, any>();

      const addParamToMap = (p: any) => {
          const resolved = p.$ref ? (resolveRef(p.$ref, fullSpec) || p) : p;
          if (resolved && resolved.name && resolved.in) {
              paramMap.set(`${resolved.in}:${resolved.name}`, resolved);
          }
      };

      rawPathParams.forEach(addParamToMap);
      rawOperationParams.forEach(addParamToMap);

      paramMap.forEach((p) => {
          const schema = p.schema || p; 
          const type = schema.type || 'string';
          const format = schema.format;
          
          const descParts = [];
          if (type) descParts.push(type);
          if (format) descParts.push(`(${format})`);
          if (p.description) descParts.push(p.description);
          const desc = descParts.join(' - ');

          let value = '';
          if (schema.default !== undefined) value = String(schema.default);
          else if (p.default !== undefined) value = String(p.default);
          else if (schema.example !== undefined) value = String(schema.example);
          else if (p.example !== undefined) value = String(p.example);
          
          const uniqueId = `${p.in}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          if (p.in === 'query') {
              newReq.params.push({ 
                  id: uniqueId, 
                  key: p.name, 
                  value: value, 
                  enabled: !!p.required, 
                  description: desc
              });
          } else if (p.in === 'header') {
              newReq.headers.push({ 
                  id: uniqueId, 
                  key: p.name,
                  value: value,
                  enabled: !!p.required,
                  description: desc
              });
          }
      });
      
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
          const requestBody = endpoint.spec.requestBody;
          if (requestBody) {
             const content = requestBody.content;
             if (content && content['application/json']) {
                 const schema = content['application/json'].schema;
                 if (schema) {
                     const mock = generateMockData(schema, fullSpec);
                     newReq.body = JSON.stringify(mock, null, 2);
                 }
             }
          }
      }

      setRequests(prev => [...prev, newReq]);
      setActiveRequestId(newReq.id);
      setActiveTab(endpoint.method === 'GET' ? 'params' : 'body');
  };

  const updateRequest = (field: keyof RestRequest, value: any) => {
    setRequests(prev => prev.map(r => 
      r.id === activeRequestId ? { ...r, [field]: value } : r
    ));
  };

  const handleRun = async () => {
    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();

    try {
        // Interpolate URL and Body
        const interpolatedUrl = interpolateString(activeRequest.url, variablesObj, functions);
        const interpolatedBody = activeRequest.body ? interpolateString(activeRequest.body, variablesObj, functions) : undefined;
        
        // Build URL with Query Params
        const urlObj = new URL(interpolatedUrl);
        activeRequest.params.forEach(p => {
            if (p.enabled && p.key) {
                const val = interpolateString(p.value, variablesObj, functions);
                urlObj.searchParams.append(p.key, val);
            }
        });
        
        // Fill Path Params
        let finalUrl = urlObj.toString();
        activeRequest.pathParams.forEach(p => {
             if (p.enabled && p.key) {
                 const val = interpolateString(p.value, variablesObj, functions);
                 finalUrl = finalUrl.replace(`{${p.key}}`, val);
             }
        });

        // Headers
        const headers: Record<string, string> = {};
        activeRequest.headers.forEach(h => {
            if (h.enabled && h.key) {
                headers[h.key] = interpolateString(h.value, variablesObj, functions);
            }
        });

        // Auth
        if (activeRequest.auth.type === 'basic') {
            const user = interpolateString(activeRequest.auth.username || '', variablesObj, functions);
            const pass = interpolateString(activeRequest.auth.password || '', variablesObj, functions);
            const b64 = btoa(`${user}:${pass}`);
            headers['Authorization'] = `Basic ${b64}`;
        } else if (activeRequest.auth.type === 'bearer') {
            const token = interpolateString(activeRequest.auth.token || '', variablesObj, functions);
            headers['Authorization'] = `Bearer ${token}`;
        } else if (activeRequest.auth.type === 'apiKey') {
            const key = activeRequest.auth.apiKeyKey || '';
            const val = interpolateString(activeRequest.auth.apiKeyValue || '', variablesObj, functions);
            if (activeRequest.auth.apiKeyIn === 'header') {
                headers[key] = val;
            } else {
                if (finalUrl.includes('?')) finalUrl += `&${key}=${val}`;
                else finalUrl += `?${key}=${val}`;
            }
        }

        const res = await fetch(finalUrl, {
            method: activeRequest.method,
            headers: headers,
            body: (activeRequest.method !== 'GET' && activeRequest.method !== 'HEAD') ? interpolatedBody : undefined
        });

        const text = await res.text();
        const time = Date.now() - startTime;
        
        const resHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => resHeaders[k] = v);

        setResponse({
            status: res.status,
            statusText: res.statusText,
            time: time,
            size: new Blob([text]).size,
            headers: resHeaders,
            data: text,
            timestamp: Date.now()
        });

    } catch (e: any) {
        setResponse({
            status: 0,
            statusText: 'Network Error',
            time: Date.now() - startTime,
            size: 0,
            headers: {},
            data: e.message || 'Failed to fetch',
            timestamp: Date.now()
        });
    } finally {
        setIsLoading(false);
    }
  };

  // --- Render Components ---

  const TabHeader: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 border-b border-slate-200 min-h-[40px]">
          <span className="font-bold text-xs text-slate-500 uppercase tracking-wider">{title}</span>
          <div className="flex items-center gap-2">
              {children}
          </div>
      </div>
  );

  const renderParamsTab = () => (
      <div className="flex flex-col h-full">
          <TabHeader title="Query Parameters">
              <button 
                  onClick={() => updateRequest('params', [...activeRequest.params, { id: Date.now().toString(), key: '', value: '', enabled: true }])}
                  className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 bg-white hover:bg-teal-50 px-2 py-1 rounded border border-slate-200 hover:border-teal-200 transition-colors"
              >
                  <Plus size={12} /> Add Parameter
              </button>
          </TabHeader>
          <div className="flex-1 overflow-hidden p-4">
             <KeyValueEditor 
                items={activeRequest.params} 
                onChange={(items) => updateRequest('params', items)} 
                title="Query Parameters"
                hideTitle={true}
                hideAddButton={true}
             />
          </div>
          {activeRequest.pathParams.length > 0 && (
              <div className="border-t border-slate-200 h-1/3 flex flex-col">
                  <TabHeader title="Path Parameters" />
                  <div className="flex-1 overflow-hidden p-4">
                      <KeyValueEditor 
                          items={activeRequest.pathParams} 
                          onChange={(items) => updateRequest('pathParams', items)}
                          title="Path Params"
                          hideTitle={true}
                          readOnlyKeys={true}
                          hideAddButton={true}
                      />
                  </div>
              </div>
          )}
      </div>
  );

  const renderHeadersTab = () => (
      <div className="flex flex-col h-full">
          <TabHeader title="Request Headers">
              <button 
                  onClick={() => updateRequest('headers', [...activeRequest.headers, { id: Date.now().toString(), key: '', value: '', enabled: true }])}
                  className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 bg-white hover:bg-teal-50 px-2 py-1 rounded border border-slate-200 hover:border-teal-200 transition-colors"
              >
                  <Plus size={12} /> Add Header
              </button>
          </TabHeader>
          <div className="flex-1 overflow-hidden p-4">
             <KeyValueEditor 
                items={activeRequest.headers} 
                onChange={(items) => updateRequest('headers', items)} 
                title="Headers"
                hideTitle={true}
                hideAddButton={true}
             />
          </div>
      </div>
  );

  const renderAuthTab = () => {
      const currentAuth = activeRequest.auth as any;
      const selectedCredId = currentAuth.id || '';

      return (
      <div className="flex flex-col h-full">
          <TabHeader title="Authorization">
               <button 
                   onClick={() => setIsAuthModalOpen(true)}
                   className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 bg-white hover:bg-teal-50 px-2 py-1 rounded border border-slate-200 hover:border-teal-200 transition-colors"
               >
                   <Shield size={12} /> Manage Credentials
               </button>
          </TabHeader>
          <div className="p-4 overflow-y-auto">
              <div className="max-w-xl space-y-6">
                  
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Credential Profile</label>
                      <select 
                          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-teal-500 transition-colors shadow-sm disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                          value={selectedCredId}
                          onChange={(e) => {
                              if (e.target.value === "") {
                                 // Clear auth but maybe keep ID undefined so it doesn't match anything
                                 updateRequest('auth', { type: 'none' });
                              } else {
                                 const cred = authCredentials.find(c => c.id === e.target.value);
                                 if (cred) updateRequest('auth', { ...cred });
                              }
                          }}
                      >
                          <option value="">No Authorization</option>
                          {authCredentials.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                      </select>
                      
                      {authCredentials.length === 0 && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                             <Shield size={10} />
                             No credentials found. <button onClick={() => setIsAuthModalOpen(true)} className="text-teal-600 hover:underline">Create one</button>
                          </p>
                      )}
                  </div>

                  {activeRequest.auth.type !== 'none' ? (
                     <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Shield size={12} />
                            Active Configuration
                        </div>
                        <div className="text-sm grid grid-cols-[80px_1fr] gap-y-2">
                             <div className="text-slate-400 font-medium">Type</div>
                             <div className="text-slate-700 font-mono bg-white px-2 py-0.5 rounded border border-slate-200 w-fit text-xs">{activeRequest.auth.type}</div>
                             
                             {activeRequest.auth.type === 'basic' && (
                                <>
                                    <div className="text-slate-400 font-medium">Username</div>
                                    <div className="text-slate-700 font-mono truncate">{activeRequest.auth.username || '-'}</div>
                                </>
                             )}
                             {activeRequest.auth.type === 'bearer' && (
                                <>
                                    <div className="text-slate-400 font-medium">Token</div>
                                    <div className="text-slate-700 font-mono truncate">••••••••</div>
                                </>
                             )}
                             {activeRequest.auth.type === 'apiKey' && (
                                <>
                                    <div className="text-slate-400 font-medium">Key</div>
                                    <div className="text-slate-700 font-mono truncate">{activeRequest.auth.apiKeyKey || '-'}</div>
                                    <div className="text-slate-400 font-medium">Placement</div>
                                    <div className="text-slate-700 font-mono truncate">{activeRequest.auth.apiKeyIn || 'header'}</div>
                                </>
                             )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-400 italic">
                            Values are injected at request time.
                        </div>
                     </div>
                  ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Shield size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-500 font-medium">Public Access</p>
                          <p className="text-xs text-slate-400">No authorization headers will be sent.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
      );
  };

  const renderBodyTab = () => (
      <div className="flex flex-col h-full">
          <TabHeader title="Request Body">
              <div className="flex items-center gap-2">
                   <select 
                      value={activeRequest.bodyType}
                      onChange={(e) => updateRequest('bodyType', e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-teal-500"
                   >
                       <option value="none">None</option>
                       <option value="json">JSON</option>
                       <option value="xml">XML</option>
                       <option value="text">Text</option>
                   </select>
                   {activeRequest.bodyType === 'json' && (
                       <button 
                          onClick={() => bodyEditorRef.current?.format()}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                          title="Format Body"
                       >
                          <Settings size={14} />
                       </button>
                   )}
              </div>
          </TabHeader>
          {activeRequest.bodyType === 'none' ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm bg-slate-50/30">
                  This request has no body.
              </div>
          ) : (
              <div className="flex-1 overflow-hidden relative">
                  <CodeEditor 
                      ref={bodyEditorRef}
                      language={activeRequest.bodyType === 'json' ? 'json' : activeRequest.bodyType === 'xml' ? 'xml' : 'text'}
                      value={activeRequest.body}
                      onChange={(val) => updateRequest('body', val)}
                  />
              </div>
          )}
      </div>
  );

  return (
    <div className="flex h-full w-full">
       {/* Sidebar */}
       <div 
          className="flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 overflow-hidden relative"
          style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
       >
          <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Database size={16} className="text-teal-600" />
                  API Sources
              </div>
              <button 
                  onClick={() => setIsAddingSource(!isAddingSource)} 
                  className={`p-1 rounded hover:bg-slate-100 ${isAddingSource ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}
                  title="Add Source"
              >
                  <Plus size={16} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto">
             {isAddingSource && (
                 <div className="p-3 bg-white border-b border-slate-200 animate-in slide-in-from-top-2">
                     <div className="space-y-2 mb-2">
                         <input 
                            placeholder="Spec URL (OpenAPI/Swagger)"
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:border-teal-500 focus:outline-none"
                            value={newSourceData.specUrl}
                            onChange={e => setNewSourceData({ ...newSourceData, specUrl: e.target.value })}
                         />
                         <div className="text-center text-[10px] text-slate-400">- OR -</div>
                         <input 
                            placeholder="Name"
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:border-teal-500 focus:outline-none"
                            value={newSourceData.name}
                            onChange={e => setNewSourceData({ ...newSourceData, name: e.target.value })}
                         />
                         <input 
                            placeholder="Base URL"
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:border-teal-500 focus:outline-none"
                            value={newSourceData.baseUrl}
                            onChange={e => setNewSourceData({ ...newSourceData, baseUrl: e.target.value })}
                         />
                     </div>
                     <div className="flex gap-2">
                         <button 
                            onClick={handleAddSource}
                            disabled={isFetchingSpec}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs py-1.5 rounded font-medium flex justify-center items-center gap-1"
                         >
                            {isFetchingSpec ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Add
                         </button>
                         <button 
                            onClick={() => setIsAddingSource(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs py-1.5 rounded font-medium"
                         >
                            Cancel
                         </button>
                     </div>
                 </div>
             )}
             
             {/* Source List */}
             {apiSources.map(source => (
                 <div key={source.id} className="border-b border-slate-100 last:border-0">
                     <div 
                        className="px-3 py-2 hover:bg-white cursor-pointer flex items-center justify-between group"
                        onClick={() => toggleSource(source.id)}
                     >
                         <div className="flex items-center gap-2 overflow-hidden">
                             {expandedSources[source.id] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                             <span className="text-xs font-bold text-slate-700 truncate">{source.name}</span>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 flex items-center">
                            {source.specUrl && (
                                <span className="text-[9px] bg-teal-50 text-teal-600 px-1 rounded border border-teal-100 mr-2">OAS</span>
                            )}
                         </div>
                     </div>
                     
                     {expandedSources[source.id] && (
                         <div className="bg-slate-50/50 pb-2">
                            {source.spec ? (
                                <div className="pl-2">
                                    {parseOpenApiPaths(source.spec).map((endpoint: any, idx: number) => (
                                        <div 
                                            key={idx}
                                            onClick={() => loadEndpoint(source, endpoint)}
                                            className="px-3 py-1.5 pl-6 hover:bg-teal-50 cursor-pointer flex items-center gap-2 group"
                                            title={endpoint.summary}
                                        >
                                            <span className={`
                                                text-[9px] font-bold px-1 rounded min-w-[32px] text-center
                                                ${endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' : 
                                                  endpoint.method === 'POST' ? 'bg-green-100 text-green-700' : 
                                                  endpoint.method === 'PUT' ? 'bg-orange-100 text-orange-700' : 
                                                  endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}
                                            `}>
                                                {endpoint.method}
                                            </span>
                                            <span className="text-xs text-slate-600 truncate flex-1">{endpoint.path}</span>
                                            <Plus size={12} className="text-teal-600 opacity-0 group-hover:opacity-100" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic px-6 py-2">
                                    No spec loaded. Endpoints not available.
                                </div>
                            )}
                         </div>
                     )}
                 </div>
             ))}
             
             {apiSources.length === 0 && (
                 <div className="p-4 text-center text-xs text-slate-400 italic">
                     No API sources defined.
                 </div>
             )}
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
            {/* Top Bar */}
            <div className="h-14 border-b border-slate-200 flex items-center px-4 gap-3 bg-white shrink-0">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-400 mr-2"
                >
                    {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
                
                <div className="flex-1 flex items-center gap-0 shadow-sm rounded-lg border border-slate-300 overflow-hidden h-9">
                    <select 
                        value={activeRequest.method}
                        onChange={(e) => updateRequest('method', e.target.value)}
                        className={`
                            h-full px-3 text-xs font-bold border-r border-slate-300 bg-slate-50 focus:outline-none appearance-none text-center min-w-[80px]
                            ${activeRequest.method === 'GET' ? 'text-blue-700' : 
                              activeRequest.method === 'POST' ? 'text-green-700' : 
                              activeRequest.method === 'DELETE' ? 'text-red-700' : 'text-orange-700'}
                        `}
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                        <option value="HEAD">HEAD</option>
                        <option value="OPTIONS">OPTIONS</option>
                    </select>
                    <input 
                        className="flex-1 h-full px-3 text-sm focus:outline-none font-mono text-slate-700"
                        placeholder="https://api.example.com/v1/resource"
                        value={activeRequest.url}
                        onChange={(e) => updateRequest('url', e.target.value)}
                    />
                    <button 
                        onClick={handleRun}
                        disabled={isLoading}
                        className="h-full px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:bg-slate-300"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Send
                    </button>
                </div>
            </div>

            {/* Request/Response Area */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                    
                    {/* Request Editor */}
                    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200">
                        {/* Tabs */}
                        <div className="flex items-center px-4 border-b border-slate-200 bg-white">
                            {(['params', 'auth', 'headers', 'body'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors
                                        ${activeTab === tab 
                                            ? 'border-teal-500 text-teal-600' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}
                                    `}
                                >
                                    {tab}
                                    {tab === 'params' && activeRequest.params.length > 0 && <span className="ml-1.5 text-[9px] bg-slate-100 px-1 rounded-full text-slate-500">{activeRequest.params.filter(p => p.enabled).length}</span>}
                                    {tab === 'headers' && activeRequest.headers.length > 0 && <span className="ml-1.5 text-[9px] bg-slate-100 px-1 rounded-full text-slate-500">{activeRequest.headers.filter(h => h.enabled).length}</span>}
                                    {tab === 'auth' && activeRequest.auth.type !== 'none' && <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-teal-500"></span>}
                                </button>
                            ))}
                        </div>
                        
                        {/* Tab Content */}
                        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50/10">
                            {activeTab === 'params' && renderParamsTab()}
                            {activeTab === 'headers' && renderHeadersTab()}
                            {activeTab === 'auth' && renderAuthTab()}
                            {activeTab === 'body' && renderBodyTab()}
                        </div>
                    </div>

                    {/* Response Viewer */}
                    <div className={`flex-1 flex flex-col min-h-0 bg-slate-50 ${response ? '' : 'justify-center items-center'}`}>
                        {response ? (
                            <>
                                <div className="px-4 py-2 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`text-sm font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-600' : 'text-red-600'}`}>
                                            {response.status} {response.statusText}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock size={12} /> {response.time}ms
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            <Download size={12} /> {(response.size / 1024).toFixed(2)} KB
                                        </div>
                                    </div>
                                    <button 
                                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                                        onClick={() => {
                                            const blob = new Blob([response.data], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `response_${Date.now()}.json`;
                                            a.click();
                                        }}
                                    >
                                        Save Response
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    <CodeEditor 
                                        language="json" 
                                        value={response.data} 
                                        onChange={() => {}} 
                                        readOnly={true}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-slate-300">
                                <Globe size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-sm font-medium">Enter URL and click Send</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
       </div>

       <ToolsPanel 
            variablesJson={variablesJson}
            onVariablesChange={onVariablesChange}
            functions={functions}
            onFunctionsChange={onFunctionsChange}
            activeEditorType={EditorType.REST_API}
            onInsert={(text) => {
                if (insertIntoNativeInput(document.activeElement, text)) return;
                
                if (activeTab === 'body') {
                    if (bodyEditorRef.current && bodyEditorRef.current.hasTextFocus()) {
                        bodyEditorRef.current.insertText(text);
                    }
                }
            }}
            onUpdateContent={(val) => {
                if (activeTab === 'body') updateRequest('body', val);
            }}
            onAiAssist={onAiAssist}
       />
       
       <AuthManagerModal 
           isOpen={isAuthModalOpen}
           credentials={authCredentials}
           onClose={() => setIsAuthModalOpen(false)}
           onUpdateCredentials={onAuthCredentialsChange}
       />
    </div>
  );
};