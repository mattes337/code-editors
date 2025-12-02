import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Plus, Clock, Download, 
  ChevronRight, ChevronDown, MoreVertical, 
  Settings, Wifi, Shield, Database, 
  FileCode, Send, RefreshCw, X, Search, Globe, Box,
  PanelLeftClose, PanelLeftOpen, Loader2
} from 'lucide-react';
import { RestRequest, RestResponse, RestMethod, ApiSource, UserFunction, EditorType, NamedAuthConfig } from '../../lib/types';
import { CodeEditor, CodeEditorRef } from '../shared-ui/CodeEditor';
import { KeyValueEditor } from '../shared-ui/KeyValueEditor';
import { ToolsPanel } from '../shared-ui/ToolsPanel';
import { interpolateString } from '../../lib/utils';
import { AuthManagerModal } from './AuthManagerModal';

interface RestEditorProps {
  variables: Record<string, any>;
  variablesJson: string;
  onVariablesChange: (json: string) => void;
  variableError: string | null;
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
    // Remove leading #/ and split
    const path = ref.replace(/^#\//, '').split('/');
    let current = root;
    for (const segment of path) {
        if (!current) return null;
        current = current[segment];
    }
    return current;
};

const generateMockData = (schema: any, rootSpec: any, depth = 0): any => {
    if (depth > 5) return null; // Prevent infinite recursion
    if (!schema) return null;

    if (schema.$ref) {
        const resolved = resolveRef(schema.$ref, rootSpec);
        return generateMockData(resolved, rootSpec, depth + 1);
    }

    // Handle allOf (merge properties)
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
            // Generate one item for the array
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
const parseOpenApiPaths = (spec: any) => {
  const endpoints: any[] = [];
  if (!spec || !spec.paths) return endpoints;
  
  Object.keys(spec.paths).forEach(path => {
    Object.keys(spec.paths[path]).forEach(method => {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          summary: spec.paths[path][method].summary || path,
          operationId: spec.paths[path][method].operationId,
          tags: spec.paths[path][method].tags || [],
          spec: spec.paths[path][method]
        });
      }
    });
  });
  return endpoints;
};

const normalizeUrl = (url: string) => {
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
    }
    return url;
};

