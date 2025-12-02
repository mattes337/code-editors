import React, { useState, useEffect, useRef } from 'react';
import { EditorType, UserFunction, DbConnection, HostImage } from '../../lib/types';
import { JsonEditor } from '../json-editor/JsonEditor';
import { HtmlEditor } from '../html-editor/HtmlEditor';
import { ScriptEditor } from '../script-editor/ScriptEditor';
import { DbQueryEditor } from '../db-query-editor/DbQueryEditor';
import { XmlEditor } from '../xml-editor/XmlEditor';
import { FileJson, Mail, Workflow, Leaf, Settings, Database, FileCode } from 'lucide-react';
import { DEFAULT_EMAIL_SNIPPET_GROUPS, DEFAULT_SQL_DIALECT_DATA, DEFAULT_XML_SNIPPET_GROUPS } from '../../lib/constants';
import {
  DEFAULT_VARIABLES_JSON,
  DEFAULT_JSON_CONTENT,
  DEFAULT_HTML_CONTENT,
  DEFAULT_SCRIPT_CONTENT,
  DEFAULT_SQL_CONTENT,
  DEFAULT_XML_CONTENT,
  DEFAULT_FUNCTIONS,
  DEFAULT_DB_CONNECTIONS,
  DEFAULT_HOST_IMAGES
} from '../../lib/defaults';
import {
  generateJsonAssistResponse,
  generateHtmlAssistResponse,
  generateScriptAssistResponse,
  generateSqlAssistResponse,
  generateXmlAssistResponse
} from '../../lib/ai-service';

