'use client';

import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Sync incoming value to editor innerHTML
  useEffect(() => {
    if (editorRef.current) {
      if (isFirstRender.current || editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
        isFirstRender.current = false;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const format = (command: string, val: string = '') => {
    // Focus editor before applying formatting
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Enter link URL (e.g. https://google.com):');
    if (url) {
      format('createLink', url);
      // Highlight the link in blue with target _blank
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        const parent = selection.anchorNode.parentElement;
        if (parent && parent.tagName === 'A') {
          parent.setAttribute('target', '_blank');
          parent.setAttribute('style', 'color: #2563eb; text-decoration: underline;');
        }
      }
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-1 focus-within:ring-blue-500">
      {/* Mini Formatting Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => format('bold')}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => format('italic')}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <span className="w-[1px] h-4 bg-slate-300 mx-1"></span>
        <button
          type="button"
          onClick={() => format('insertUnorderedList')}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => format('insertOrderedList')}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        <span className="w-[1px] h-4 bg-slate-300 mx-1"></span>
        <button
          type="button"
          onClick={insertLink}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Insert Hyperlink"
        >
          <Link2 size={14} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 min-h-[140px] focus:outline-none prose prose-sm max-w-none prose-a:text-blue-600 prose-a:underline rich-editor"
        data-placeholder={placeholder}
        style={{ outline: 'none' }}
      />
    </div>
  );
}
