import React, { useState } from 'react';
import { VariableNode, EditorType } from '../../lib/types';
import { ChevronRight, ChevronDown, Braces, Box, Hash, Type, ToggleLeft, List, AlertCircle } from 'lucide-react';

interface Props {
  data: Record<string, any>;
  editorType?: EditorType;
  onInsert?: (text: string) => void;
}

const getType = (value: any): VariableNode['type'] => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value as VariableNode['type'];
};

const buildTree = (data: any, prefix = ''): VariableNode[] => {
  if (typeof data !== 'object' || data === null) return [];
  
  return Object.keys(data).map((key) => {
    const value = data[key];
    const path = prefix ? `${prefix}.${key}` : key;
    const type = getType(value);
    const node: VariableNode = { key, path, type, value };
    
    if (type === 'object' && value !== null) {
      node.children = buildTree(value, path);
    } else if (type === 'array' && value.length > 0) {
      if (typeof value[0] === 'object') {
         node.children = buildTree(value[0], `${path}.[0]`);
      }
    }
    return node;
  });
};

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'string': return <Type size={14} className="text-emerald-600" />;
    case 'number': return <Hash size={14} className="text-blue-600" />;
    case 'boolean': return <ToggleLeft size={14} className="text-amber-600" />;
    case 'array': return <List size={14} className="text-purple-600" />;
    case 'object': return <Braces size={14} className="text-slate-500" />;
    case 'null': return <Box size={14} className="text-slate-400" />;
    default: return <AlertCircle size={14} className="text-red-500" />;
  }
};

const TreeNode: React.FC<{ node: VariableNode; editorType?: EditorType; onInsert?: (text: string) => void }> = ({ node, editorType, onInsert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isExpandable = (node.type === 'object' || node.type === 'array') && node.children && node.children.length > 0;

  const getInsertText = () => {
    if (editorType === EditorType.SCRIPT_JS) {
        return `input.${node.path}`;
    } else {
        return `{{ ${node.path} }}`;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    const text = getInsertText();
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onInsert) {
          onInsert(getInsertText());
      }
  };

  return (
    <div className="pl-4 select-none">
      <div 
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-teal-50 group transition-colors`}
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        title={`Click or drag to insert: ${getInsertText()}`}
      >
        <div 
          onClick={(e) => {
             e.stopPropagation();
             setIsOpen(!isOpen);
          }}
          className={`p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 ${!isExpandable ? 'invisible' : ''}`}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        
        <TypeIcon type={node.type} />
        
        <span className="text-sm font-mono text-slate-700 font-medium group-hover:text-teal-900">
          {node.key}
        </span>
        
        {/* Helper text for value preview (truncated) */}
        {!isExpandable && (
             <span className="text-xs text-slate-400 truncate max-w-[80px]">
               {String(node.value)}
             </span>
        )}
      </div>
      
      {isOpen && node.children && (
        <div className="border-l border-slate-200 ml-2">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} editorType={editorType} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
};

export const VariableTree: React.FC<Props> = ({ data = {}, editorType, onInsert }) => {
  const tree = buildTree(data);

  return (
    <div className="h-full overflow-y-auto p-2">
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} editorType={editorType} onInsert={onInsert} />
      ))}
      {tree.length === 0 && (
         <p className="text-slate-400 text-sm p-4 italic text-center">No variables found in Test Data.</p>
      )}
    </div>
  );
};