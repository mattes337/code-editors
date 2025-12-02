import React from 'react';

export enum EditorType {
  JSON_REST = 'JSON_REST',
  EMAIL_HTML = 'EMAIL_HTML',
  SCRIPT_JS = 'SCRIPT_JS',
  DB_QUERY = 'DB_QUERY',
  XML_TEMPLATE = 'XML_TEMPLATE',
  REST_API = 'REST_API'
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

// -- REST Editor Definitions --
export type RestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface RestParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'apiKey';
  username?: string;
  password?: string;
  token?: string;
  apiKeyKey?: string;
  apiKeyValue?: string;
  apiKeyIn?: 'header' | 'query';
}

export interface NamedAuthConfig extends AuthConfig {
  id: string;
  name: string;
}

export interface RestRequest {
  id: string;
  name: string;
  meta?: { origin: 'swagger' | 'custom', sourceId?: string, operationId?: string };
  method: RestMethod;
  url: string;
  pathParams: RestParam[];
  params: RestParam[];
  headers: RestParam[];
  auth: AuthConfig;
  bodyType: 'none' | 'json' | 'xml' | 'text';
  body: string;
}

export interface RestResponse {
  status: number;
  statusText: string;
  time: number;
  size: number;
  headers: Record<string, string>;
  data: string;
  timestamp: number;
}

export interface ApiSource {
  id: string;
  name: string;
  baseUrl: string;
  specUrl?: string;
  spec?: any;
  lastFetched: number;
}