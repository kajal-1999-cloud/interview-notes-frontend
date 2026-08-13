'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CodeEditor from '@/components/CodeEditor';
import RichTextEditor from '@/components/RichTextEditor';
import * as Icons from 'lucide-react';
import {
  ArrowLeft,
  Download,
  Plus,
  Edit2,
  Trash2,
  Star,
  Copy,
  Check,
  Image as ImageIcon,
  ChevronRight,
  GripVertical,
  X,
  FileDown,
  FolderEdit,
  FolderPlus,
  Terminal
} from 'lucide-react';
import Link from 'next/link';

interface Topic {
  _id: string;
  name: string;
  description?: string;
}

interface Category {
  _id: string;
  name: string;
  topic: string;
}

interface Question {
  _id: string;
  question: string;
  answer: string;
  code?: string;
  language?: string | null;
  important: boolean;
  order: number;
  category?: Category | null;
  images: string[];
}

export default function TopicPage() {
  const { id: topicId } = useParams() as { id: string };
  const { isAuthenticated, apiFetch, loading: authLoading } = useAuth();
  const router = useRouter();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 'all', 'uncategorized', or Category ID

  // Clipboard copies
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Category Manage Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Add Question Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    answer: '',
    code: '',
    language: 'javascript',
    important: false,
    categoryId: ''
  });

  // Inline Editing State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    question: string;
    categoryId: string;
    important: boolean;
    language: string;
    answer: string;
    code: string;
    images: string[];
  } | null>(null);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const fetchTopicData = async () => {
    try {
      setLoading(true);
      const [topicRes, categoriesRes] = await Promise.all([
        apiFetch(`/topics/${topicId}`),
        apiFetch(`/categories/topic/${topicId}`)
      ]);

      if (topicRes.ok) {
        setTopic(await topicRes.json());
      } else {
        router.push('/');
        return;
      }

      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const url = `/questions/topic/${topicId}?categoryId=${selectedCategory}`;
      const res = await apiFetch(url);
      if (res.ok) {
        setQuestions(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (topicId) {
      fetchTopicData();
    }
  }, [topicId]);

  useEffect(() => {
    if (topicId) {
      fetchQuestions();
    }
  }, [topicId, selectedCategory]);

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Category CRUD
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      let res;
      if (editingCatId) {
        res = await apiFetch(`/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: catName })
        });
      } else {
        res = await apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: catName, topicId })
        });
      }

      if (res.ok) {
        setCatName('');
        setEditingCatId(null);
        fetchTopicData();
        fetchQuestions();
      } else {
        const data = await res.json();
        alert(data.msg || 'Error saving category');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Questions under this category will NOT be deleted; they will be reassigned to "Uncategorized".')) return;

    try {
      const res = await apiFetch(`/categories/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedCategory === id) {
          setSelectedCategory('all');
        }
        fetchTopicData();
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const { question, answer, code, language, important, categoryId } = newQuestion;
    if (!question.trim() || !answer.trim()) return;

    try {
      const res = await apiFetch('/questions', {
        method: 'POST',
        body: JSON.stringify({
          topicId,
          categoryId: categoryId || null,
          question,
          answer,
          code,
          language,
          important
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewQuestion({
          question: '',
          answer: '',
          code: '',
          language: 'javascript',
          important: false,
          categoryId: ''
        });
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Important toggle
  const toggleImportant = async (q: Question) => {
    try {
      const res = await apiFetch(`/questions/${q._id}`, {
        method: 'PUT',
        body: JSON.stringify({ important: !q.important })
      });
      if (res.ok) {
        setQuestions(questions.map(item => item._id === q._id ? { ...item, important: !q.important } : item));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inline editing actions
  const startEditing = (q: Question) => {
    setEditingQuestionId(q._id);
    setEditFields({
      question: q.question,
      categoryId: q.category ? q.category._id : '',
      important: q.important,
      language: q.language || 'javascript',
      answer: q.answer,
      code: q.code || '',
      images: q.images || []
    });
  };

  const saveInlineEdit = async (id: string) => {
    if (!editFields || !editFields.question.trim() || !editFields.answer.trim()) return;

    try {
      const res = await apiFetch(`/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          question: editFields.question,
          categoryId: editFields.categoryId || null,
          important: editFields.important,
          language: editFields.language,
          answer: editFields.answer,
          code: editFields.code,
          images: editFields.images
        })
      });

      if (res.ok) {
        setEditingQuestionId(null);
        setEditFields(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const res = await apiFetch(`/questions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upload image under question (during inline edit)
  const handleImageUploadForQuestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editFields) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setEditFields({
          ...editFields,
          images: [...editFields.images, data.url]
        });
      } else {
        alert(data.msg || 'Failed to upload image');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete image reference from editing fields
  const deleteImageFromQuestion = (index: number) => {
    if (!editFields) return;
    const newImages = [...editFields.images];
    newImages.splice(index, 1);
    setEditFields({
      ...editFields,
      images: newImages
    });
  };

  // Native Drag and Drop Reordering
  const handleDragStart = (index: number) => {
    if (!isAuthenticated) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!isAuthenticated || draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIdx || !isAuthenticated) return;

    // Rearrange questions locally in UI state
    const rearranged = [...questions];
    const [draggedItem] = rearranged.splice(draggedIndex, 1);
    rearranged.splice(targetIdx, 0, draggedItem);
    setQuestions(rearranged);

    // Calculate new fractional order
    let prevOrder: number | null = null;
    let nextOrder: number | null = null;

    if (targetIdx > 0) {
      prevOrder = rearranged[targetIdx - 1].order;
    }
    if (targetIdx < rearranged.length - 1) {
      nextOrder = rearranged[targetIdx + 1].order;
    }

    // Call reorder endpoint
    try {
      const res = await apiFetch(`/questions/${draggedItem._id}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ prevOrder, nextOrder })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local order to keep synced
        draggedItem.order = data.order;
        // Refetch to ensure everything is sorted and synchronized
        fetchQuestions();
      }
    } catch (err) {
      console.error('Error reordering question:', err);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Trigger exports
  const triggerExport = (format: 'pdf' | 'docx') => {
    window.open(`http://localhost:5000/api/export/${format}/${topicId}`, '_blank');
  };

  // Scroll to element helper
  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(`q-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg text-slate-800 leading-tight">
                {topic?.name}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {topic?.description || 'Interview Questions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Dropdown */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                onClick={() => triggerExport('pdf')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-200 cursor-pointer"
                title="Download PDF"
              >
                <FileDown size={14} className="text-red-500" />
                PDF
              </button>
              <button
                onClick={() => triggerExport('docx')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Download Word Document"
              >
                <Download size={14} className="text-blue-500" />
                Word
              </button>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setNewQuestion({
                    question: '',
                    answer: '',
                    code: '',
                    language: 'javascript',
                    important: false,
                    categoryId: ''
                  });
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <Plus size={16} />
                Add Question
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">

        {/* Left Sidebar: Questions Index (Desktop only) */}
        <aside className="w-64 hidden lg:block shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
          <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              Questions Index
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full lowercase">
                {questions.length} items
              </span>
            </h3>

            {questions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No questions listed.</p>
            ) : (
              <ul className="space-y-1.5">
                {questions.map((q, idx) => (
                  <li key={q._id}>
                    <button
                      onClick={() => scrollToQuestion(q._id)}
                      className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50/50 rounded-lg line-clamp-2 font-medium flex items-start gap-1.5 cursor-pointer group"
                    >
                      <span className="text-slate-400 group-hover:text-blue-500 shrink-0">
                        {idx + 1}.
                      </span>
                      <span>{q.question}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right Content Area: Filters and Questions */}
        <main className="flex-1 min-w-0">

          {/* Category Tabs/Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All Questions
              </button>

              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategory === cat._id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {cat.name}
                </button>
              ))}

              <button
                onClick={() => setSelectedCategory('uncategorized')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategory === 'uncategorized'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Uncategorized
              </button>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setCatName('');
                  setEditingCatId(null);
                  setShowCatModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl cursor-pointer"
              >
                <FolderEdit size={14} />
                Manage Categories
              </button>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <Icons.HelpCircle size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-600">No Questions Found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  There are no questions matching this category filter.
                </p>
              </div>
            ) : (
              questions.map((q, index) => {
                const isEditing = editingQuestionId === q._id;

                return (
                  <div
                    key={q._id}
                    id={`q-${q._id}`}
                    draggable={isAuthenticated && !isEditing && activeDragId === q._id}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={() => {
                      handleDragEnd();
                      setActiveDragId(null);
                    }}
                    onDrop={(e) => {
                      handleDrop(e, index);
                      setActiveDragId(null);
                    }}
                    className={`bg-white border transition-all rounded-3xl p-6 shadow-sm relative group ${dragOverIndex === index ? 'border-t-4 border-t-blue-500 bg-blue-50/10' : 'border-slate-200/80'
                      } ${draggedIndex === index ? 'opacity-40' : ''}`}
                  >
                    {/* Admin Drag Handle */}
                    {isAuthenticated && !isEditing && (
                      <div
                        className="absolute top-6 left-2 cursor-grab text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
                        onMouseDown={() => setActiveDragId(q._id)}
                        onMouseUp={() => setActiveDragId(null)}
                      >
                        <GripVertical size={20} />
                      </div>
                    )}

                    {/* Inline Form Edit State */}
                    {isEditing && editFields ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <h4 className="font-bold text-slate-800 text-sm">Edit Question Settings</h4>
                          <button
                            onClick={() => {
                              setEditingQuestionId(null);
                              setEditFields(null);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Question Input */}
                        <div>
                          <label className="block text-[10px] font-bold  uppercase mb-1">Question Title</label>
                          <input
                            type="text"
                            value={editFields.question}
                            onChange={(e) => setEditFields({ ...editFields, question: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Category & Lang Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                            <select
                              value={editFields.categoryId}
                              onChange={(e) => setEditFields({ ...editFields, categoryId: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Uncategorized</option>
                              {categories.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Code Language</label>
                            <select
                              value={editFields.language}
                              onChange={(e) => setEditFields({ ...editFields, language: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="typescript">TypeScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="sql">SQL</option>
                              <option value="css">CSS</option>
                              <option value="html">HTML</option>
                            </select>
                          </div>

                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editFields.important}
                                onChange={(e) => setEditFields({ ...editFields, important: e.target.checked })}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              Mark Important
                            </label>
                          </div>
                        </div>

                        {/* Rich Answer Input */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Answer / Explanation (Rich Text Editor)</label>
                          <RichTextEditor
                            value={editFields.answer}
                            onChange={(val) => setEditFields({ ...editFields, answer: val })}
                            placeholder="Type answer here..."
                          />
                        </div>

                        {/* Code Input */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Code Snippet (Optional)</label>
                          <CodeEditor
                            value={editFields.code}
                            onChange={(val) => setEditFields({ ...editFields, code: val })}
                            language={editFields.language}
                            readOnly={false}
                          />
                        </div>

                        {/* Images Upload / Preview under Question */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Images</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {editFields.images.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden group/img bg-slate-100">
                                <img src={`http://localhost:5000${img}`} alt="Uploaded Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => deleteImageFromQuestion(idx)}
                                  className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5 hover:bg-red-500 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`upload-${q._id}`);
                                input?.click();
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <ImageIcon size={14} />
                              Upload Image
                            </button>
                            <input
                              type="file"
                              id={`upload-${q._id}`}
                              onChange={handleImageUploadForQuestion}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                        </div>

                        {/* Edit Buttons */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(null);
                              setEditFields(null);
                            }}
                            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveInlineEdit(q._id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Question View Card */
                      <div>
                        {/* Meta and Icons */}
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                            {q.category ? q.category.name : 'Uncategorized'}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Starred Important indicator */}
                            <button
                              onClick={() => isAuthenticated && toggleImportant(q)}
                              className={`p-1.5 rounded-lg transition-colors ${q.important
                                  ? 'text-amber-500 bg-amber-50 border border-amber-100'
                                  : 'text-slate-300 hover:text-slate-500'
                                } ${!isAuthenticated ? 'pointer-events-none' : 'cursor-pointer'}`}
                              title={q.important ? 'Important concept' : 'Mark as important'}
                            >
                              <Star size={16} fill={q.important ? 'currentColor' : 'none'} />
                            </button>

                            {/* CRUD buttons */}
                            {isAuthenticated && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditing(q)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Question"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteQuestion(q._id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Question"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Question Title */}
                        <h2 className="font-extrabold text-lg sm:text-xl text-slate-800 mb-3 pl-0 sm:pl-4">
                          {q.question}
                        </h2>

                        {/* Rich Answer Text */}
                        <div
                          className="prose prose-sm prose-slate max-w-none text-slate-600 pl-0 sm:pl-4 leading-relaxed mb-4"
                          dangerouslySetInnerHTML={{ __html: q.answer }}
                        />

                        {/* Question Images */}
                        {q.images && q.images.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-6 pl-0 sm:pl-4">
                            {q.images.map((img, idx) => (
                              <a
                                key={idx}
                                href={`http://localhost:5000${img}`}
                                target="_blank"
                                rel="noreferrer"
                                className="border border-slate-200 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform shadow-xs max-w-[200px]"
                              >
                                <img src={`http://localhost:5000${img}`} alt="Snippet explanation illustration" className="object-cover h-32 w-full" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* IDE-like Code Block */}
                        {q.code && q.code.trim() && (
                          <div className="ml-0 sm:ml-4">
                            <CodeEditor
                              value={q.code}
                              language={q.language || 'javascript'}
                              readOnly={true}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Category CRUD Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Manage Categories
              </h3>
              <button
                onClick={() => {
                  setShowCatModal(false);
                  setCatName('');
                  setEditingCatId(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category list */}
            <div className="mb-6 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Existing Categories</h4>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">No categories manually created yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1">
                  {categories.map((c) => (
                    <div key={c._id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs font-semibold text-slate-700">
                      <span>{c.name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(c._id);
                            setCatName(c.name);
                          }}
                          className="p-1 hover:bg-slate-200 text-blue-600 rounded cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(c._id)}
                          className="p-1 hover:bg-slate-200 text-red-600 rounded cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to Create/Edit */}
            <form onSubmit={handleAddCategory} className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  {editingCatId ? 'Edit Category Name' : 'New Category Name'}
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Advanced, Basics, Core Concepts"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="flex justify-end gap-2">
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(null);
                      setCatName('');
                    }}
                    className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {editingCatId ? 'Rename' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Add Question to {topic?.name}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="e.g. What is closure in JavaScript?"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Category, Lang, Important */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Category (Optional)
                  </label>
                  <select
                    value={newQuestion.categoryId}
                    onChange={(e) => setNewQuestion({ ...newQuestion, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Language (Optional)
                  </label>
                  <select
                    value={newQuestion.language}
                    onChange={(e) => setNewQuestion({ ...newQuestion, language: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="sql">SQL</option>
                    <option value="css">CSS</option>
                    <option value="html">HTML</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQuestion.important}
                      onChange={(e) => setNewQuestion({ ...newQuestion, important: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Mark Important
                  </label>
                </div>
              </div>

              {/* Answer Explanations */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Answer / Explanation (Rich Text Editor) *
                </label>
                <RichTextEditor
                  value={newQuestion.answer}
                  onChange={(val) => setNewQuestion({ ...newQuestion, answer: val })}
                  placeholder="Type description..."
                />
              </div>

              {/* Code Snippet */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Code Snippet (Optional)
                </label>
                <CodeEditor
                  value={newQuestion.code}
                  onChange={(val) => setNewQuestion({ ...newQuestion, code: val })}
                  language={newQuestion.language}
                  readOnly={false}
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Create Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
