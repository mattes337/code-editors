export enum EditorType {
  JSON_REST = 'JSON_REST',
  EMAIL_HTML = 'EMAIL_HTML',
  SCRIPT_JS = 'SCRIPT_JS',
  DB_QUERY = 'DB_QUERY'
}

export type SqlDialect = 'postgres' | 'mysql' | 'mssql';

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