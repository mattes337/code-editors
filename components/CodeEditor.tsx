import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  language: 'json' | 'html' | 'javascript' | 'sql';
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, language, onChange, readOnly = false }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

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
            // Artifact reported: {{ user.id \}}$0
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
        }}
      />
    </div>
  );
};
