import { UserFunction, DbConnection, HostImage, AgentConfig, EmailMessageState, SmsMessageState } from './types';

export const DEFAULT_VARIABLES_JSON = `{
  "meta": {
    "requestId": "req_init_001",
    "timestamp": "2024-03-20T14:30:00Z",
    "environment": "production"
  },
  "user": {
    "id": "u_8823",
    "name": "Alex Rivera",
    "email": "alex.rivera@example.com",
    "phone": "+15550192834",
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

export const DEFAULT_JSON_CONTENT = `{
  "meta": {
    "requestId": "{{#func:generateReqId()}}",
    "timestamp": "{{ meta.timestamp }}"
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

export const DEFAULT_YAML_CONTENT = `meta:
  requestId: "{{#func:generateReqId()}}"
  timestamp: "{{ meta.timestamp }}"
  apiVersion: "v2"
  isProduction: {{#func:isProduction(meta.environment)}}

userInfo:
  id: "{{ user.id }}"
  displayName: "{{ user.name }}"
  email: "{{ user.email }}"
  roles:
    {{#each user.roles}}
    - "{{ uppercase this }}"
    {{/each}}
`;

export const DEFAULT_HTML_CONTENT = `<!DOCTYPE html>
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

export const DEFAULT_EMAIL_STATE: EmailMessageState = {
  html: DEFAULT_HTML_CONTENT,
  meta: {
    connectionId: '',
    to: '{{ user.email }}',
    from: 'noreply@company.com',
    subject: 'Welcome {{ user.name }}!',
    cc: '',
    bcc: '',
    replyTo: ''
  }
};

const SMS_BODY_CONTENT = `Hello {{ user.name }},

Your order #{{ order.id }} has been shipped!
Track it here: https://example.com/track/{{ order.id }}

Reply STOP to unsubscribe.`;

export const DEFAULT_SMS_STATE: SmsMessageState = {
  body: SMS_BODY_CONTENT,
  meta: {
    connectionId: '',
    to: '{{ user.phone }}',
    from: 'PromoBot'
  }
};

// Kept for backward compatibility if any, or used as raw string fallback
export const DEFAULT_SMS_CONTENT = SMS_BODY_CONTENT;

export const DEFAULT_SCRIPT_CONTENT = `// Access variables via 'input'
// Use 'log(msg)' to print to console
// Return a value to see the result

log("Starting script execution...");

const orderTotal = input.order ? input.order.total : 0;
let tax = 0;

if (orderTotal > 0) {
    tax = calcTax(orderTotal);
    log("Calculated Tax: " + tax);
}

// Return the calculated result
return {
    originalTotal: orderTotal,
    taxAmount: tax,
    grandTotal: Number(orderTotal) + Number(tax),
    processedAt: new Date().toISOString()
};`;

export const DEFAULT_SQL_CONTENT = `-- Select orders for the current user
SELECT 
    o.id, 
    o.total, 
    o.created_at
FROM orders o
WHERE 
    o.user_id = '{{ user.id }}' 
    AND o.status = 'active';`;

export const DEFAULT_XML_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <meta>
        <requestId>{{#func:generateReqId()}}</requestId>
        <timestamp>{{ meta.timestamp }}</timestamp>
    </meta>
    <user id="{{ user.id }}">
        <name>{{ user.name }}</name>
        <roles>
            {{#each user.roles}}
            <role>{{ this }}</role>
            {{/each}}
        </roles>
    </user>
</root>`;

export const DEFAULT_FUNCTIONS: UserFunction[] = [
    { id: '1', name: 'formatDate', params: ['ts'], body: 'return new Date(ts).toISOString().split("T")[0];' },
    { id: '2', name: 'calcTax', params: ['amount'], body: 'return (Number(amount) * 0.1).toFixed(2);' },
    { id: '3', name: 'formatCurrency', params: ['amount', 'currency'], body: 'return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);' },
    { id: '4', name: 'generateReqId', params: [], body: "return 'req_' + Math.random().toString(36).substr(2, 9);" },
    { id: '5', name: 'isProduction', params: ['env'], body: "return env === 'production';" },
    { id: '6', name: 'calcLineTotal', params: ['qty', 'price'], body: "return (Number(qty) * Number(price)).toFixed(2);" },
    { id: '7', name: 'isHighValue', params: ['qty', 'price'], body: "return (Number(qty) * Number(price)) > 60;" },
    { id: '8', name: 'calcGrandTotal', params: ['total'], body: "return (Number(total) * 1.1).toFixed(2);" }
];

export const DEFAULT_DB_CONNECTIONS: DbConnection[] = [
    { id: '1', name: 'Main Postgres', dialect: 'postgres', connectionString: 'postgres://admin:pass@localhost:5432/main_db' },
    { id: '2', name: 'Legacy MySQL', dialect: 'mysql', connectionString: 'mysql://root:root@192.168.1.50:3306/legacy' }
];

export const DEFAULT_HOST_IMAGES: HostImage[] = [
  { id: '1', name: 'Company Logo', url: 'https://placehold.co/200x50?text=Logo' },
  { id: '2', name: 'Promo Banner', url: 'https://placehold.co/600x200?text=Summer+Sale' },
  { id: '3', name: 'Product: Laptop', url: 'https://placehold.co/300x300?text=Laptop' },
  { id: '4', name: 'Product: Phone', url: 'https://placehold.co/300x300?text=Phone' },
  { id: '5', name: 'Facebook Icon', url: 'https://placehold.co/32x32?text=F' },
  { id: '6', name: 'Twitter Icon', url: 'https://placehold.co/32x32?text=T' },
  { id: '7', name: 'Instagram Icon', url: 'https://placehold.co/32x32?text=I' },
  { id: '8', name: 'LinkedIn Icon', url: 'https://placehold.co/32x32?text=L' }
];

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
    id: 'agent_default',
    name: 'New Agent',
    description: 'A helpful assistant.',
    agentType: 'conversational',
    provider: 'google',
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.95,
    jsonMode: false,
    mode: 'STANDARD',
    systemMessage: 'You are a helpful AI assistant.',
    userMessageInput: '{{ user.name }} says: Hello!',
    fewShotExamples: [],
    outputParser: 'TEXT',
    structuredOutputMethod: 'EXAMPLE',
    jsonSchemaDefinition: '{\n  "type": "object",\n  "properties": {\n    "response": { "type": "string" }\n  }\n}',
    structuredOutputExample: '{\n  "response": "Hello world"\n}',
    autoRepair: true,
    connectedTools: [],
    mcpServers: [],
    memoryBackend: 'NONE',
    sessionId: 'session_001',
    contextWindowLimit: 10
};