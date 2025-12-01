import React from 'react';
import { 
  Layout, Type, Columns, PanelRight, Minus, EyeOff, Image, Globe, 
  MousePointerClick, List, PlayCircle, Share2, FileText,
  FileCode, Settings, Database, Server, Box, GitBranch
} from 'lucide-react';
import { EmailSnippetGroup, SqlLibrary, SqlGroup, XmlSnippetGroup } from './types';

// --- Email Snippet Defaults ---

export const DEFAULT_EMAIL_SNIPPET_GROUPS: EmailSnippetGroup[] = [
  {
    id: 'structural',
    title: 'Structural & Layout',
    snippets: [
      {
        name: 'Single Column',
        description: 'Basic full-width text container',
        icon: <Type size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding: 20px; font-family: sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
      <h1 style="margin: 0 0 10px 0;">Hello, World!</h1>
      <p style="margin: 0;">This is a single column of text. It spans the full width of the container.</p>
    </td>
  </tr>
</table>`
      },
      {
        name: '50/50 Split',
        description: 'Two columns that stack on mobile',
        icon: <Columns size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding: 10px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="48%" align="left" style="min-width: 280px;">
        <tr>
          <td style="padding: 10px; background-color: #f0f0f0;">
             <p style="margin:0;">Left Column Content</p>
          </td>
        </tr>
      </table>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="48%" align="right" style="min-width: 280px;">
        <tr>
          <td style="padding: 10px; background-color: #e0e0e0;">
             <p style="margin:0;">Right Column Content</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
      },
      {
        name: 'Sidebar Layout',
        description: '1/3 Image + 2/3 Text',
        icon: <PanelRight size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding: 10px; font-family: sans-serif;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="180" align="left">
        <tr>
          <td valign="top" style="padding-right: 20px;">
            <img src="https://placehold.co/160" alt="Image" width="160" style="display: block; width: 100%; max-width: 160px;">
          </td>
        </tr>
      </table>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 400px;" align="left">
        <tr>
          <td valign="top">
            <h3 style="margin: 0 0 10px 0;">Article Title</h3>
            <p style="margin: 0;">Here is a summary of the article. It sits next to the image on desktop and stacks under it on mobile.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
      },
      {
        name: 'Spacer / Divider',
        description: 'Vertical whitespace with optional line',
        icon: <Minus size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td height="30" style="font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="border-top: 1px solid #dddddd; font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
   <tr>
    <td height="30" style="font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
</table>`
      }
    ]
  },
  {
    id: 'hero',
    title: 'Hero & Header',
    snippets: [
      {
        name: 'Preheader (Hidden)',
        description: 'Inbox preview text',
        icon: <EyeOff size={16} />,
        content: `<div style="display: none; max-height: 0px; overflow: hidden;">
  Insert your catchy preview text here. This entices the user to open the email...
</div>
<div style="display: none; max-height: 0px; overflow: hidden;">
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>`
      },
      {
        name: 'Hero Image',
        description: 'Full width banner',
        icon: <Image size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center">
      <img src="https://placehold.co/600x300" alt="Banner" width="600" style="display: block; width: 100%; max-width: 100%; height: auto; border: 0;">
    </td>
  </tr>
</table>`
      },
      {
        name: 'View in Browser',
        description: 'Header link fallback',
        icon: <Globe size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 10px; font-family: sans-serif; font-size: 12px; color: #999999;">
      Having trouble viewing this email? <a href="#" style="color: #999999; text-decoration: underline;">View it in your browser</a>.
    </td>
  </tr>
</table>`
      }
    ]
  },
  {
    id: 'content',
    title: 'Content Blocks',
    snippets: [
      {
        name: 'Bulletproof Button',
        description: 'CTA that works without images',
        icon: <MousePointerClick size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" bgcolor="#007bff" style="border-radius: 4px;">
            <a href="https://example.com" target="_blank" style="padding: 15px 25px; border: 1px solid #007bff; border-radius: 4px; font-family: sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; display: inline-block; font-weight: bold;">
              Call to Action
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
      },
      {
        name: 'Icon List',
        description: 'Feature list with icons',
        icon: <List size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td width="40" valign="top" style="padding: 10px 0;">
      <img src="https://placehold.co/24" alt="Check" width="24" style="display: block;">
    </td>
    <td valign="top" style="padding: 10px; font-family: sans-serif; font-size: 14px; color: #333333;">
      <strong>Feature One:</strong> Description of the feature goes here. It helps explain the value.
    </td>
  </tr>
    <tr>
    <td width="40" valign="top" style="padding: 10px 0;">
      <img src="https://placehold.co/24" alt="Check" width="24" style="display: block;">
    </td>
    <td valign="top" style="padding: 10px; font-family: sans-serif; font-size: 14px; color: #333333;">
      <strong>Feature Two:</strong> Description of the second feature goes here.
    </td>
  </tr>
</table>`
      },
      {
        name: 'Video Thumbnail',
        description: 'Image with play button overlay',
        icon: <PlayCircle size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px;">
      <a href="https://youtube.com/watch?v=xyz" target="_blank">
        <img src="https://placehold.co/600x338?text=Play+Video" alt="Watch Video" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
      </a>
    </td>
  </tr>
</table>`
      }
    ]
  },
  {
    id: 'footer',
    title: 'Footer & Legal',
    snippets: [
      {
        name: 'Social Media Row',
        description: 'Row of social icons',
        icon: <Share2 size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px;">
      <a href="#" style="text-decoration: none; margin: 0 10px;">
        <img src="https://placehold.co/32?text=FB" alt="Facebook" width="32" style="display: inline-block; border: 0;">
      </a>
      <a href="#" style="text-decoration: none; margin: 0 10px;">
        <img src="https://placehold.co/32?text=TW" alt="Twitter" width="32" style="display: inline-block; border: 0;">
      </a>
      <a href="#" style="text-decoration: none; margin: 0 10px;">
        <img src="https://placehold.co/32?text=IG" alt="Instagram" width="32" style="display: inline-block; border: 0;">
      </a>
    </td>
  </tr>
</table>`
      },
      {
        name: 'Legal Footer',
        description: 'Address and unsubscribe links',
        icon: <FileText size={16} />,
        content: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px; background-color: #eeeeee; font-family: sans-serif; font-size: 12px; color: #666666;">
      <p style="margin: 0 0 10px 0;">&copy; 2024 Your Company Name. All rights reserved.</p>
      <p style="margin: 0 0 10px 0;">123 Business Rd, Tech City, TC 90210</p>
      <p style="margin: 0;">
        <a href="#" style="color: #666666; text-decoration: underline;">Unsubscribe</a> | 
        <a href="#" style="color: #666666; text-decoration: underline;">Manage Preferences</a>
      </p>
    </td>
  </tr>
</table>`
      }
    ]
  }
];

