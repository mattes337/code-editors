import { UserFunction } from './types';
import Handlebars from 'handlebars';

// Register user functions as Handlebars helpers
const registerHelpers = (functions: UserFunction[]) => {
  // Built-in Helper: uppercase
  Handlebars.registerHelper('uppercase', (str) => {
    return String(str || '').toUpperCase();
  });

  // Array/String Helpers
  Handlebars.registerHelper('split', (str, separator) => {
    if (typeof str !== 'string') return [];
    return str.split(separator);
  });

  Handlebars.registerHelper('join', (arr, separator) => {
    if (!Array.isArray(arr)) return arr;
    return arr.join(separator);
  });

  Handlebars.registerHelper('first', (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr[0];
  });

  Handlebars.registerHelper('last', (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr[arr.length - 1];
  });

  // Logical Helpers
  Handlebars.registerHelper('eq', (a, b) => a == b);
  Handlebars.registerHelper('ne', (a, b) => a != b);
  Handlebars.registerHelper('lt', (a, b) => Number(a) < Number(b));
  Handlebars.registerHelper('gt', (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper('lte', (a, b) => Number(a) <= Number(b));
  Handlebars.registerHelper('gte', (a, b) => Number(a) >= Number(b));
  Handlebars.registerHelper('and', (...args) => Array.prototype.slice.call(args, 0, args.length - 1).every(Boolean));
  Handlebars.registerHelper('or', (...args) => Array.prototype.slice.call(args, 0, args.length - 1).some(Boolean));
  Handlebars.registerHelper('not', (val) => !val);

  // Built-in Helper: func (Executes a user-defined function by name)
  Handlebars.registerHelper('func', function(name, ...args) {
      // The last argument is the Handlebars options object
      const options = args.pop();
      
      const funcDef = functions.find(f => f.name === name);
      let result;

      if (!funcDef) {
          result = `[Function '${name}' not found]`;
      } else {
          try {
              // Create a real JS function from the definition
              // eslint-disable-next-line no-new-func
              const jsFunc = new Function(...funcDef.params, funcDef.body);
              result = jsFunc(...args);
          } catch (e: any) {
              result = `[Error in '${name}': ${e.message}]`;
          }
      }

      // If used as a block helper {{#func ...}} ... {{/func}}
      if (options && typeof options.fn === 'function') {
          if (result) {
              return options.fn(this);
          } else {
              return options.inverse(this);
          }
      }

      return result;
  });

  // Also register direct helpers for convenience {{myFunc arg1}}
  functions.forEach(func => {
    try {
      // eslint-disable-next-line no-new-func
      const jsFunc = new Function(...func.params, func.body);
      Handlebars.registerHelper(func.name, jsFunc as any);
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
    // Updated to be tolerant of whitespace/newlines which might be introduced by editors
    // Note: We deliberately strip the '#' to treating it as an inline helper expression
    return template.replace(/\{\{\s*#func:([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*\}\}/g, (match, name, argsString) => {
        // We need to convert comma-separated args to space-separated for Handlebars
        // First collapse any newlines in arguments to spaces to ensure clean processing
        const cleanArgs = argsString.replace(/[\r\n]+/g, ' ');
        // We carefully replace commas only if they are NOT inside quotes
        const args = cleanArgs.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ');
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