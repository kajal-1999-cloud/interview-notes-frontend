'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { 
  ArrowLeft, 
  Bold, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Save,
  CheckCircle,
  FileText,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

export default function NotesPage() {
  const { isAuthenticated, loading: authLoading, apiFetch } = useAuth();
  const router = useRouter();

  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('Personal Study Notes');
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch note content on mount
  useEffect(() => {
    if (isAuthenticated) {
      const fetchNote = async () => {
        try {
          const res = await apiFetch('/notes');
          if (res.ok) {
            const data = await res.json();
            setNoteId(data._id);
            setNoteTitle(data.title || 'Personal Study Notes');
            setEditorContent(data.content || '');
            
            // Set contentEditable content
            if (editorRef.current) {
              editorRef.current.innerHTML = data.content || '';
            }
          }
        } catch (err) {
          console.error('Error fetching note:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchNote();
    }
  }, [isAuthenticated]);

  // Handle manual saving
  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    setSaveStatus('saving');

    const htmlContent = editorRef.current.innerHTML;

    try {
      const res = await apiFetch('/notes', {
        method: 'PUT',
        body: JSON.stringify({
          title: noteTitle,
          content: htmlContent
        })
      });

      if (res.ok) {
        setSaveStatus('saved');
        setEditorContent(htmlContent);
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save notes. Please try again.');
      setSaveStatus('dirty');
    } finally {
      setSaving(false);
    }
  };

  // Detect unsaved changes
  const handleInput = () => {
    setSaveStatus('dirty');
  };

  // Basic formatting actions
  const format = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleInput();
    }
  };

  // Insert Link Prompt
  const insertLink = () => {
    const url = prompt('Enter the link URL (e.g. https://google.com):');
    if (url) {
      format('createLink', url);
      
      // Make sure the link has standard blue styles and target blank
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

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setSaveStatus('dirty');
      
      // Upload using FormData
      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData
        // Note: Content-Type is auto-configured by the browser for FormData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || 'Image upload failed');
      }

      // Insert image inline
      // The backend serves uploads statically on http://localhost:5000/uploads
      const imageUrl = `http://localhost:5000${data.url}`;
      format('insertImage', imageUrl);
      
      // Focus back to editor
      editorRef.current?.focus();
    } catch (err: any) {
      alert(err.message || 'Image upload failed.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen">
      {/* Top Sticky Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            
            <div className="flex items-center gap-2">
              <div className="bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg text-indigo-600">
                <FileText size={18} />
              </div>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  handleInput();
                }}
                className="font-bold text-slate-800 text-base focus:outline-none focus:bg-slate-50 px-2 py-1 rounded-md max-w-[200px] sm:max-w-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-slate-500 hidden sm:inline">All changes saved</span>
                </>
              )}
              {saveStatus === 'saving' && <span>Saving...</span>}
              {saveStatus === 'dirty' && <span className="text-amber-500">Unsaved changes</span>}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Editor Ribbon Formatting Controls */}
        <div className="border-t border-slate-200 bg-slate-50/50 py-1.5 px-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-1">
            {/* Bold */}
            <button
              onClick={() => format('bold')}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Bold"
            >
              <Bold size={16} />
            </button>

            <span className="w-[1px] h-4 bg-slate-300 mx-1"></span>

            {/* Font Size Selector */}
            <div className="relative group flex items-center">
              <select
                onChange={(e) => format('fontSize', e.target.value)}
                defaultValue="3"
                className="appearance-none bg-transparent hover:bg-slate-200 text-xs font-semibold text-slate-600 px-2 py-1.5 pr-6 rounded-lg focus:outline-none cursor-pointer"
                title="Font Size"
              >
                <option value="2">Small</option>
                <option value="3">Normal</option>
                <option value="5">Large</option>
                <option value="6">XL</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 text-slate-500 pointer-events-none" />
            </div>

            <span className="w-[1px] h-4 bg-slate-300 mx-1"></span>

            {/* Alignment Controls */}
            <button
              onClick={() => format('justifyLeft')}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Align Left"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => format('justifyCenter')}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Align Center"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => format('justifyRight')}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Align Right"
            >
              <AlignRight size={16} />
            </button>

            <span className="w-[1px] h-4 bg-slate-300 mx-1"></span>

            {/* Insert Link */}
            <button
              onClick={insertLink}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Insert Link"
            >
              <LinkIcon size={16} />
            </button>

            {/* Insert Local Image */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Insert Image"
            >
              <ImageIcon size={16} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* Editor Body (Simulating a real Google Doc sheet) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-h-[70vh] p-8 sm:p-12 md:p-16 focus-within:ring-1 focus-within:ring-slate-300 transition-shadow">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="w-full h-full min-h-[50vh] focus:outline-none prose prose-slate max-w-none prose-a:text-blue-600 prose-a:underline"
            style={{ outline: 'none' }}
          />
        </div>
      </main>
    </div>
  );
}