// --- XML Snippet Defaults ---

export const DEFAULT_XML_SNIPPET_GROUPS: XmlSnippetGroup[] = [
    {
        id: 'config',
        title: 'Configuration',
        snippets: [
            {
                name: 'Config Root',
                description: 'Root configuration element',
                icon: <Settings size={16} />,
                content: `<configuration version="1.0">
  <settings>
    <!-- Settings go here -->
  </settings>
</configuration>`
            },
            {
                name: 'Key-Value Pair',
                description: 'Generic property setting',
                icon: <List size={16} />,
                content: `<property name="key">value</property>`
            },
            {
                name: 'Connection String',
                description: 'Database connection details',
                icon: <Database size={16} />,
                content: `<connection>
  <driver>postgres</driver>
  <host>localhost</host>
  <port>5432</port>
  <username>{{ user.name }}</username>
</connection>`
            }
        ]
    },
    {
        id: 'structures',
        title: 'Structures',
        snippets: [
            {
                name: 'Item List',
                description: 'Loop over items',
                icon: <List size={16} />,
                content: `<items>
  {{#each order.items}}
  <item sku="{{ this.sku }}">
    <qty>{{ this.qty }}</qty>
    <price>{{ this.price }}</price>
  </item>
  {{/each}}
</items>`
            },
            {
                name: 'User Profile',
                description: 'User data structure',
                icon: <FileCode size={16} />,
                content: `<user id="{{ user.id }}">
  <displayName>{{ user.name }}</displayName>
  <email>{{ user.email }}</email>
  <isActive>{{ user.isActive }}</isActive>
</user>`
            },
            {
                name: 'SOAP Envelope',
                description: 'Basic SOAP structure',
                icon: <Box size={16} />,
                content: `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header/>
  <soap:Body>
    <!-- Request Data -->
  </soap:Body>
</soap:Envelope>`
            }
        ]
    },
    {
        id: 'logic',
        title: 'Logic Blocks',
        snippets: [
            {
                name: 'Conditional',
                description: 'If statement',
                icon: <GitBranch size={16} />,
                content: `{{#if condition}}
  <enabled>true</enabled>
{{else}}
  <enabled>false</enabled>
{{/if}}`
            },
            {
                name: 'Server Info',
                description: 'Environment details',
                icon: <Server size={16} />,
                content: `<server>
  <env>{{ meta.environment }}</env>
  <timestamp>{{ meta.timestamp }}</timestamp>
</server>`
            }
        ]
    }
];

