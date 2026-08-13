'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, language, readOnly = false }: CodeEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleEditorChange = (val: string | undefined) => {
    if (onChange) {
      onChange(val || '');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Map database language names to Monaco editor identifiers
  const getMonacoLanguage = (lang: string | null | undefined) => {
    if (!lang) return 'javascript';
    const l = lang.toLowerCase();
    if (l === 'react' || l === 'jsx') return 'javascript';
    if (l === 'ts' || l === 'typescript') return 'typescript';
    return l;
  };

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 shadow-md">
      {/* Editor Titlebar */}
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold ml-2">
            snippet.{getMonacoLanguage(language) === 'typescript' ? 'ts' : getMonacoLanguage(language) === 'html' ? 'html' : getMonacoLanguage(language) === 'css' ? 'css' : 'js'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold py-0.5 px-2 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
          
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600">
            {readOnly ? 'Read Only' : 'Editable'}
          </span>
        </div>
      </div>

      {/* Editor Viewport */}
      <div className="p-1 pt-3">
        <Editor
          height="240px"
          language={getMonacoLanguage(language)}
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            readOnly: readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "var(--font-geist-mono), Courier New, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            cursorBlinking: 'blink',
            cursorStyle: 'line',
            selectionHighlight: true,
            renderLineHighlight: 'all',
            scrollbar: { vertical: 'visible', horizontal: 'auto' },
            tabSize: 2,
            insertSpaces: true
          }}
        />
      </div>
    </div>
  );
}
