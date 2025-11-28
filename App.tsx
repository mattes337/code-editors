import React, { useState, useEffect, useRef } from 'react';
import { EditorType, UserFunction, DbConnection } from './types';
import { JsonEditor } from './editors/JsonEditor';
import { HtmlEditor } from './editors/HtmlEditor';
import { ScriptEditor } from './editors/ScriptNodeEditor';
import { DbQueryEditor } from './editors/DbQueryEditor';
import { FileJson, Mail, Workflow, Leaf, Settings, Database } from 'lucide-react';

const DEFAULT_VARIABLES_JSON = `{
  "meta": {
    "requestId": "req_init_001",
    "timestamp": "2024-03-20T14:30:00Z",
    "environment": "production"
  },
  "user": {
    "id": "u_8823",
    "name": "Alex Rivera",
    "email": "alex.rivera@example.com",
    "isActive": true,
    "roles": ["admin", "reviewer"],
    "preferences": {
        "notifications": true,
        "theme": "dark"
    }
  },
  "order": {
    "id": "ord_2024_001",
    "currency": "USD",
    "total": 245.50,
    "shippingAddress": "123 Tech Blvd, Silicon Valley, CA",
    "items": [
        { "sku": "MK-850", "qty": 1, "price": 120.00 },
        { "sku": "USB-C-HUB", "qty": 2, "price": 45.00 },
        { "sku": "WIFI-6E", "qty": 1, "price": 35.50 }
    ]
  }
}`;

const DEFAULT_JSON_CONTENT = `{
  "meta": {
    "requestId": "{{#func:generateReqId()}}",
    "timestamp": "{{ meta.timestamp }}",
    "apiVersion": "v2",
    "isProduction": {{#func:isProduction(meta.environment)}}
  },
  "userInfo": {
    "id": "{{ user.id }}",
    "displayName": "{{ user.name }}",
    "email": "{{ user.email }}",
    "status": "{{#if user.isActive}}Active{{else}}Inactive{{/if}}",
    "roles": [
      {{#each user.roles}}
      "{{ uppercase this }}"{{#unless @last}},{{/unless}}
      {{/each}}
    ],
    "preferences": {
      {{#each user.preferences}}
      "{{ @key }}": "{{ this }}"{{#unless @last}},{{/unless}}
      {{/each}}
    }
  },
  "order": {
    "id": "{{ order.id }}",
    "currency": "{{ order.currency }}",
    "shipping": {
      "method": "{{#if order.shippingAddress}}Delivery{{else}}Pickup{{/if}}",
      "address": "{{#if order.shippingAddress}}{{ order.shippingAddress }}{{else}}N/A{{/if}}"
    },
    "items": [
      {{#each order.items}}
      {
        "sku": "{{ this.sku }}",
        "qty": {{ this.qty }},
        "unitPrice": {{ this.price }},
        "lineTotal": {{#func:calcLineTotal(this.qty, this.price)}},
        "highValue": {{#func:isHighValue(this.qty, this.price)}}
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ],
    "totals": {
      "subtotal": {{ order.total }},
      "tax": {{#func:calcTax(order.total)}},
      "grandTotal": {{#func:calcGrandTotal(order.total)}},
      "formatted": "{{#func:formatCurrency(order.total, order.currency)}}"
    }
  }
}`;

const DEFAULT_HTML_CONTENT = `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="background: white; padding: 20px; border-radius: 8px;">
    <h1 style="color: #333;">Welcome, {{ user.name }}!</h1>
    
    {{#if user.preferences.notifications}}
      <div style="background: #e0f2fe; color: #0369a1; padding: 10px; border-radius: 4px; margin: 10px 0;">
        You have notifications enabled.
      </div>
    {{/if}}

    <p>Your ID is: <strong>{{ user.id }}</strong></p>
    <p>Registration Date: {{#func:formatDate(1672531200000)}}</p>
    <p>Tax on 100: {{#func:calcTax(100)}}</p>

    <a href="https://example.com/login?uid={{ user.id }}" style="display: inline-block; background: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px;">
      Get Started
    </a>
  </div>
</body>
</html>`;

const DEFAULT_SCRIPT_CONTENT = `// Access variables via 'ctx'
// Use 'log(msg)' to print to console
// User functions are available globally

log("Starting script execution...");
ctx.timestamp = Date.now();

if (ctx.user && ctx.user.id) {
    const tax = calcTax(100);
    log("Calculated Tax for user: " + tax);
    ctx.lastCalculatedTax = tax;
}

log("Script finished.");`;

const DEFAULT_SQL_CONTENT = `-- Select orders for the current user
SELECT 
    o.id, 
    o.total, 
    o.created_at
FROM orders o
WHERE 
    o.user_id = '{{ user.id }}' 
    AND o.status = 'active';`;

export default function App() {
  // Global Store State
  const [activeEditor, setActiveEditor] = useState<EditorType>(EditorType.JSON_REST);
  
  // Content State
  const [jsonContent, setJsonContent] = useState(DEFAULT_JSON_CONTENT);
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML_CONTENT);
  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT_CONTENT);
  const [sqlContent, setSqlContent] = useState(DEFAULT_SQL_CONTENT);

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
  
  const [functions, setFunctions] = useState<UserFunction[]>([
    { id: '1', name: 'formatDate', params: ['ts'], body: 'return new Date(ts).toISOString().split("T")[0];' },
    { id: '2', name: 'calcTax', params: ['amount'], body: 'return (Number(amount) * 0.1).toFixed(2);' },
    { id: '3', name: 'formatCurrency', params: ['amount', 'currency'], body: 'return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);' },
    { id: '4', name: 'generateReqId', params: [], body: "return 'req_' + Math.random().toString(36).substr(2, 9);" },
    { id: '5', name: 'isProduction', params: ['env'], body: "return env === 'production';" },
    { id: '6', name: 'calcLineTotal', params: ['qty', 'price'], body: "return (Number(qty) * Number(price)).toFixed(2);" },
    { id: '7', name: 'isHighValue', params: ['qty', 'price'], body: "return (Number(qty) * Number(price)) > 60;" },
    { id: '8', name: 'calcGrandTotal', params: ['total'], body: "return (Number(total) * 1.1).toFixed(2);" }
  ]);

  // DB Connection & Execution State
  const [dbConnections, setDbConnections] = useState<DbConnection[]>([
    { id: '1', name: 'Main Postgres', dialect: 'postgres', connectionString: 'postgres://admin:pass@localhost:5432/main_db' },
    { id: '2', name: 'Legacy MySQL', dialect: 'mysql', connectionString: 'mysql://root:root@192.168.1.50:3306/legacy' }
  ]);
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

  // Clean up timeout on unmount
  useEffect(() => {
      return () => {
          if (executionTimeoutRef.current) {
              window.clearTimeout(executionTimeoutRef.current);
          }
      };
  }, []);

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
            {...commonProps}
          />
        );
      case EditorType.EMAIL_HTML:
        return (
          <HtmlEditor 
            content={htmlContent}
            onChange={setHtmlContent}
            {...commonProps}
          />
        );
      case EditorType.SCRIPT_JS:
        return (
          <ScriptEditor 
            content={scriptContent}
            onChange={setScriptContent}
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