import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco loader to use jsdelivr for stable worker loading
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.46.0/min/vs',
  },
});

export interface CodeEditorRef {
  insertText: (text: string) => void;
  format: () => void;
}

interface CodeEditorProps {
  value: string;
  language: 'json' | 'html' | 'javascript' | 'sql' | 'xml' | 'handlebars' | 'text';
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

// Custom formatter for JSON mixed with Handlebars
// This avoids using the strict JSON formatter which breaks on {{ }} syntax
const formatHandlebarsJsonLines = (text: string): string => {
    const lines = text.split('\n');
    let indentLevel = 0;
    const indentSize = 2;
    
    return lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Detect dedent triggers at start of line
        // Matches: }, ], {{/..., {{else..., {{^...
        const isDedent = /^([}\]],?|\{\{\/|\{\{else|\{\{\^)/.test(trimmed);
        
        if (isDedent) {
            indentLevel = Math.max(0, indentLevel - 1);
        }
        
        const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;
        
        // Detect indent triggers for the NEXT line
        
        // 1. JSON Structural Openers: Ends with { or [
        if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
            indentLevel++;
        }
        
        // 2. Handlebars Block Openers: {{#... or {{^... 
        // But NOT if the block is closed on the same line (inline block)
        // e.g. {{#each x}}...{{/each}} should not increase indent
        const isHbBlockStart = /^\{\{\s*[#^]/.test(trimmed);
        const hasHbBlockEnd = /\{\{\s*\//.test(trimmed);
        
        if (isHbBlockStart && !hasHbBlockEnd) {
             indentLevel++;
        }
        
        // 3. Handlebars Control Flow: {{else}}
        // The 'else' line itself was dedented above, but the content following it should be indented
        if (/^\{\{\s*else/.test(trimmed)) {
            indentLevel++;
        }

        return indentedLine;
    }).join('\n');
};

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ value, language, onChange, readOnly = false }, ref) => {
  const editorRef = useRef<any>(null);

  const performFormat = async () => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      const text = model.getValue();

      // If it looks like a Handlebars template in JSON, use custom indentation formatter
      // This prevents the JSON formatter from destroying the template structure (e.g. adding extra braces)
      // and prevents breaking inline blocks by preserving existing line breaks.
      if (language === 'json' && text.includes('{{')) {
          const formatted = formatHandlebarsJsonLines(text);
          if (formatted !== text) {
             editorRef.current.setValue(formatted);
          }
          return;
      }

      // Run the standard formatter for valid JSON/JS/HTML
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
      
      // Standard post-processing cleanup (mostly for non-template JSON artifacts if any remain)
      // ... (Legacy cleanup kept just in case standard formatter runs)
    }
  };

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        const op = { range: selection, text: text, forceMoveMarkers: true };
        editorRef.current.executeEdits("insert-snippet", [op]);
        editorRef.current.focus();
      }
    },
    format: () => {
      performFormat();
    }
  }));

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Bind Ctrl+F to Format Document
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        performFormat();
    });

    // Define the custom theme matching our slate/teal palette
    monaco.editor.defineTheme('clean-slate', {
      base: 'vs', // light base
      inherit: true,
      rules: [
        { token: 'string.key', foreground: '0d9488' }, // teal-600
        { token: 'string.value', foreground: '475569' }, // slate-600
        { token: 'number', foreground: '7c3aed' }, // violet
        { token: 'keyword', foreground: '0f766e', fontStyle: 'bold' }, // teal-700
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f1f5f9', // slate-100
        'editorLineNumber.foreground': '#94a3b8', // slate-400
        'editor.selectionBackground': '#ccfbf1', // teal-100
        'editor.inactiveSelectionBackground': '#f0fdfa', // teal-50
      }
    });
    monaco.editor.setTheme('clean-slate');

    // Custom Drop Handler to fix snippet artifacts ($0)
    const container = editor.getContainerDomNode();
    
    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        // Move cursor to hover position to give visual feedback
        const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
        if (target && target.position) {
            editor.setPosition(target.position);
            editor.focus();
        }
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        const text = e.dataTransfer?.getData('text/plain');
        if (text) {
            // Sanitize text: remove snippet tabstops ($0) and fix escaped braces
            let cleanText = text;
            if (cleanText.endsWith('$0')) {
                cleanText = cleanText.substring(0, cleanText.length - 2);
            }
            cleanText = cleanText.replace(/\\}/g, '}');

            const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
            if (target && target.position) {
                const position = target.position;
                editor.executeEdits('dnd', [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: cleanText,
                    forceMoveMarkers: true
                }]);
            }
        }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
  };

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-300 shadow-sm focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 transition-colors">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          // Use full font stack to match CSS and ensure proper fallback
          fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
          fontLigatures: true,
          letterSpacing: 0,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          readOnly: readOnly,
          padding: { top: 16, bottom: 16 },
          wordWrap: 'on',
          automaticLayout: true,
          // Disable auto-formatting to prevent accidental breakage of Handlebars syntax
          formatOnPaste: false,
          formatOnType: false,
        }}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';