// --- SQL Function Defaults ---

export const DEFAULT_SQL_COMMON_GROUPS: SqlGroup[] = [
    {
        id: 'date',
        title: 'Date & Time',
        items: [
            { name: 'NOW()', desc: 'Current timestamp' },
            { name: 'CURRENT_DATE', desc: 'Today\'s date' },
            { name: 'EXTRACT(field FROM source)', desc: 'Get subfield from date' },
        ]
    },
    {
        id: 'aggr',
        title: 'Aggregates',
        items: [
            { name: 'COUNT(*)', desc: 'Count rows' },
            { name: 'SUM(col)', desc: 'Sum values' },
            { name: 'AVG(col)', desc: 'Average value' },
            { name: 'MAX(col)', desc: 'Maximum value' },
        ]
    }
];

export const DEFAULT_SQL_DIALECT_DATA: SqlLibrary = {
  postgres: [
    {
        id: 'basic',
        title: 'Basic Functions',
        items: [
            { name: 'COALESCE(val, default)', desc: 'Return first non-null' },
            { name: 'NULLIF(val1, val2)', desc: 'Return NULL if equal' },
            { name: 'GENERATE_SERIES(start, stop)', desc: 'Generate set of numbers' },
        ]
    },
    {
        id: 'json',
        title: 'JSON Processing',
        items: [
            { name: 'JSON_BUILD_OBJECT()', desc: 'Build JSON object' },
            { name: 'JSON_AGG()', desc: 'Aggregate to JSON array' },
            { name: 'row_to_json(row)', desc: 'Convert row to JSON' },
            { name: 'col ->> \'key\'', desc: 'Get JSON text value', value: "col ->> 'key'" },
        ]
    },
    ...DEFAULT_SQL_COMMON_GROUPS
  ],
  mysql: [
    {
        id: 'string',
        title: 'String Functions',
        items: [
            { name: 'CONCAT(str1, str2)', desc: 'Concatenate strings' },
            { name: 'GROUP_CONCAT(expr)', desc: 'Join group results' },
            { name: 'SUBSTRING(str, pos, len)', desc: 'Extract substring' },
        ]
    },
    {
        id: 'control',
        title: 'Control Flow',
        items: [
            { name: 'IFNULL(val, def)', desc: 'Null coalescing' },
            { name: 'IF(cond, true, false)', desc: 'Inline if' },
        ]
    },
    ...DEFAULT_SQL_COMMON_GROUPS
  ],
  mssql: [
      {
          id: 'tsql',
          title: 'T-SQL Specific',
          items: [
              { name: 'TOP(n)', desc: 'Limit rows' },
              { name: 'GETDATE()', desc: 'Current date/time' },
              { name: 'ISNULL(val, def)', desc: 'Null replacement' },
              { name: 'CROSS APPLY', desc: 'Join with function' },
          ]
      },
      ...DEFAULT_SQL_COMMON_GROUPS
  ],
  duckdb: [
      {
          id: 'io',
          title: 'Import / Export',
          items: [
              { name: "read_csv_auto('file.csv')", desc: 'Auto-detect CSV' },
              { name: "read_parquet('file.parquet')", desc: 'Read Parquet file' },
              { name: "read_json_auto('file.json')", desc: 'Read JSON file' },
              { name: "COPY tbl TO 'out.csv'", desc: 'Export to CSV' },
          ]
      },
      {
          id: 'structs',
          title: 'Nested Types',
          items: [
              { name: 'struct_pack(a := 1, b := 2)', desc: 'Create struct' },
              { name: 'list_value(1, 2, 3)', desc: 'Create list/array' },
              { name: 'unnest(list)', desc: 'Expand list to rows' },
              { name: 'list_extract(list, index)', desc: 'Get list item' },
          ]
      },
      {
          id: 'analysis',
          title: 'Data Analysis',
          items: [
              { name: 'bar(col, min, max)', desc: 'ASCII bar chart' },
              { name: 'histogram(col)', desc: 'Compute histogram' },
              { name: 'date_diff(\'day\', t1, t2)', desc: 'Difference between dates' },
          ]
      }
  ],
  seekdb: [
      {
          id: 'search',
          title: 'Vector Search',
          items: [
              { name: "SEARCH(col, 'text', k)", desc: 'Semantic Text Search' },
              { name: "MATCH(col, vector)", desc: 'Exact Vector Match' },
              { name: "RECOMMEND(user_id)", desc: 'Get recommendations' },
          ]
      },
      {
          id: 'distance',
          title: 'Distance Metrics',
          items: [
              { name: 'DISTANCE(v1, v2)', desc: 'Generic Distance' },
              { name: 'COSINE_DIST(v1, v2)', desc: 'Cosine Distance' },
              { name: 'L2_DIST(v1, v2)', desc: 'Euclidean Distance' },
              { name: 'DOT_PRODUCT(v1, v2)', desc: 'Dot Product' },
          ]
      },
      {
          id: 'templates',
          title: 'Templates',
          items: [
              { name: 'Create Index', desc: 'Create vector index', value: "CREATE INDEX idx_name ON table USING HNSW (embedding) WITH (M=16, efConstruction=64);" },
              { name: 'Insert Vector', desc: 'Insert with embedding', value: "INSERT INTO items (text, embedding) VALUES ('hello', [0.1, 0.2, 0.3]);" },
          ]
      }
  ],
  'postgres-vector': [
      {
          id: 'ops',
          title: 'Vector Operators',
          items: [
              { name: '<->', desc: 'Euclidean distance (L2)', value: 'vector_col <-> \'[1,2,3]\'' },
              { name: '<=>', desc: 'Cosine distance', value: 'vector_col <=> \'[1,2,3]\'' },
              { name: '<#>', desc: 'Inner product', value: 'vector_col <#> \'[1,2,3]\'' },
          ]
      },
      {
          id: 'funcs',
          title: 'Vector Functions',
          items: [
              { name: 'vector_dims(vec)', desc: 'Get dimensions count' },
              { name: 'vector_norm(vec)', desc: 'Get L2 norm' },
              { name: 'avg(vec)', desc: 'Calculate average vector' },
              { name: 'sum(vec)', desc: 'Calculate sum vector' },
          ]
      },
      {
          id: 'templates',
          title: 'Templates',
          items: [
              { name: 'Enable Extension', desc: 'Load pgvector', value: 'CREATE EXTENSION IF NOT EXISTS vector;' },
              { name: 'Create Table', desc: 'Table with vector col', value: "CREATE TABLE items (\n  id bigserial PRIMARY KEY,\n  embedding vector(3)\n);" },
              { name: 'Nearest Neighbor', desc: 'KNN Query', value: "SELECT * FROM items ORDER BY embedding <-> '[1,2,3]' LIMIT 5;" },
          ]
      },
      ...DEFAULT_SQL_COMMON_GROUPS
  ]
};