export default function App() {
  // Global Store State
  const [activeEditor, setActiveEditor] = useState<EditorType>(EditorType.JSON_REST);
  
  // Content State
  const [jsonContent, setJsonContent] = useState(DEFAULT_JSON_CONTENT);
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML_CONTENT);
  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT_CONTENT);
  const [sqlContent, setSqlContent] = useState(DEFAULT_SQL_CONTENT);
  const [xmlContent, setXmlContent] = useState(DEFAULT_XML_CONTENT);

  // Context State
  const [variablesJson, setVariablesJson] = useState<string>(DEFAULT_VARIABLES_JSON);
  // Initialize lazily to ensure data is available on first render
  const [variablesObj, setVariablesObj] = useState<Record<string, any>>(() => {
    try {
        return JSON.parse(DEFAULT_VARIABLES_JSON);
    } catch {
        return {};
    }
  });
  const [variableError, setVariableError] = useState<string | null>(null);
  
  const [functions, setFunctions] = useState<UserFunction[]>(DEFAULT_FUNCTIONS);

  // Image State
  const [hostImages, setHostImages] = useState<HostImage[]>(DEFAULT_HOST_IMAGES);

  // DB Connection & Execution State
  const [dbConnections, setDbConnections] = useState<DbConnection[]>(DEFAULT_DB_CONNECTIONS);
  const [activeConnectionId, setActiveConnectionId] = useState<string>('1');
  const [isDbExecuting, setIsDbExecuting] = useState(false);
  const [dbExecutionResult, setDbExecutionResult] = useState<string | null>(null);
  const executionTimeoutRef = useRef<number | null>(null);

  // Parse variables JSON whenever it changes (updates from user input)
  useEffect(() => {
    try {
      const parsed = JSON.parse(variablesJson);
      setVariablesObj(parsed);
      setVariableError(null);
    } catch (e) {
      setVariableError((e as Error).message);
    }
  }, [variablesJson]);

  const handleExecuteQuery = (query: string, connection: DbConnection) => {
      setIsDbExecuting(true);
      setDbExecutionResult(null);

      // Simulate network delay
      executionTimeoutRef.current = window.setTimeout(() => {
        const mockData = Array.from({ length: 5 }).map((_, i) => ({
            id: i + 1,
            user_id: variablesObj.user?.id || 'u_unknown',
            order_total: (Math.random() * 1000).toFixed(2),
            status: 'completed',
            created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString()
        }));
        
        setDbExecutionResult(JSON.stringify(mockData, null, 2));
        setIsDbExecuting(false);
      }, 2000);
  };

  const handleCancelQuery = () => {
      if (executionTimeoutRef.current) {
          window.clearTimeout(executionTimeoutRef.current);
          executionTimeoutRef.current = null;
      }
      setIsDbExecuting(false);
      setDbExecutionResult(null); // Optional: clear result or leave previous
  };

  // Image Handlers
  const handleAddImage = (img: HostImage) => {
      setHostImages(prev => [img, ...prev]);
  };

  const handleDeleteImage = (id: string) => {
      setHostImages(prev => prev.filter(img => img.id !== id));
  };

  // Clean up timeout on unmount
  useEffect(() => {
      return () => {
          if (executionTimeoutRef.current) {
              window.clearTimeout(executionTimeoutRef.current);
          }
      };
  }, []);

  // --- AI Assistance Handlers ---

  const handleJsonAssist = async (prompt: string): Promise<string> => {
    return generateJsonAssistResponse(prompt, jsonContent, variablesJson, functions);
  };

  const handleHtmlAssist = async (prompt: string): Promise<string> => {
    // Pass the current state of hostImages, not the default
    return generateHtmlAssistResponse(prompt, htmlContent, variablesJson, functions, hostImages);
  };

  const handleScriptAssist = async (prompt: string): Promise<string> => {
    return generateScriptAssistResponse(prompt, scriptContent, variablesJson, functions);
  };

  const handleSqlAssist = async (prompt: string): Promise<string> => {
    const activeConnection = dbConnections.find(c => c.id === activeConnectionId);
    return generateSqlAssistResponse(prompt, sqlContent, variablesJson, functions, activeConnection);
  };

  const handleXmlAssist = async (prompt: string): Promise<string> => {
    return generateXmlAssistResponse(prompt, xmlContent, variablesJson, functions);
  };

  // Common props for all editors
  const commonProps = {
    variables: variablesObj,
    variablesJson,
    onVariablesChange: setVariablesJson,
    variableError,
    functions,
    onFunctionsChange: setFunctions
  };

  const renderActiveEditor = () => {
    switch (activeEditor) {
      case EditorType.JSON_REST:
        return (
          <JsonEditor 
            content={jsonContent}
            onChange={setJsonContent}
            onAiAssist={handleJsonAssist}
            {...commonProps}
          />
        );
      case EditorType.EMAIL_HTML:
        return (
          <HtmlEditor 
            content={htmlContent}
            onChange={setHtmlContent}
            emailBlockGroups={DEFAULT_EMAIL_SNIPPET_GROUPS}
            hostImages={hostImages}
            onAddImage={handleAddImage}
            onDeleteImage={handleDeleteImage}
            onAiAssist={handleHtmlAssist}
            {...commonProps}
          />
        );
      case EditorType.SCRIPT_JS:
        return (
          <ScriptEditor 
            content={scriptContent}
            onChange={setScriptContent}
            onAiAssist={handleScriptAssist}
            {...commonProps}
          />
        );
      case EditorType.DB_QUERY:
        return (
            <DbQueryEditor
                content={sqlContent}
                onChange={setSqlContent}
                connections={dbConnections}
                activeConnectionId={activeConnectionId}
                onActiveConnectionChange={setActiveConnectionId}
                onUpdateConnections={setDbConnections}
                onExecuteQuery={handleExecuteQuery}
                isExecuting={isDbExecuting}
                executionResult={dbExecutionResult}
                onCancelQuery={handleCancelQuery}
                sqlLibrary={DEFAULT_SQL_DIALECT_DATA}
                onAiAssist={handleSqlAssist}
                {...commonProps}
            />
        );
      case EditorType.XML_TEMPLATE:
        return (
          <XmlEditor 
            content={xmlContent}
            onChange={setXmlContent}
            xmlBlockGroups={DEFAULT_XML_SNIPPET_GROUPS}
            onAiAssist={handleXmlAssist}
            {...commonProps}
          />
        );
      default:
        return <div>Select an editor</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-600 overflow-hidden">
      
      {/* Top Header & Navigation */}
      <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 text-teal-600 font-bold text-lg">
             <Leaf size={24} />
             <span>DevForge</span>
          </div>

          {/* Navigation Pills */}
          <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
             <NavPill 
               active={activeEditor === EditorType.JSON_REST}
               onClick={() => setActiveEditor(EditorType.JSON_REST)}
               icon={<FileJson size={16} />}
               label="JSON"
             />
             <NavPill 
               active={activeEditor === EditorType.EMAIL_HTML}
               onClick={() => setActiveEditor(EditorType.EMAIL_HTML)}
               icon={<Mail size={16} />}
               label="HTML Email"
             />
             <NavPill 
               active={activeEditor === EditorType.XML_TEMPLATE}
               onClick={() => setActiveEditor(EditorType.XML_TEMPLATE)}
               icon={<FileCode size={16} />}
               label="XML"
             />
             <NavPill 
               active={activeEditor === EditorType.SCRIPT_JS}
               onClick={() => setActiveEditor(EditorType.SCRIPT_JS)}
               icon={<Workflow size={16} />}
               label="Script"
             />
             <NavPill 
               active={activeEditor === EditorType.DB_QUERY}
               onClick={() => setActiveEditor(EditorType.DB_QUERY)}
               icon={<Database size={16} />}
               label="DB Query"
             />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
           <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings size={20} />
           </button>
           <div className="h-4 w-px bg-slate-200 mx-1"></div>
           <span className="text-xs font-mono text-slate-400">v2.1.0</span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden relative">
          {renderActiveEditor()}
      </div>

    </div>
  );
}

const NavPill = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
            ${active 
                ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
    >
        <span className={active ? 'text-teal-600' : 'text-slate-400'}>{icon}</span>
        {label}
    </button>
);