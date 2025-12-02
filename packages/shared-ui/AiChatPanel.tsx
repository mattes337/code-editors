import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface AiChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onApplyCode?: (code: string) => void;
  isLoading: boolean;
}

// Helper to parse markdown
interface MessagePart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

const parseMessage = (text: string): MessagePart[] => {
  const parts: MessagePart[] = [];
  // Regex for code blocks: ```lang ... ```
  // Supports multiline content
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'text', content: match[2].trim() });
    lastIndex = codeBlockRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  return parts;
};

export const AiChatPanel: React.FC<AiChatPanelProps> = ({ messages, onSendMessage, onApplyCode, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const msg = input;
    setInput('');
    await onSendMessage(msg);
  };

  const handleApply = (code: string) => {
    if (onApplyCode) {
        onApplyCode(code);
    }
  };

  const renderMessageContent = (text: string, isUser: boolean) => {
      const parts = parseMessage(text);
      
      if (parts.length === 1 && parts[0].type === 'text') {
          return <div className="whitespace-pre-wrap">{parts[0].content}</div>;
      }

      return (
          <div className="flex flex-col gap-3">
              {parts.map((part, i) => (
                  part.type === 'text' ? (
                      <div key={i} className="whitespace-pre-wrap">{part.content}</div>
                  ) : (
                      <div key={i} className="bg-slate-800 rounded-lg overflow-hidden my-1 border border-slate-700 shadow-sm">
                          <div className="flex justify-between items-center px-3 py-1.5 bg-slate-900 border-b border-slate-700">
                              <span className="text-[10px] uppercase text-slate-400 font-mono tracking-wider">{part.language || 'Code'}</span>
                              <div className="flex items-center gap-1">
                                  {onApplyCode && (
                                    <button 
                                        onClick={() => handleApply(part.content)}
                                        className="text-teal-400 hover:text-white hover:bg-teal-600/30 p-1 rounded transition-colors text-[10px] flex items-center gap-1 font-medium"
                                        title="Overwrite editor content"
                                    >
                                        <RefreshCw size={12} /> Replace
                                    </button>
                                  )}
                              </div>
                          </div>
                          <pre className="p-3 text-xs font-mono text-slate-300 overflow-x-auto custom-scrollbar">
                              <code>{part.content}</code>
                          </pre>
                      </div>
                  )
              ))}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
      <div className="px-4 py-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider shadow-sm z-10 flex items-center gap-2">
        <Sparkles size={14} className="text-teal-600" />
        <span>AI Assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center p-6 text-slate-400 text-sm italic">
            <Bot size={32} className="mx-auto mb-2 opacity-50" />
            <p>Ask me to generate code, explain snippets, or help with debugging.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`rounded-2xl px-4 py-3 text-sm max-w-[90%] shadow-sm border overflow-hidden ${isUser ? 'bg-teal-600 text-white border-teal-600 rounded-tr-none' : 'bg-white text-slate-700 border-slate-200 rounded-tl-none'}`}>
                  {renderMessageContent(msg.text, isUser)}
                </div>
              </div>
            );
        })}

        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
             </div>
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-teal-600" />
                <span className="text-xs text-slate-500 font-medium">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI..."
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 text-slate-800 placeholder-slate-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg transition-colors shadow-sm disabled:shadow-none"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};