'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as Icons from 'lucide-react';
import { 
  LogOut, 
  LogIn, 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  FolderPlus, 
  ArrowRight, 
  Shield, 
  BookOpen,
  X,
  Sparkles
} from 'lucide-react';

interface Topic {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  questionCount?: number;
}

interface Resource {
  _id: string;
  title: string;
  url: string;
  description?: string;
  order: number;
}

export default function HomePage() {
  const { isAuthenticated, logout, apiFetch, loading: authLoading } = useAuth();
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Topic Modal State
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicIcon, setTopicIcon] = useState('BookOpen');

  // Resource Modal State
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceURL, setResourceURL] = useState('');
  const [resourceDesc, setResourceDesc] = useState('');
  const [resourceOrder, setResourceOrder] = useState('0');

  // Error/Confirm State
  const [errorMessage, setErrorMessage] = useState('');
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [confirmForceDelete, setConfirmForceDelete] = useState(false);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState('');

  // Import JSON Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [referenceTopics, setReferenceTopics] = useState<any[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);

  const fetchReferenceData = async () => {
    try {
      setReferenceLoading(true);
      const res = await apiFetch('/topics/all/categories');
      if (res.ok) {
        const data = await res.json();
        setReferenceTopics(data);
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
    } finally {
      setReferenceLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          setImportError('Invalid JSON format. The file must contain a JSON array.');
          setParsedItems([]);
          return;
        }
        setParsedItems(json);
      } catch (err) {
        setImportError('Invalid JSON format');
        setParsedItems([]);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (parsedItems.length === 0) return;

    try {
      setImporting(true);
      setImportError(null);
      setImportSummary(null);

      const res = await apiFetch('/questions/import-json', {
        method: 'POST',
        body: JSON.stringify(parsedItems)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || 'Failed to process import');
      }

      setImportSummary(data);
      fetchDashboardData();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [topicsRes, resourcesRes] = await Promise.all([
        apiFetch('/topics'),
        apiFetch('/resources')
      ]);

      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData);
      }
      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAuthenticated]);

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    try {
      const payload = {
        name: topicName,
        description: topicDesc,
        icon: topicIcon
      };

      let res;
      if (editingTopic) {
        res = await apiFetch(`/topics/${editingTopic._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/topics', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Failed to save topic');
      }

      setShowTopicModal(false);
      setEditingTopic(null);
      setTopicName('');
      setTopicDesc('');
      setTopicIcon('BookOpen');
      fetchDashboardData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceURL.trim()) return;

    try {
      const payload = {
        title: resourceTitle,
        url: resourceURL,
        description: resourceDesc,
        order: Number(resourceOrder) || 0
      };

      let res;
      if (editingResource) {
        res = await apiFetch(`/resources/${editingResource._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/resources', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Failed to save resource');
      }

      setShowResourceModal(false);
      setEditingResource(null);
      setResourceTitle('');
      setResourceURL('');
      setResourceDesc('');
      setResourceOrder('0');
      fetchDashboardData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const deleteTopic = async (id: string, force = false) => {
    try {
      const res = await apiFetch(`/topics/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfirmation) {
          setTopicToDelete(id);
          setConfirmForceDelete(true);
          setConfirmDeleteMessage(data.msg);
          return;
        }
        throw new Error(data.msg || 'Failed to delete topic');
      }

      setTopicToDelete(null);
      setConfirmForceDelete(false);
      setConfirmDeleteMessage('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource link?')) return;
    try {
      const res = await apiFetch(`/resources/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicName(topic.name);
    setTopicDesc(topic.description || '');
    setTopicIcon(topic.icon || 'BookOpen');
    setShowTopicModal(true);
  };

  const openEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setResourceTitle(resource.title);
    setResourceURL(resource.url);
    setResourceDesc(resource.description || '');
    setResourceOrder(resource.order.toString());
    setShowResourceModal(true);
  };

  // Helper to render dynamic icons
  const renderTopicIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || BookOpen;
    return <IconComponent className="h-6 w-6 text-blue-600" />;
  };

  const totalQuestions = topics.reduce((acc, t) => acc + (t.questionCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Icons.Terminal size={20} />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                InterviewPrep
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                Personal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                  <Shield size={12} />
                  Admin Mode
                </span>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all text-slate-700 cursor-pointer"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
              >
                <LogIn size={16} />
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Intro Section */}
        <div className="mb-10 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-md relative overflow-hidden border border-blue-800/20">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={160} />
          </div>
          <div className="max-w-2xl relative z-10">
            <span className="text-xs uppercase tracking-wider font-bold text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full">
              Dashboard
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mt-4 tracking-tight leading-tight">
              Interview Preparation
            </h1>
            <p className="mt-3 text-blue-100/80 text-base leading-relaxed">
              Study, structure, and practice your technical concepts. Everything is persisted locally in MongoDB and ready for seamless document exports.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-blue-200">
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                {topics.length} Topics
              </span>
              <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                {totalQuestions} Questions
              </span>
            </div>
          </div>
        </div>

        {/* Grid Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Categories & Modules
          </h2>
          {isAuthenticated && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportError(null);
                  setImportSummary(null);
                  setParsedItems([]);
                  setFileName('');
                  fetchReferenceData();
                  setShowImportModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Icons.Upload size={16} />
                Import JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTopic(null);
                  setTopicName('');
                  setTopicDesc('');
                  setTopicIcon('BookOpen');
                  setErrorMessage('');
                  setShowTopicModal(true);
                }}
                className="inline-flex items-center gap-1 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus size={16} />
                Add Topic
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Grid of Topics and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <div 
                  key={topic._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Top Row: Icon and Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        {renderTopicIcon(topic.icon || 'BookOpen')}
                      </div>
                      
                      {isAuthenticated && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditTopic(topic)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Topic"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteTopic(topic._id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Topic"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Topic details */}
                    <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                      {topic.name}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                      {topic.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                      {topic.questionCount || 0} questions
                    </span>
                    <Link
                      href={`/topic/${topic._id}`}
                      className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-1.5 transition-all"
                    >
                      View Topic
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}

              {/* Personal Notes Card (Admin Only) */}
              {isAuthenticated && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 shadow-sm hover:border-blue-400 hover:bg-blue-50/10 transition-all flex flex-col justify-between group relative">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                        <BookOpen size={24} />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
                        Admin Only
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                      Notes & Cheatsheets
                    </h3>
                    <p className="text-slate-500 text-sm mb-4">
                      Shortcuts, reference notes, and study summaries. Google-Docs-style rich editor.
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                      Scratchpad
                    </span>
                    <Link
                      href="/notes"
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-1.5 transition-all"
                    >
                      Open Notes
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Empty State */}
            {topics.length === 0 && (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <Icons.FolderOpen size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700">No Topics Found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {isAuthenticated ? 'Start by creating your first study topic!' : 'The admin has not seeded any topics yet.'}
                </p>
              </div>
            )}

            {/* Resources / Links Section */}
            <div className="mt-16 border-t border-slate-200 pt-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Useful Resources & Reference Cards
                </h2>
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setEditingResource(null);
                      setResourceTitle('');
                      setResourceURL('');
                      setResourceDesc('');
                      setResourceOrder('0');
                      setErrorMessage('');
                      setShowResourceModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    Add Link Card
                  </button>
                )}
              </div>

              {resources.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No resources added yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.map((res) => (
                    <div 
                      key={res._id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {res.title}
                          </h3>
                          {isAuthenticated && (
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditResource(res)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded"
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => deleteResource(res._id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        {res.description && (
                          <p className="text-slate-500 text-xs mb-4 line-clamp-2">
                            {res.description}
                          </p>
                        )}
                      </div>
                      
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Visit Link
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingTopic ? 'Edit Topic' : 'Create Topic'}
              </h3>
              <button 
                onClick={() => setShowTopicModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Topic Name *
                </label>
                <input
                  type="text"
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g. JavaScript, React, SQL"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Summarize the core concepts covered"
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Lucide Icon Name
                </label>
                <select
                  value={topicIcon}
                  onChange={(e) => setTopicIcon(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="BookOpen">Default (BookOpen)</option>
                  <option value="FileCode">FileCode (JavaScript/TypeScript)</option>
                  <option value="Atom">Atom (React)</option>
                  <option value="Server">Server (Node.js/Backend)</option>
                  <option value="Zap">Zap (Express)</option>
                  <option value="Database">Database (MongoDB/SQL)</option>
                  <option value="Binary">Binary (DSA)</option>
                  <option value="Palette">Palette (CSS/HTML)</option>
                  <option value="Layers">Layers (MERN/Stack)</option>
                </select>
              </div>

              {errorMessage && (
                <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Delete Confirmation Modal */}
      {confirmForceDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-red-100">
            <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-2">
              <Icons.AlertTriangle className="text-red-600" />
              Warning: Data Danger Zone
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {confirmDeleteMessage}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTopicToDelete(null);
                  setConfirmForceDelete(false);
                  setConfirmDeleteMessage('');
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (topicToDelete) deleteTopic(topicToDelete, true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
              >
                Force Delete & Lose Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingResource ? 'Edit Resource' : 'Create Resource Card'}
              </h3>
              <button 
                onClick={() => setShowResourceModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleResourceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="e.g. MDN JS Reference, Flexbox Cheat Sheet"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  required
                  value={resourceURL}
                  onChange={(e) => setResourceURL(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={resourceDesc}
                  onChange={(e) => setResourceDesc(e.target.value)}
                  placeholder="Brief note on what this link is for"
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Display Order (Optional)
                </label>
                <input
                  type="number"
                  value={resourceOrder}
                  onChange={(e) => setResourceOrder(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {errorMessage && (
                <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                  <Icons.Upload size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-800">
                  Import Questions from JSON
                </h3>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Guidelines & Database Reference Tree */}
              <div className="space-y-4">
                {/* Guidelines */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">JSON Format Rules</h4>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4 mb-3">
                    <li>Must be a valid JSON array of question objects.</li>
                    <li><strong className="text-slate-700">Mandatory:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">topic</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">question</code>, and <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">answer</code>.</li>
                    <li><strong className="text-slate-700">Optional:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">category</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">code</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">language</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">important</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">order</code>.</li>
                    <li>Omitted optional values will fallback to Uncategorized, empty code snippets, or a newly calculated sequential order.</li>
                  </ul>
                  <pre className="bg-slate-900 text-slate-200 text-[10px] p-3 rounded-xl font-mono overflow-x-auto max-h-36">
{`[
  {
    "topic": "Node.js",
    "category": "Advanced",
    "question": "What is tracing in NodeJS?",
    "answer": "<p>Tracing objects enable tracing.</p>",
    "code": "",
    "language": "javascript",
    "important": false,
    "order": 740
  }
]`}
                  </pre>
                </div>

                {/* Topics and Categories Reference tree */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Available Topics & Categories</h4>
                  {referenceLoading ? (
                    <div className="py-4 flex justify-center items-center gap-2 text-xs text-slate-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-slate-500"></div>
                      <span>Loading structure...</span>
                    </div>
                  ) : referenceTopics.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No topics found in the database.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                      {referenceTopics.map((t) => (
                        <div key={t._id} className="text-xs border-b border-slate-200/30 pb-2 last:border-0 last:pb-0">
                          <span className="font-bold text-slate-800">{t.name}</span>
                          <div className="flex flex-wrap gap-1 mt-1 pl-2">
                            {t.categories.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic">No categories</span>
                            ) : (
                              t.categories.map((c: any) => (
                                <span key={c._id} className="bg-slate-200/70 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-md font-semibold">
                                  {c.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: File Selection & Actions / Summaries */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* File Upload Drop area */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors relative bg-slate-50/50">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Icons.Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm font-semibold text-slate-700 block">
                      {fileName ? fileName : 'Choose .json file or drag it here'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Only JSON array format files are accepted</span>
                  </div>

                  {/* Immediate Client-side syntax error alert */}
                  {importError && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-semibold text-rose-600 flex items-start gap-2">
                      <Icons.AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Parsed JSON validation status */}
                  {parsedItems.length > 0 && !importError && !importSummary && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-semibold text-emerald-700 flex items-start gap-2">
                      <Icons.CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>JSON structure is valid. Ready to import {parsedItems.length} objects.</span>
                    </div>
                  )}

                  {/* Import completed summary card */}
                  {importSummary && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                        <Icons.Sparkles size={16} />
                        Import Completed
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-xl border border-slate-100">
                          <div className="text-lg font-black text-slate-800">{importSummary.total}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Total</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100">
                          <div className="text-lg font-black text-emerald-600">{importSummary.inserted}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Inserted</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100">
                          <div className="text-lg font-black text-amber-600">{importSummary.skipped}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Skipped</div>
                        </div>
                      </div>

                      {/* Summary Errors list */}
                      {importSummary.errors && importSummary.errors.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-slate-700">Errors Details:</div>
                          <div className="max-h-40 overflow-y-auto border border-slate-200/50 bg-white rounded-xl p-2.5 space-y-1 text-xs font-mono text-rose-600 leading-normal pr-1">
                            {importSummary.errors.map((err: string, idx: number) => (
                              <div key={idx} className="border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                                {err}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Import Modal Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {importSummary ? 'Close' : 'Cancel'}
                  </button>
                  {parsedItems.length > 0 && !importSummary && (
                    <button
                      type="button"
                      disabled={importing}
                      onClick={executeImport}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      {importing && (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
                      )}
                      {importing ? 'Importing...' : 'Import Data'}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