const updateSourceFromSpec = (source: ApiSource, spec: any): ApiSource => {
    let newBaseUrl = source.baseUrl;
    
    // Swagger 2.0
    if (spec.swagger === '2.0') {
        const protocol = (spec.schemes && spec.schemes.includes('https')) ? 'https' : 'http';
        const host = spec.host || source.baseUrl.replace(/^https?:\/\//, '');
        const basePath = spec.basePath || '';
        // If host is present in spec, construct full url. Otherwise append basePath to existing baseUrl (if not already there)
        if (spec.host) {
            newBaseUrl = `${protocol}://${host}${basePath}`;
        } else {
             // Basic append if we just have basePath
             newBaseUrl = `${source.baseUrl}${basePath}`;
        }
    } 
    // OpenAPI 3.0
    else if (spec.servers && spec.servers.length > 0) {
        newBaseUrl = spec.servers[0].url;
        // Handle relative server URLs
        if (newBaseUrl.startsWith('/')) {
             const origin = new URL(source.specUrl || source.baseUrl).origin;
             newBaseUrl = `${origin}${newBaseUrl}`;
        }
    }
    
    // Remove trailing slash
    newBaseUrl = newBaseUrl.replace(/\/$/, '');
    
    return { ...source, baseUrl: newBaseUrl, spec };
};

export const RestEditor: React.FC<RestEditorProps> = ({
  variables,
  variablesJson,
  onVariablesChange,
  variableError,
  functions,
  onFunctionsChange,
  authCredentials,
  onAuthCredentialsChange,
  apiSources,
  onApiSourcesChange,
  onAiAssist
}) => {
  // --- Registry State ---
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceData, setNewSourceData] = useState({ name: '', baseUrl: '', specUrl: '' });
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  // Use a ref to track attempted fetches to prevent infinite loops if fetch fails
  const attemptedFetches = useRef<Set<string>>(new Set());

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

  // --- Refs ---
  const bodyEditorRef = useRef<CodeEditorRef>(null);

  const activeRequest = requests.find(r => r.id === activeRequestId) || requests[0];

  // --- URL to Path Params Sync ---
  // If the URL contains {var}, ensure it exists in pathParams.
  // If a param is removed from URL, remove it from pathParams.
  // Preserve existing values.
  useEffect(() => {
    if (!activeRequest) return;
    
    // Regex to find {param} in URL
    const matches = activeRequest.url.match(/\{([^}]+)\}/g);
    const keysInUrl = matches ? matches.map(m => m.slice(1, -1)) : [];

    const currentParams = activeRequest.pathParams;
    const currentKeys = currentParams.map(p => p.key);

    // Check if sync is needed to avoid infinite loop
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
        
        // Use functional update to ensure we don't clobber other concurrent updates
        setRequests(prev => prev.map(r => r.id === activeRequestId ? { ...r, pathParams: newPathParams } : r));
    }

  }, [activeRequest?.url, activeRequestId]);

  // --- Initial Fetch of Specs for Passed Sources ---
  useEffect(() => {
      let isMounted = true;
      
      const fetchSpecForSource = async (source: ApiSource): Promise<ApiSource> => {
          if (!source.specUrl) return source;
          
          try {
              let response;
              try {
                  response = await fetch(source.specUrl);
                  if (!response.ok) throw new Error("Direct fetch failed");
              } catch (e) {
                   // Proxy fallback
                   const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source.specUrl)}`;
                   response = await fetch(proxyUrl);
              }
              
              if (!response.ok) throw new Error("Fetch failed");
              
              const text = await response.text();
              const json = JSON.parse(text);
              return updateSourceFromSpec(source, json);
          } catch (e) {
              console.warn(`Failed to fetch spec for ${source.name}`, e);
              return source;
          }
      };

      const updateSpecs = async () => {
          let hasUpdates = false;
          // Only fetch sources that have a specUrl but no spec loaded, and haven't been attempted this session
          const promises = apiSources.map(async (s) => {
              if (s.specUrl && !s.spec && !attemptedFetches.current.has(s.id)) {
                  attemptedFetches.current.add(s.id);
                  const updated = await fetchSpecForSource(s);
                  // Check if it actually updated (has spec now)
                  if (updated.spec) {
                      hasUpdates = true;
                      return updated;
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

  // --- Handlers: Registry ---
  const toggleSource = (id: string) => {
      setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSource = async () => {
      if (!newSourceData.name || !newSourceData.baseUrl) return;
      
      setIsFetchingSpec(true);
      let spec = null;
      let finalSpecUrl = newSourceData.specUrl ? normalizeUrl(newSourceData.specUrl) : '';
      const finalBaseUrl = normalizeUrl(newSourceData.baseUrl);

      if (finalSpecUrl) {
          try {
              // Try direct fetch first
              const res = await fetch(finalSpecUrl);
              if (res.ok) {
                  const text = await res.text();
                  spec = JSON.parse(text);
              } else {
                  throw new Error(`Direct fetch failed: ${res.status}`);
              }
          } catch (e) {
              console.warn("Direct spec fetch failed, attempting proxy...", e);
              try {
                  // Fallback to CORS proxy
                  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(finalSpecUrl)}`;
                  const res = await fetch(proxyUrl);
                  if (res.ok) {
                      const text = await res.text();
                      spec = JSON.parse(text);
                  } else {
                      console.error(`Proxy fetch failed: ${res.status}`);
                  }
              } catch (proxyErr) {
                   console.error("Proxy fetch failed", proxyErr);
              }
          }
      }

      let newSource: ApiSource = {
          id: `src_${Date.now()}`,
          name: newSourceData.name,
          baseUrl: finalBaseUrl,
          specUrl: finalSpecUrl,
          spec,
          lastFetched: Date.now()
      };

      if (spec) {
          newSource = updateSourceFromSpec(newSource, spec);
      }

      onApiSourcesChange([...apiSources, newSource]);
      setExpandedSources(prev => ({ ...prev, [newSource.id]: true }));
      setIsAddingSource(false);
      setNewSourceData({ name: '', baseUrl: '', specUrl: '' });
      setIsFetchingSpec(false);
  };

  const loadEndpoint = (source: ApiSource, endpoint: any) => {
      // Clean up path for display
      const path = endpoint.path;
      const fullSpec = source.spec;
      
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

      // Extract Params (Query, Header, Path)
      if (endpoint.spec.parameters) {
          endpoint.spec.parameters.forEach((p: any) => {
             const desc = [p.type, p.format, p.description].filter(Boolean).join(' - ');
             
             // Handle Query Params
             if (p.in === 'query') {
                 let value = '';
                 if (p.default !== undefined) value = String(p.default);
                 else if (p.example !== undefined) value = String(p.example);
                 
                 newReq.params.push({ 
                     id: `p_${Date.now()}_${Math.random()}`, 
                     key: p.name, 
                     value: value, 
                     enabled: p.required || false,
                     description: desc
                 });
             } 
             // Handle Header Params
             else if (p.in === 'header') {
                 let value = '';
                 if (p.default !== undefined) value = String(p.default);
                 else if (p.example !== undefined) value = String(p.example);
                 
                 newReq.headers.push({ 
                     id: `h_${Date.now()}_${Math.random()}`, 
                     key: p.name, 
                     value: value, 
                     enabled: p.required || false,
                     description: desc
                 });
             }
             // Handle Path Params
             else if (p.in === 'path') {
                 let value = '';
                 if (p.default !== undefined) value = String(p.default);
                 else if (p.example !== undefined) value = String(p.example);
                 
                 // Note: we just push it here to set the metadata (description/value).
                 // The useEffect hook will verify it matches the URL structure.
                 newReq.pathParams.push({
                     id: `pp_${Date.now()}_${Math.random()}`,
                     key: p.name,
                     value: value,
                     enabled: true,
                     description: desc
                 });
             }
          });
      }

      // Extract Body Schema (Swagger 2.0 or OpenAPI 3.0)
      let bodySchema = null;
      
      // 1. Check OpenAPI 3 requestBody
      if (endpoint.spec.requestBody && endpoint.spec.requestBody.content && endpoint.spec.requestBody.content['application/json']) {
          bodySchema = endpoint.spec.requestBody.content['application/json'].schema;
      }
      
      // 2. Check Swagger 2.0 body parameter
      if (!bodySchema && endpoint.spec.parameters) {
          const bodyParam = endpoint.spec.parameters.find((p: any) => p.in === 'body');
          if (bodyParam) {
              bodySchema = bodyParam.schema;
          }
      }

      // Generate Mock Body if schema exists
      if (bodySchema) {
          const mockData = generateMockData(bodySchema, fullSpec);
          if (mockData) {
              newReq.body = JSON.stringify(mockData, null, 2);
              newReq.bodyType = 'json';
          }
      } else if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD') {
          // Default empty JSON object for methods that usually have a body
          newReq.body = '{}';
      }

      setRequests(prev => [...prev, newReq]);
      setActiveRequestId(newReq.id);
      setResponse(null);
      // Auto-switch to body tab if body is present
      if (newReq.body && newReq.body !== '{}') {
          setActiveTab('body');
      } else {
          setActiveTab('params');
      }
  };

  // --- Handlers: Requests ---
  const updateRequest = (updates: Partial<RestRequest>) => {
    setRequests(prev => prev.map(r => r.id === activeRequestId ? { ...r, ...updates } : r));
  };

  const applyAuthCredential = (id: string) => {
      if (!id) return;
      const cred = authCredentials.find(c => c.id === id);
      if (cred) {
          // Destructure to remove ID/Name from the actual request config (cleaner)
          const { id: _, name: __, ...config } = cred;
          updateRequest({ auth: config });
      }
  };

  // --- Execution Engine ---
  const executeRequest = async () => {
    setIsLoading(true);
    setResponse(null);
    const startTime = performance.now();

    try {
      // 1. Interpolation
      // Ensure URL has protocol if missing (handle manual entry without http)
      let urlToProcess = activeRequest.url;
      if (!urlToProcess.startsWith('http') && !urlToProcess.includes('{{')) {
          urlToProcess = 'https://' + urlToProcess;
      }

      let urlRaw = interpolateString(urlToProcess, variables, functions);

      // Path Param Substitution
      // We substitute {key} with the value from the table
      activeRequest.pathParams.forEach(p => {
          if (p.enabled) {
              const val = interpolateString(p.value, variables, functions);
              // Replace all occurrences
              urlRaw = urlRaw.split(`{${p.key}}`).join(encodeURIComponent(val));
          }
      });

      const headersObj: Record<string, string> = {};
      
      activeRequest.headers.forEach(h => {
        if (h.enabled && h.key) {
          headersObj[h.key] = interpolateString(h.value, variables, functions);
        }
      });

      // Auth Injection
      if (activeRequest.auth.type === 'bearer' && activeRequest.auth.token) {
        headersObj['Authorization'] = `Bearer ${interpolateString(activeRequest.auth.token, variables, functions)}`;
      } else if (activeRequest.auth.type === 'basic') {
        const u = interpolateString(activeRequest.auth.username || '', variables, functions);
        const p = interpolateString(activeRequest.auth.password || '', variables, functions);
        headersObj['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`;
      } else if (activeRequest.auth.type === 'apiKey' && activeRequest.auth.apiKeyKey) {
        const val = interpolateString(activeRequest.auth.apiKeyValue || '', variables, functions);
        if (activeRequest.auth.apiKeyIn === 'header') {
          headersObj[activeRequest.auth.apiKeyKey] = val;
        }
      }

      // Query Params
      const urlObj = new URL(urlRaw);
      activeRequest.params.forEach(p => {
        if (p.enabled && p.key) {
          urlObj.searchParams.append(p.key, interpolateString(p.value, variables, functions));
        }
      });
      if (activeRequest.auth.type === 'apiKey' && activeRequest.auth.apiKeyIn === 'query' && activeRequest.auth.apiKeyKey) {
         urlObj.searchParams.append(activeRequest.auth.apiKeyKey, interpolateString(activeRequest.auth.apiKeyValue || '', variables, functions));
      }

      // Body
      let body: string | undefined = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(activeRequest.method) && activeRequest.bodyType !== 'none') {
         body = interpolateString(activeRequest.body, variables, functions);
      }

      // 2. Fetch
      let res;
      try {
          res = await fetch(urlObj.toString(), {
            method: activeRequest.method,
            headers: headersObj,
            body: body
          });
      } catch (netErr: any) {
          throw new Error(`Network Request Failed: ${netErr.message || 'Unknown Error'}. Check CORS or Protocol.`);
      }

      const endTime = performance.now();
      
      let text = '';
      try {
          text = await res.text();
      } catch (readErr: any) {
          text = `[Error reading response body: ${readErr.message}]`;
      }
      
      // Parse JSON if possible for pretty print
      let data = text;
      try {
        data = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => resHeaders[k] = v);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: Math.round(endTime - startTime),
        size: new Blob([text]).size,
        headers: resHeaders,
        data: data,
        timestamp: Date.now()
      });

    } catch (e: any) {
      setResponse({
        status: 0,
        statusText: 'Error',
        time: 0,
        size: 0,
        headers: {},
        data: e.message || 'Network/Parsing Error',
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50 border-green-200';
    if (status >= 300 && status < 400) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (status >= 400 && status < 500) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const MethodBadge = ({ method }: { method: string }) => {
    const colors: Record<string, string> = {
      GET: 'text-blue-700 bg-blue-50 border-blue-200',
      POST: 'text-green-700 bg-green-50 border-green-200',
      PUT: 'text-orange-700 bg-orange-50 border-orange-200',
      DELETE: 'text-red-700 bg-red-50 border-red-200',
      PATCH: 'text-purple-700 bg-purple-50 border-purple-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[method] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
        {method}
      </span>
    );
  };

  const handleUpdateContent = (text: string) => {
    const trimmed = text.trim();
    
    // Attempt to parse as full request config
    try {
        if (trimmed.startsWith('{')) {
            const json = JSON.parse(trimmed);
            // Check if it looks like a request config
            if (json.method && json.url) {
                const method = json.method.toUpperCase();
                if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
                    
                    const updates: Partial<RestRequest> = {
                        method: method as RestMethod,
                        url: json.url
                    };

                    if (json.body) {
                        updates.body = typeof json.body === 'string' ? json.body : JSON.stringify(json.body, null, 2);
                        updates.bodyType = 'json';
                        setActiveTab('body');
                    }
                    
                    if (json.headers && typeof json.headers === 'object') {
                         updates.headers = Object.entries(json.headers).map(([k, v]) => ({
                             id: `h_${Date.now()}_${Math.random()}`,
                             key: k,
                             value: String(v),
                             enabled: true
                         }));
                    }

                    updateRequest(updates);
                    return;
                }
            }
        }
    } catch {}

    // Try to detect URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('{{')) {
        updateRequest({ url: trimmed });
    } 
    // Try to detect JSON body
    else if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        updateRequest({ body: trimmed, bodyType: 'json' });
        setActiveTab('body');
    } 
    // Fallback: assume body text
    else {
        updateRequest({ body: trimmed });
        setActiveTab('body');
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50">
      
      {/* --- Sidebar (API Browser) --- */}
      <div 
        className="flex flex-col border-r border-slate-200 bg-white h-full shrink-0 relative transition-all duration-300 ease-in-out"
        style={{ width: isSidebarOpen ? sidebarWidth : '3.5rem' }}
      >
        <div className={`py-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'}`}>
            {isSidebarOpen && (
                <div className="flex items-center gap-2">
                    <Globe size={14} className="text-teal-600" />
                    <span>APIs</span>
                </div>
            )}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded transition-colors"
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
                {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
        </div>

        {isSidebarOpen ? (
        <>
            {/* Search */}
            <div className="p-3 border-b border-slate-100">
                <div className="relative">
                    <input 
                        type="text"
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        placeholder="Filter..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                    <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-2 space-y-2">
                    {apiSources.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-lg m-2">
                            <p className="mb-2 font-bold">No API Sources</p>
                            <p className="text-xs">Add an API source to browse endpoints or create a custom request.</p>
                        </div>
                    ) : (
                        apiSources.map(source => (
                            <div key={source.id} className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                <div 
                                    onClick={() => toggleSource(source.id)}
                                    className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100"
                                >
                                    <div className="font-semibold text-sm text-slate-700">{source.name}</div>
                                    <div className="text-slate-400">
                                        {expandedSources[source.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                </div>
                                {expandedSources[source.id] && (
                                    <div className="bg-white p-2">
                                        {source.spec ? (
                                            (() => {
                                                const endpoints = parseOpenApiPaths(source.spec);
                                                const filtered = endpoints.filter(ep => {
                                                    const search = filterText.toLowerCase();
                                                    return (
                                                        ep.path.toLowerCase().includes(search) || 
                                                        ep.method.toLowerCase().includes(search) ||
                                                        (ep.summary && ep.summary.toLowerCase().includes(search)) ||
                                                        (ep.tags && ep.tags.some((t: any) => t.toLowerCase().includes(search)))
                                                    );
                                                });

                                                // Group by tags
                                                const grouped: Record<string, typeof endpoints> = {};
                                                filtered.forEach(ep => {
                                                    const tag = (ep.tags && ep.tags.length > 0) ? ep.tags[0] : 'Endpoints';
                                                    if (!grouped[tag]) grouped[tag] = [];
                                                    grouped[tag].push(ep);
                                                });
                                                
                                                const sortedTags = Object.keys(grouped).sort();

                                                if (sortedTags.length === 0) {
                                                    return <div className="text-xs text-slate-400 italic p-2">No matching endpoints</div>;
                                                }

                                                return (
                                                    <div className="space-y-1">
                                                        {sortedTags.map(tag => {
                                                            const groupId = `${source.id}-${tag}`;
                                                            // Auto-expand if filtering, otherwise respect toggle state (default collapsed)
                                                            const isExpanded = filterText ? true : !!expandedTags[groupId];
                                                            
                                                            return (
                                                                <div key={groupId}>
                                                                    <div 
                                                                        className="flex items-center gap-1 py-1 px-1 cursor-pointer hover:bg-slate-50 rounded text-slate-600 select-none group/tag"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedTags(prev => ({...prev, [groupId]: !prev[groupId]}));
                                                                        }}
                                                                    >
                                                                        <div className="text-slate-400 group-hover/tag:text-slate-600">
                                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                        </div>
                                                                        <span className="text-xs font-bold truncate flex-1">{tag}</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 rounded-full">{grouped[tag].length}</span>
                                                                    </div>
                                                                    
                                                                    {isExpanded && (
                                                                        <div className="pl-2 ml-1.5 border-l border-slate-100 space-y-0.5">
                                                                            {grouped[tag].map((ep, idx) => (
                                                                                <div 
                                                                                    key={`${groupId}-${idx}`} 
                                                                                    onClick={() => loadEndpoint(source, ep)}
                                                                                    className="group flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer transition-colors"
                                                                                >
                                                                                    <MethodBadge method={ep.method} />
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="text-xs font-medium text-slate-700 truncate" title={ep.summary || ep.operationId}>
                                                                                            {ep.summary || ep.operationId || ep.path}
                                                                                        </div>
                                                                                    </div>
                                                                                    <button className="opacity-0 group-hover:opacity-100 p-1 text-teal-600 hover:bg-teal-100 rounded">
                                                                                        <Play size={10} />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div className="p-4 text-center text-xs text-slate-400 italic">
                                                {source.specUrl ? "Loading spec..." : "No spec loaded"}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    
                    {isAddingSource ? (
                        <div className="p-3 bg-slate-50 border border-teal-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Name</label>
                                    <input 
                                        autoFocus
                                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500"
                                        placeholder="My API"
                                        value={newSourceData.name}
                                        onChange={e => setNewSourceData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Base URL</label>
                                    <input 
                                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500 font-mono"
                                        placeholder="https://api.example.com"
                                        value={newSourceData.baseUrl}
                                        onChange={e => setNewSourceData(prev => ({ ...prev, baseUrl: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Swagger/OpenAPI Spec URL (Optional)</label>
                                    <input 
                                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-500 font-mono"
                                        placeholder="https://.../swagger.json"
                                        value={newSourceData.specUrl}
                                        onChange={e => setNewSourceData(prev => ({ ...prev, specUrl: e.target.value }))}
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button 
                                        onClick={handleAddSource}
                                        disabled={!newSourceData.name || !newSourceData.baseUrl || isFetchingSpec}
                                        className="flex-1 py-1.5 bg-teal-600 text-white text-xs font-bold rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                    >
                                        {isFetchingSpec ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Add
                                    </button>
                                    <button 
                                        onClick={() => { setIsAddingSource(false); setNewSourceData({ name: '', baseUrl: '', specUrl: '' }); }}
                                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddingSource(true)}
                            className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Add Source
                        </button>
                    )}
                </div>
            </div>
            
            {/* Resizer */}
            <div 
            className="absolute right-0 top-0 bottom-0 w-1 hover:w-1.5 cursor-col-resize hover:bg-teal-400 transition-all z-10"
            onMouseDown={() => {
                const handler = (e: MouseEvent) => setSidebarWidth(Math.max(250, Math.min(600, e.clientX)));
                const up = () => { window.removeEventListener('mousemove', handler); window.removeEventListener('mouseup', up); };
                window.addEventListener('mousemove', handler);
                window.addEventListener('mouseup', up);
            }}
            />
        </>
        ) : (
            <div className="flex flex-col items-center gap-4 mt-4">
                 <button 
                    onClick={() => { setIsSidebarOpen(true); setIsAddingSource(true); }}
                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    title="Add API Source"
                >
                    <Plus size={18} />
                </button>
            </div>
        )}
      </div>

      {/* --- Main Content (Composer) --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0 shadow-sm z-10">
          <select 
            value={activeRequest.method}
            onChange={(e) => updateRequest({ method: e.target.value as RestMethod })}
            className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          
          <div className="flex-1 relative group">
            <input 
              type="text"
              value={activeRequest.url}
              onChange={(e) => updateRequest({ url: e.target.value })}
              placeholder="Enter URL (supports {{ variables }})"
              className="w-full h-10 pl-4 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800 transition-all"
            />
            {activeRequest.meta?.origin === 'swagger' && (
                 <div className="absolute right-3 top-3 text-xs text-teal-600 bg-teal-50 px-2 rounded pointer-events-none">
                     Swagger
                 </div>
            )}
          </div>

          <button 
            onClick={executeRequest}
            disabled={isLoading}
            className="h-10 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 min-w-[100px] justify-center"
          >
            <div className="flex items-center gap-2">
                <Play size={16} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Sending...' : 'Send'}
            </div>
          </button>
        </div>
        
        {/* Response / Request Body Area */}
        <div className="flex-1 flex flex-col min-h-0">
             {/* Request Config */}
             <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200">
                 {/* Tabs */}
                 <div className="flex items-center px-4 border-b border-slate-200 bg-white">
                    <button 
                        onClick={() => setActiveTab('params')} 
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'params' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        Params {activeRequest.params.length > 0 && `(${activeRequest.params.length})`}
                    </button>
                    <button 
                        onClick={() => setActiveTab('auth')} 
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'auth' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        Auth {activeRequest.auth.type !== 'none' && '•'}
                    </button>
                    <button 
                        onClick={() => setActiveTab('headers')} 
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'headers' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        Headers {activeRequest.headers.length > 0 && `(${activeRequest.headers.length})`}
                    </button>
                    <button 
                        onClick={() => setActiveTab('body')} 
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'body' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        Body {activeRequest.bodyType !== 'none' && '•'}
                    </button>
                 </div>

                 {/* Tab Content */}
                 <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                    {activeTab === 'params' && (
                        <div className="absolute inset-0 p-4 overflow-y-auto">
                            <div className="space-y-4 max-w-4xl mx-auto">
                                <KeyValueEditor 
                                    title="Query Parameters" 
                                    items={activeRequest.params} 
                                    onChange={(p) => updateRequest({ params: p })} 
                                />
                                {activeRequest.pathParams.length > 0 && (
                                    <KeyValueEditor 
                                        title="Path Parameters" 
                                        items={activeRequest.pathParams} 
                                        onChange={(p) => updateRequest({ pathParams: p })} 
                                        readOnlyKeys
                                        hideAddButton
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'headers' && (
                        <div className="absolute inset-0 p-4 overflow-y-auto">
                            <div className="max-w-4xl mx-auto h-full">
                                <KeyValueEditor 
                                    title="HTTP Headers" 
                                    items={activeRequest.headers} 
                                    onChange={(h) => updateRequest({ headers: h })} 
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'auth' && (
                        <div className="absolute inset-0 p-6 overflow-y-auto">
                            <div className="max-w-2xl mx-auto bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Shield size={16} className="text-teal-600" />
                                    Authentication
                                </h3>
                                
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Auth Type</label>
                                    <select 
                                        value={activeRequest.auth.type}
                                        onChange={(e) => updateRequest({ auth: { ...activeRequest.auth, type: e.target.value as any } })}
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="none">No Auth</option>
                                        <option value="basic">Basic Auth</option>
                                        <option value="bearer">Bearer Token</option>
                                        <option value="apiKey">API Key</option>
                                    </select>
                                </div>

                                {activeRequest.auth.type !== 'none' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        {activeRequest.auth.type === 'basic' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Username</label>
                                                    <input 
                                                        value={activeRequest.auth.username || ''}
                                                        onChange={(e) => updateRequest({ auth: { ...activeRequest.auth, username: e.target.value } })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:border-teal-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Password</label>
                                                    <input 
                                                        type="password"
                                                        value={activeRequest.auth.password || ''}
                                                        onChange={(e) => updateRequest({ auth: { ...activeRequest.auth, password: e.target.value } })}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:border-teal-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {activeRequest.auth.type === 'bearer' && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Token</label>
                                                <input 
                                                    value={activeRequest.auth.token || ''}
                                                    onChange={(e) => updateRequest({ auth: { ...activeRequest.auth, token: e.target.value } })}
                                                    placeholder="ey..."
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                                                />
                                            </div>
                                        )}

                                        {activeRequest.auth.type === 'apiKey' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Key</label>
                                                    <input 
                                                        value={activeRequest.auth.apiKeyKey || ''}
                                                        onChange={(e) => updateRequest({ auth: { ...activeRequest.auth, apiKeyKey: e.target.value } })}
                                                        placeholder="X-API-Key"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Value</label>
                                                    <input 
                                                        value={activeRequest.auth.apiKeyValue || ''}
                                                        onChange={(e) => updateRequest({ auth: { ...activeRequest.auth, apiKeyValue: e.target.value } })}
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
                                                                checked={activeRequest.auth.apiKeyIn !== 'query'}
                                                                onChange={() => updateRequest({ auth: { ...activeRequest.auth, apiKeyIn: 'header' } })}
                                                            /> Header
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                            <input 
                                                                type="radio" 
                                                                className="accent-teal-600"
                                                                checked={activeRequest.auth.apiKeyIn === 'query'}
                                                                onChange={() => updateRequest({ auth: { ...activeRequest.auth, apiKeyIn: 'query' } })}
                                                            /> Query Params
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Saved Credentials</label>
                                    <div className="flex flex-wrap gap-2">
                                        {authCredentials.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">No saved credentials. Use the manager below.</span>
                                        ) : (
                                            authCredentials.map(cred => (
                                                <button 
                                                    key={cred.id}
                                                    onClick={() => applyAuthCredential(cred.id)}
                                                    className="px-3 py-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-600 hover:text-teal-700 rounded-full text-xs transition-colors flex items-center gap-1"
                                                >
                                                    <Shield size={10} /> {cred.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setIsAuthModalOpen(true)}
                                        className="mt-4 text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                                    >
                                        <Settings size={12} /> Manage Credentials
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'body' && (
                         <div className="absolute inset-0 flex flex-col p-4">
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            className="accent-teal-600"
                                            checked={activeRequest.bodyType === 'none'}
                                            onChange={() => updateRequest({ bodyType: 'none' })}
                                        /> None
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            className="accent-teal-600"
                                            checked={activeRequest.bodyType === 'json'}
                                            onChange={() => updateRequest({ bodyType: 'json' })}
                                        /> JSON
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            className="accent-teal-600"
                                            checked={activeRequest.bodyType === 'xml'}
                                            onChange={() => updateRequest({ bodyType: 'xml' })}
                                        /> XML
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            className="accent-teal-600"
                                            checked={activeRequest.bodyType === 'text'}
                                            onChange={() => updateRequest({ bodyType: 'text' })}
                                        /> Text
                                    </label>
                                </div>
                             </div>
                             
                             {activeRequest.bodyType !== 'none' ? (
                                 <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden">
                                     <CodeEditor 
                                        ref={bodyEditorRef}
                                        language={activeRequest.bodyType === 'json' ? 'json' : activeRequest.bodyType === 'xml' ? 'xml' : 'text'}
                                        value={activeRequest.body}
                                        onChange={(val) => updateRequest({ body: val || '' })}
                                     />
                                 </div>
                             ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                                     <FileCode size={48} className="mb-2 opacity-50" />
                                     <span className="text-sm">No Body</span>
                                 </div>
                             )}
                         </div>
                    )}
                 </div>
             </div>
             
             {/* Response Area */}
             <div className="h-[40%] min-h-[200px] flex flex-col border-t border-slate-200 bg-white">
                 <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Response</div>
                    {response && (
                        <div className="flex items-center gap-4 text-xs font-mono">
                            <span className={`px-2 py-0.5 rounded border font-bold ${getStatusColor(response.status)}`}>
                                {response.status} {response.statusText}
                            </span>
                            <span className="text-slate-500 flex items-center gap-1">
                                <Clock size={12} /> {response.time}ms
                            </span>
                            <span className="text-slate-500 flex items-center gap-1">
                                <Database size={12} /> {response.size}B
                            </span>
                        </div>
                    )}
                 </div>
                 
                 <div className="flex-1 relative">
                    {response ? (
                        <CodeEditor 
                            language="json" 
                            value={response.data} 
                            onChange={() => {}} 
                            readOnly={true}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                             <Send size={32} className="mb-2 opacity-50" />
                             <span className="text-sm">Enter URL and click Send</span>
                        </div>
                    )}
                 </div>
             </div>
        </div>
      </div>

      <ToolsPanel 
            variablesObj={variables}
            variablesJson={variablesJson}
            onVariablesChange={onVariablesChange}
            variableError={variableError}
            functions={functions}
            onFunctionsChange={onFunctionsChange}
            activeEditorType={EditorType.REST_API}
            onAiAssist={onAiAssist}
            onUpdateContent={handleUpdateContent}
        />
      
      {/* Auth Modal */}
      <AuthManagerModal 
        isOpen={isAuthModalOpen}
        credentials={authCredentials}
        onClose={() => setIsAuthModalOpen(false)}
        onUpdateCredentials={onAuthCredentialsChange}
      />
    </div>
  );
};