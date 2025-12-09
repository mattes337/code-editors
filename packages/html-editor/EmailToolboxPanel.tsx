import React, { useState } from 'react';
import { 
  Layout, 
  ChevronDown,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { EmailSnippetGroup } from '../../lib/types';
import { DEFAULT_EMAIL_SNIPPET_GROUPS } from '../../lib/constants';

interface EmailToolboxPanelProps {
  snippetGroups?: EmailSnippetGroup[];
  onInsert?: (text: string) => void;
}

export const EmailToolboxPanel: React.FC<EmailToolboxPanelProps> = ({ 
  snippetGroups = DEFAULT_EMAIL_SNIPPET_GROUPS,
  onInsert
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Default open all
    const initial: Record<string, boolean> = {};
    snippetGroups.forEach(g => initial[g.id] = true);
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragStart = (e: React.DragEvent, content: string) => {
    e.dataTransfer.setData('text/plain', content);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (content: string) => {
    if (onInsert) {
        onInsert(content);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
      <div className="px-4 py-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider shadow-sm z-10 flex items-center gap-2">
        <Layout size={14} className="text-teal-600" />
        <span>Email Blocks</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 pb-20">
        <p className="text-[10px] text-slate-400 px-2 pb-3 pt-1">
          Click or drag these responsive HTML snippets into the editor.
        </p>

        {snippetGroups.map((group) => (
          <div key={group.id} className="mb-2">
            <div 
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-100 rounded text-slate-500 font-bold text-xs uppercase tracking-wide select-none transition-colors"
            >
              {openGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {group.title}
            </div>
            
            {openGroups[group.id] && (
              <div className="mt-1 space-y-1 pl-2">
                {group.snippets.map((snippet, idx) => (
                  <div 
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, snippet.content)}
                    onClick={() => handleClick(snippet.content)}
                    className="group flex items-center gap-3 p-2 bg-white rounded border border-slate-200 hover:border-teal-400 hover:shadow-sm cursor-pointer active:cursor-grabbing transition-all select-none"
                    title={snippet.description}
                  >
                    <div className="text-slate-400 group-hover:text-teal-500 transition-colors">
                      {snippet.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-xs text-slate-700">
                        {snippet.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {snippet.description}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 text-slate-300">
                      <GripVertical size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};