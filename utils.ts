import { UserFunction } from './types';
import Handlebars from 'handlebars';

// Register user functions as Handlebars helpers
const registerHelpers = (functions: UserFunction[]) => {
  // Built-in Helper: uppercase
  Handlebars.registerHelper('uppercase', (str) => {
    return String(str || '').toUpperCase();
  });

  // Built-in Helper: func (Executes a user-defined function by name)
  Handlebars.registerHelper('func', function(name, ...args) {
      // The last argument is the Handlebars options object
      const options = args.pop();
      
      const funcDef = functions.find(f => f.name === name);
      if (!funcDef) {
          return `[Function '${name}' not found]`;
      }

      try {
          // Create a real JS function from the definition
          // eslint-disable-next-line no-new-func
          const jsFunc = new Function(...funcDef.params, funcDef.body);
          return jsFunc(...args);
      } catch (e: any) {
          return `[Error in '${name}': ${e.message}]`;
      }
  });

  // Also register direct helpers for convenience {{myFunc arg1}}
  functions.forEach(func => {
    try {
      // eslint-disable-next-line no-new-func
      const jsFunc = new Function(...func.params, func.body);
      Handlebars.registerHelper(func.name, jsFunc);
    } catch (e) {
      console.error(`Failed to register helper ${func.name}`, e);
    }
  });
};

/**
 * Pre-processes the template to support custom syntax:
 * {{#func:myFunc(x, y, z)}} -> {{ func 'myFunc' x y z }}
 */
const preprocessTemplate = (template: string): string => {
    // Regex matches: {{#func:NAME(ARGS)}}
    return template.replace(/{{#func:([a-zA-Z0-9_]+)\((.*?)\)}}/g, (match, name, argsString) => {
        // We need to convert comma-separated args to space-separated for Handlebars
        // We carefully replace commas only if they are NOT inside quotes
        const args = argsString.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ');
        return `{{ func '${name}' ${args} }}`;
    });
};

export const interpolateString = (template: string, context: Record<string, any>, functions: UserFunction[]): string => {
  try {
    registerHelpers(functions);
    const preprocessed = preprocessTemplate(template);
    const compiled = Handlebars.compile(preprocessed);
    return compiled(context);
  } catch (e: any) {
    throw new Error(`Template Error: ${e.message}`);
  }
};

// Execute a single script string
export const executeScript = (
  code: string, 
  context: Record<string, any>,
  functions: UserFunction[]
): { logs: string[], finalContext: Record<string, any>, error?: string } => {
  
  const logs: string[] = [];
  const runningContext = JSON.parse(JSON.stringify(context));

  // Build function declarations string
  const funcDecls = functions.map(f => {
    return `function ${f.name}(${f.params.join(', ')}) { ${f.body} }`;
  }).join('\n');

  const logFn = (msg: any) => {
    logs.push(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
  };

  try {
    // Create a function that wraps the user code with access to context and helper functions
    const runCode = new Function(
      'ctx', 
      'log',
      `
      "use strict";
      ${funcDecls}
      
      // User Code Start
      ${code}
      // User Code End
      `
    );

    runCode(runningContext, logFn);
  } catch (e: any) {
    return { logs, finalContext: runningContext, error: e.message };
  }

  return { logs, finalContext: runningContext };
};