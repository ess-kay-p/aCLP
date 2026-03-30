"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated, clearToken } from "@/lib/auth";
import {
  getCurrentUser,
  getQuestionnaire,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
  QuestionData,
  QuestionOption,
} from "@/lib/api";

const DIMENSIONS = [
  "sports",
  "systems",
  "visual",
  "narrative",
  "analogy",
  "step_by_step",
  "academic",
  "simple",
];

type AdminTab = "categories" | "general-questions" | "category-questions";

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("categories");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  // Questions
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<QuestionOption[]>([
    { text: "", dimension_updates: {} },
    { text: "", dimension_updates: {} },
  ]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      if (!isAuthenticated()) {
        router.push("/login");
        return;
      }

      // Check if user is admin
      const userResult = await getCurrentUser();
      if (userResult.data && userResult.data.is_admin) {
        setIsAdmin(true);
        await loadCategories();
        await loadQuestions(null);
      } else {
        router.push("/");
        return;
      }

      setIsLoading(false);
    };

    loadSettings();
  }, [router]);

  const loadCategories = async () => {
    const result = await getCategories();
    if (result.data) {
      setCategories(result.data);
    } else {
      setError(result.error || "Failed to load categories");
    }
  };

  const loadQuestions = async (categoryId: number | null) => {
    const result = await getQuestionnaire(categoryId || undefined);
    if (result.data) {
      setQuestions(result.data.questions);
    } else {
      setError(result.error || "Failed to load questions");
    }
  };

  // Category handlers
  const resetCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryDesc("");
    setError("");
    setIsCategoryModalOpen(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name is required");
      return;
    }

    const result = await createCategory(newCategoryName, newCategoryDesc);
    if (result.error) {
      setError(result.error);
      return;
    }

    await loadCategories();
    resetCategoryForm();
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Delete this category? All questions in it will be deleted.")) {
      const result = await deleteCategory(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      await loadCategories();
    }
  };

  // Question handlers
  const handleAddOption = () => {
    setFormOptions([...formOptions, { text: "", dimension_updates: {} }]);
  };

  const handleRemoveOption = (index: number) => {
    if (formOptions.length > 2) {
      setFormOptions(formOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...formOptions];
    newOptions[index].text = text;
    setFormOptions(newOptions);
  };

  const handleDimensionChange = (
    optionIndex: number,
    dimensionName: string,
    value: number
  ) => {
    const newOptions = [...formOptions];
    if (!newOptions[optionIndex].dimension_updates) {
      newOptions[optionIndex].dimension_updates = {};
    }

    if (value === 0) {
      delete newOptions[optionIndex].dimension_updates[dimensionName];
    } else {
      newOptions[optionIndex].dimension_updates[dimensionName] = value;
    }

    setFormOptions(newOptions);
  };

  const handleSaveQuestion = async () => {
    if (!formQuestion.trim()) {
      setError("Question text is required");
      return;
    }

    if (formOptions.some((opt) => !opt.text.trim())) {
      setError("All options must have text");
      return;
    }

    const newQuestion: QuestionData = {
      id: editingId || questions.length + 1,
      question: formQuestion,
      options: formOptions,
      category_id: activeTab === "category-questions" ? selectedCategoryId || undefined : undefined,
    };

    const result = editingId
      ? await updateQuestion(editingId, newQuestion)
      : await createQuestion(newQuestion);

    if (result.error) {
      setError(result.error);
      return;
    }

    await loadQuestions(activeTab === "category-questions" ? selectedCategoryId : null);
    resetForm();
  };

  const handleEditQuestion = (q: QuestionData) => {
    setEditingId(q.id);
    setFormQuestion(q.question);
    setFormOptions(q.options);
    setIsModalOpen(true);
  };

  const handleDeleteQuestion = async (id: number) => {
    if (confirm("Delete this question?")) {
      const result = await deleteQuestion(id);
      if (result.error) {
        setError(result.error);
        return;
      }

      await loadQuestions(activeTab === "category-questions" ? selectedCategoryId : null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormQuestion("");
    setFormOptions([
      { text: "", dimension_updates: {} },
      { text: "", dimension_updates: {} },
    ]);
    setError("");
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("lexicon_session_id");
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="container">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-slate-900">⚙️ Settings</h1>
        </header>
        <div className="text-center py-12">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-slate-900">⚙️ Settings</h1>
        </header>
        <div className="max-w-2xl mx-auto card text-center">
          <p className="text-slate-600 mb-4">
            You don't have permission to access admin settings.
          </p>
          <button onClick={() => router.push("/")} className="btn-primary py-2 px-6">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="mb-12 pt-8 border-b border-slate-200 pb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-slate-900">👨‍🏫 Teacher Settings</h1>
          {isMounted && (
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("categories");
              setError("");
            }}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "categories"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            📚 Categories
          </button>
          <button
            onClick={() => {
              setActiveTab("general-questions");
              loadQuestions(null);
              setError("");
            }}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "general-questions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            ❓ General Questions
          </button>
          <button
            onClick={() => {
              setActiveTab("category-questions");
              setSelectedCategoryId(null);
              setQuestions([]);
              setError("");
            }}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "category-questions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            📖 Category Questions
          </button>
        </div>

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="space-y-8">
            {/* Categories List */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  All Categories ({categories.length})
                </h2>
                <button
                  onClick={() => {
                    resetCategoryForm();
                    setIsCategoryModalOpen(true);
                  }}
                  className="btn-primary py-2 px-6"
                >
                  + Add Category
                </button>
              </div>

              <div className="space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-slate-800">{cat.name}</p>
                      {cat.description && (
                        <p className="text-sm text-slate-600 mt-1">{cat.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {categories.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No categories yet. Create one above!
                </p>
              )}
            </div>
          </div>
        )}

        {/* General Questions Tab */}
        {activeTab === "general-questions" && (
          <div className="space-y-8">
            {/* Questions List */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  General Questions ({questions.length})
                </h2>
                <button
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="btn-primary py-2 px-6"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 mb-1">
                          Question {idx + 1}
                        </p>
                        <p className="text-lg font-semibold text-slate-800">
                          {q.question}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="ml-0 space-y-3">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="pl-4">
                          <p className="text-sm font-medium text-slate-700 mb-1">
                            • {opt.text}
                          </p>
                          {Object.keys(opt.dimension_updates || {}).length > 0 && (
                            <div className="text-xs text-slate-500 pl-4 space-y-1">
                              {Object.entries(opt.dimension_updates).map(([dim, val]) => (
                                <p key={dim} className="text-slate-600">
                                  {dim.replace(/_/g, " ")}: {(val as number).toFixed(1)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {questions.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No general questions yet. Create one above!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Category Questions Tab */}
        {activeTab === "category-questions" && (
          <div className="space-y-8">
            {/* Category Dropdown */}
            <div className="card bg-indigo-50 border border-indigo-200">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-3 rounded-lg bg-white border border-indigo-300 text-left font-medium text-slate-900 flex items-center justify-between hover:border-indigo-400 transition"
                >
                  <span>
                    {selectedCategoryId
                      ? categories.find((c) => c.id === selectedCategoryId)?.name ||
                        "Select a category"
                      : "Select a category"}
                  </span>
                  <span className={`transition ${isDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-indigo-300 rounded-lg shadow-lg z-40">
                    <div className="max-h-64 overflow-y-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            loadQuestions(cat.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 font-medium transition border-b border-slate-100 last:border-b-0 ${
                            selectedCategoryId === cat.id
                              ? "bg-indigo-100 text-indigo-900"
                              : "text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          {cat.name}
                          {cat.description && (
                            <p className="text-xs text-slate-600 font-normal mt-1">
                              {cat.description}
                            </p>
                          )}
                        </button>
                      ))}
                      {categories.length === 0 && (
                        <div className="px-4 py-3 text-slate-500 text-center">
                          No categories yet. Create one from the Categories tab.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedCategoryId && (
              <>
                {/* Questions List */}
                <div className="card">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">
                      Questions ({questions.length})
                    </h2>
                    <button
                      onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                      }}
                      className="btn-primary py-2 px-6"
                    >
                      + Add Question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-500 mb-1">
                              Question {idx + 1}
                            </p>
                            <p className="text-lg font-semibold text-slate-800">
                              {q.question}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditQuestion(q)}
                              className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="ml-0 space-y-3">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="pl-4">
                              <p className="text-sm font-medium text-slate-700 mb-1">
                                • {opt.text}
                              </p>
                              {Object.keys(opt.dimension_updates || {}).length > 0 && (
                                <div className="text-xs text-slate-500 pl-4 space-y-1">
                                  {Object.entries(opt.dimension_updates).map(([dim, val]) => (
                                    <p key={dim} className="text-slate-600">
                                      {dim.replace(/_/g, " ")}: {(val as number).toFixed(1)}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {questions.length === 0 && (
                    <p className="text-center text-slate-500 py-8">
                      No questions in this category yet. Create one above!
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Category Editor Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Create New Category</h2>
              <button
                onClick={resetCategoryForm}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Physics, Chemistry, Biology"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Brief description of this learning category"
                  className="input"
                  rows={2}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 btn-primary py-2 px-4"
                >
                  Create Category
                </button>
                <button
                  onClick={resetCategoryForm}
                  className="flex-1 btn-secondary py-2 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingId ? "Edit Question" : "Add New Question"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Question Text
                </label>
                <textarea
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Enter the question"
                  className="input"
                  rows={3}
                />
              </div>

              <div>
                <div className="flex items-center mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    Answer Options
                  </label>
                  <div className="tooltip-container">
                    <div className="tooltip-icon">?</div>
                    <div className="tooltip-content">
                      <div className="space-y-2 text-left">
                        <div><strong>Sports:</strong> Game/sports analogies</div>
                        <div><strong>Systems:</strong> Systems thinking & logic</div>
                        <div><strong>Visual:</strong> Visual/descriptive language</div>
                        <div><strong>Narrative:</strong> Story-based explanations</div>
                        <div><strong>Analogy:</strong> Metaphor & analogy</div>
                        <div><strong>Step by step:</strong> Sequential instructions</div>
                        <div><strong>Academic:</strong> Formal/technical language</div>
                        <div><strong>Simple:</strong> Simple/everyday language</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  {formOptions.map((option, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 input"
                        />
                        {formOptions.length > 2 && (
                          <button
                            onClick={() => handleRemoveOption(idx)}
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 ml-2">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Vector Dimensions
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {DIMENSIONS.map((dim) => (
                            <div key={dim} className="flex items-center gap-3">
                              <label className="text-xs font-medium text-slate-700 w-20 capitalize">
                                {dim.replace(/_/g, " ")}
                              </label>
                              <input
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.1"
                                value={option.dimension_updates[dim] || 0}
                                onChange={(e) =>
                                  handleDimensionChange(idx, dim, parseFloat(e.target.value))
                                }
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-600 w-12 text-right">
                                {option.dimension_updates[dim]?.toFixed(1) || "0.0"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddOption}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  + Add Option
                </button>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSaveQuestion}
                  className="flex-1 btn-primary py-2 px-4"
                >
                  {editingId ? "Update Question" : "Add Question"}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 btn-secondary py-2 px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
