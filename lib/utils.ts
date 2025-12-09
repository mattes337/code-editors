import { UserFunction } from './types';
import Handlebars from 'handlebars';
import yaml from 'js-yaml';

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

  // New Format Dumping Helpers
  Handlebars.registerHelper('toJsonString', (value) => {
      try {
          return new Handlebars.SafeString(JSON.stringify(value, null, 2));
      } catch (e) {
          return String(value);
      }
  });

  Handlebars.registerHelper('toYamlString', (value) => {
      try {
          return new Handlebars.SafeString(yaml.dump(value));
      } catch (e) {
          return String(value);
      }
  });

  Handlebars.registerHelper('toHtmlDump', (value) => {
      try {
          const json = JSON.stringify(value, null, 2);
          return new Handlebars.SafeString(`<pre class="bg-slate-50 p-2 rounded text-xs font-mono border border-slate-200 overflow-auto max-h-64 whitespace-pre-wrap break-all">${json}</pre>`);
      } catch (e) {
          return String(value);
      }
  });

  Handlebars.registerHelper('toXmlString', (value) => {
    const toXml = (obj: any): string => {
        if (obj === null || obj === undefined) return '';
        
        if (Array.isArray(obj)) {
            return obj.map(item => `<item>${toXml(item)}</item>`).join('');
        }
        
        if (typeof obj === 'object') {
            return Object.entries(obj).map(([key, val]) => {
                if (Array.isArray(val)) {
                    return val.map(item => `<${key}>${toXml(item)}</${key}>`).join('');
                } else if (typeof val === 'object' && val !== null) {
                     return `<${key}>${toXml(val)}</${key}>`;
                } else {
                     return `<${key}>${val}</${key}>`;
                }
            }).join('');
        }
        return String(obj);
    };

    try {
        return new Handlebars.SafeString(toXml(value));
    } catch (e) {
        return String(value);
    }
  });

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
  if (Array.isArray(functions)) {
    functions.forEach(func => {
      try {
        // eslint-disable-next-line no-new-func
        const jsFunc = new Function(...func.params, func.body);
        Handlebars.registerHelper(func.name, jsFunc as any);
      } catch (e) {
        console.error(`Failed to register helper ${func.name}`, e);
      }
    });
  }
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
  input: Record<string, any>,
  functions: UserFunction[]
): { logs: string[], result: any, error?: string } => {
  
  const logs: string[] = [];
  const inputData = JSON.parse(JSON.stringify(input));

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
      'input', 
      'log',
      `
      "use strict";
      ${funcDecls}
      
      // User Code Start
      ${code}
      // User Code End
      `
    );

    const result = runCode(inputData, logFn);
    return { logs, result };
  } catch (e: any) {
    return { logs, result: undefined, error: e.message };
  }
};

// Insert text into a native HTML input/textarea at cursor position
// Dispatches proper events for React controlled components to update
export const insertIntoNativeInput = (el: Element | null, text: string): boolean => {
  if (!el) return false;
  
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    // Fix for Monaco Editor: Do not treat its hidden input area as a standard input
    // Modifying this textarea corrupts Monaco's internal buffer logic
    if (el.classList.contains('inputarea')) {
        return false;
    }

    const input = el as HTMLInputElement | HTMLTextAreaElement;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const value = input.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    // Call native setter to bypass React's property hijacking
    const prototype = Object.getPrototypeOf(input);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    
    if (prototypeValueSetter) {
        prototypeValueSetter.call(input, newValue);
    } else {
        input.value = newValue;
    }
    
    // Dispatch input event so React sees the change
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Restore cursor position
    const newPos = start + text.length;
    input.focus();
    input.setSelectionRange(newPos, newPos);
    
    return true;
  }
  return false;
};