import React from 'react';

export enum EditorType {
  JSON_REST = 'JSON_REST',
  EMAIL_HTML = 'EMAIL_HTML',
  SCRIPT_JS = 'SCRIPT_JS',
  DB_QUERY = 'DB_QUERY',
  XML_TEMPLATE = 'XML_TEMPLATE'
}

export type SqlDialect = 'postgres' | 'mysql' | 'mssql' | 'duckdb' | 'seekdb' | 'postgres-vector';

export interface DbConnection {
  id: string;
  name: string;
  dialect: SqlDialect;
  connectionString: string;
}

export interface UserFunction {
  id: string;
  name: string;
  params: string[]; // e.g., ['a', 'b']
  body: string;
}

export interface AppState {
  variablesJson: string; // The JSON string for the context variables
  userFunctions: UserFunction[];
}

export interface VariableNode {
  key: string;
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  value: any;
  children?: VariableNode[];
}

// -- Email Tool Definitions --
export interface EmailSnippet {
  name: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

export interface EmailSnippetGroup {
  id: string;
  title: string;
  snippets: EmailSnippet[];
}

export interface HostImage {
  id: string;
  name: string;
  url: string; // http url or base64
}

// -- XML Tool Definitions --
export interface XmlSnippet {
  name: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

export interface XmlSnippetGroup {
  id: string;
  title: string;
  snippets: XmlSnippet[];
}

// -- SQL Tool Definitions --
export interface SqlItem {
    name: string;
    desc: string;
    value?: string; // The actual text to insert if different from name
}

export interface SqlGroup {
    id: string;
    title: string;
    items: SqlItem[];
}

export type SqlLibrary = Record<string, SqlGroup[]>;