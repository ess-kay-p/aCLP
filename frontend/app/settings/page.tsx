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
  adminListUsers,
  adminGetUserProfile,
  adminGetUserProfilingAnswers,
  adminGetUserPersonalizationSummary,
  Category,
  QuestionData,
  QuestionOption,
  AdminUser,
} from "@/lib/api";
import LearnerProfileChart from "@/components/LearnerProfileChart";

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

type AdminTab = "categories" | "general-questions" | "category-questions" | "profiling-questions" | "users";

const EMPTY_PROFILING_OPTIONS: QuestionOption[] = [
  { text: "", dimension_updates: {}, image_url: "", alt_text: "" },
  { text: "", dimension_updates: {}, image_url: "", alt_text: "" },
];

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

  // Profiling Questions
  const [profilingQuestions, setProfilingQuestions] = useState<QuestionData[]>([]);
  const [isProfilingModalOpen, setIsProfilingModalOpen] = useState(false);
  const [profilingFormQuestion, setProfilingFormQuestion] = useState("");
  const [profilingFormOptions, setProfilingFormOptions] = useState<QuestionOption[]>(EMPTY_PROFILING_OPTIONS);
  const [profilingEditingId, setProfilingEditingId] = useState<number | null>(null);
  const [profilingSubType, setProfilingSubType] = useState<"profiling" | "open">("profiling");

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userVector, setUserVector] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [userSummary, setUserSummary] = useState("");
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailTab, setUserDetailTab] = useState<"style" | "profiling" | "graph">("style");

  const loadUsers = async () => {
    setUsersLoading(true);
    const res = await adminListUsers();
    if (res.data) setUsers(res.data);
    setUsersLoading(false);
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setUserVector([]);
    setUserAnswers({});
    setUserSummary("");
    setUserDetailTab("style");
    setUserDetailLoading(true);
    const [profileRes, answersRes, summaryRes] = await Promise.all([
      adminGetUserProfile(user.id),
      adminGetUserProfilingAnswers(user.id),
      adminGetUserPersonalizationSummary(user.id),
    ]);
    if (profileRes.data) setUserVector(profileRes.data.vector);
    if (answersRes.data) setUserAnswers(answersRes.data.answers);
    if (summaryRes.data) setUserSummary(summaryRes.data.summary);
    setUserDetailLoading(false);
  };

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
        await loadProfilingQuestions();
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
    const result = await getQuestionnaire(categoryId || undefined, "vector");
    if (result.data) {
      setQuestions(result.data.questions);
    } else {
      setError(result.error || "Failed to load questions");
    }
  };

  const loadProfilingQuestions = async () => {
    const result = await getQuestionnaire(undefined, "profiling,open");
    if (result.data) {
      setProfilingQuestions(result.data.questions);
    } else {
      setError(result.error || "Failed to load profiling questions");
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

  const resetProfilingModal = () => {
    setIsProfilingModalOpen(false);
    setProfilingEditingId(null);
    setProfilingFormQuestion("");
    setProfilingFormOptions(EMPTY_PROFILING_OPTIONS);
    setProfilingSubType("profiling");
    setError("");
  };

  const handleDeleteProfilingQuestion = async (id: number) => {
    if (confirm("Delete this question?")) {
      const result = await deleteQuestion(id);
      if (result.error) { setError(result.error); return; }
      await loadProfilingQuestions();
    }
  };

  const handleSaveProfilingQuestion = async () => {
    if (!profilingFormQuestion.trim()) {
      setError("Question text is required");
      return;
    }
    if (profilingSubType === "profiling" && profilingFormOptions.some((opt) => !opt.text.trim())) {
      setError("All options must have text");
      return;
    }

    const questionPayload: QuestionData = {
      id: profilingEditingId || profilingQuestions.length + 1,
      question: profilingFormQuestion,
      options: profilingSubType === "open"
        ? []
        : profilingFormOptions.map((opt) => ({
            text: opt.text,
            dimension_updates: {},
            image_url: opt.image_url || undefined,
            alt_text: opt.alt_text || undefined,
          })),
      question_type: profilingSubType,
      allow_multiple: profilingSubType === "profiling",
    };

    const result = profilingEditingId
      ? await updateQuestion(profilingEditingId, questionPayload)
      : await createQuestion(questionPayload);

    if (result.error) {
      setError(result.error);
      return;
    }

    await loadProfilingQuestions();
    resetProfilingModal();
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
          <button
            onClick={() => {
              setActiveTab("profiling-questions");
              loadProfilingQuestions();
              setError("");
            }}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "profiling-questions"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Profiling Questions
          </button>
          <button
            onClick={() => {
              setActiveTab("users");
              setSelectedUser(null);
              loadUsers();
              setError("");
            }}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            👥 Users
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
        {/* Profiling Questions Tab */}
        {activeTab === "profiling-questions" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  Profiling Questions ({profilingQuestions.length})
                </h2>
                <button
                  onClick={() => {
                    resetProfilingModal();
                    setIsProfilingModalOpen(true);
                  }}
                  className="btn-primary py-2 px-6"
                >
                  + Add Profiling Question
                </button>
              </div>

              <div className="space-y-4">
                {profilingQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 mb-1">
                          Question {idx + 1}
                        </p>
                        <p className="text-lg font-semibold text-slate-800">{q.question}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {q.question_type === "open"
                            ? "Text input"
                            : `Multi-select · ${q.options.length} options`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setProfilingEditingId(q.id);
                            setProfilingFormQuestion(q.question);
                            setProfilingSubType(q.question_type === "open" ? "open" : "profiling");
                            setProfilingFormOptions(
                              q.options.length > 0
                                ? q.options.map((o) => ({
                                    text: o.text,
                                    dimension_updates: {},
                                    image_url: o.image_url || "",
                                    alt_text: o.alt_text || "",
                                  }))
                                : EMPTY_PROFILING_OPTIONS
                            );
                            setIsProfilingModalOpen(true);
                          }}
                          className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProfilingQuestion(q.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {q.question_type === "open" ? (
                      <div className="pl-4">
                        <p className="text-xs text-slate-500 italic">Student types a free-text answer</p>
                      </div>
                    ) : (
                      <div className="space-y-2 ml-0">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-3 pl-4">
                            {opt.image_url && (
                              <img
                                src={opt.image_url}
                                alt={opt.alt_text || opt.text}
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <p className="text-sm font-medium text-slate-700">• {opt.text}</p>
                            {opt.alt_text && (
                              <p className="text-xs text-slate-400">({opt.alt_text})</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {profilingQuestions.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No profiling questions yet. Create one above!
                </p>
              )}
            </div>
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
      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="flex gap-6 h-full">
          {/* User List */}
          <div className="w-80 flex-shrink-0">
            <div className="card">
              <h2 className="text-xl font-bold text-slate-900 mb-4">All Users</h2>
              {usersLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[0,1,2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
                </div>
              ) : users.length === 0 ? (
                <p className="text-slate-400 text-sm">No users found.</p>
              ) : (
                <ul className="space-y-2">
                  {users.map(u => (
                    <li key={u.id}>
                      <button
                        onClick={() => handleSelectUser(u)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                          selectedUser?.id === u.id
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-800 truncate">{u.email}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${u.has_vector ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                            {u.has_vector ? "✓ Profile" : "No profile"}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${u.has_profile ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                            {u.has_profile ? "✓ Answers" : "No answers"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* User Detail */}
          <div className="flex-1 min-w-0">
            {!selectedUser ? (
              <div className="card flex items-center justify-center h-48 text-slate-400">
                <p className="text-sm">Select a user to view their learning profile</p>
              </div>
            ) : userDetailLoading ? (
              <div className="space-y-4">
                {[0,1,2].map(i => (
                  <div key={i} className="card animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card h-full flex flex-col">
                {/* User header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-0 flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedUser.email}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedUser.has_vector ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                      {selectedUser.has_vector ? "✓ Profile" : "No profile"}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${selectedUser.has_profile ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                      {selectedUser.has_profile ? "✓ Answers" : "No answers"}
                    </span>
                  </div>
                </div>

                {/* Inner tabs */}
                <div className="flex gap-1 border-b border-slate-100 flex-shrink-0 mt-2">
                  {(["style", "profiling", "graph"] as const).map((t) => {
                    const labels = { style: "✨ Learning Style", profiling: "🧠 Profiling Answers", graph: "📊 Profile Graph" };
                    return (
                      <button
                        key={t}
                        onClick={() => setUserDetailTab(t)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                          userDetailTab === t
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {labels[t]}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="flex-1 pt-5 overflow-y-auto">
                  {userDetailTab === "style" && (() => {
                    if (!userSummary) return <p className="text-sm text-slate-400">No personalization data available.</p>;
                    const SECTIONS = [
                      { key: "learning_style", icon: "🎯", label: "Learning Style",     color: "bg-indigo-50 border-indigo-200" },
                      { key: "what_works",     icon: "✅", label: "What Works For You", color: "bg-green-50 border-green-200" },
                      { key: "complexity",     icon: "📈", label: "Complexity Level",   color: "bg-blue-50 border-blue-200" },
                      { key: "avoid",          icon: "⚠️", label: "What to Avoid",      color: "bg-amber-50 border-amber-200" },
                      { key: "unique_trait",   icon: "✨", label: "Your Unique Trait",  color: "bg-purple-50 border-purple-200" },
                    ];
                    let sections: Record<string, string> | null = null;
                    try { if (userSummary.trim().startsWith("{")) sections = JSON.parse(userSummary); } catch {}
                    if (sections) {
                      return (
                        <div className="space-y-3">
                          {SECTIONS.map(({ key, icon, label, color }) => {
                            const text = sections![key];
                            if (!text) return null;
                            return (
                              <div key={key} className={`rounded-xl border p-4 ${color}`}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  <span>{icon}</span>{label}
                                </p>
                                <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return <p className="text-sm text-slate-700 leading-relaxed">{userSummary}</p>;
                  })()}

                  {userDetailTab === "profiling" && (
                    Object.keys(userAnswers).length === 0
                      ? <p className="text-sm text-slate-400">No profiling answers recorded.</p>
                      : <div className="space-y-5">
                          {Object.entries(userAnswers).map(([q, a], i) => (
                            <div key={i}>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Q{i+1}</p>
                              <p className="text-sm font-medium text-slate-800 mb-2">{q}</p>
                              <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">{a}</div>
                            </div>
                          ))}
                        </div>
                  )}

                  {userDetailTab === "graph" && (
                    userVector.length > 0
                      ? <LearnerProfileChart vector={userVector} stacked />
                      : <p className="text-sm text-slate-400">No vector profile available.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profiling Question Editor Modal */}
      {isProfilingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {profilingEditingId ? "Edit Profiling Question" : "Add Profiling Question"}
              </h2>
              <button
                onClick={resetProfilingModal}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Sub-type toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Answer Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setProfilingSubType("profiling")}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition ${
                      profilingSubType === "profiling"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    🖼️ Icon Selection
                  </button>
                  <button
                    onClick={() => setProfilingSubType("open")}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition ${
                      profilingSubType === "open"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    ✏️ Text Input
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Question Text
                </label>
                <textarea
                  value={profilingFormQuestion}
                  onChange={(e) => setProfilingFormQuestion(e.target.value)}
                  placeholder="Enter the question"
                  className="input"
                  rows={3}
                />
              </div>

              {profilingSubType === "open" ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-600 font-medium mb-1">Text Input Preview</p>
                  <div className="w-full border border-slate-300 rounded-lg p-3 bg-white text-slate-400 text-sm italic">
                    Student types their answer here...
                  </div>
                  <p className="text-xs text-slate-500 mt-2">No options to configure for text-input questions.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      Answer Options
                    </label>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Multi-select · No vector effect
                    </span>
                  </div>

                  <div className="space-y-4">
                    {profilingFormOptions.map((option, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 rounded-lg space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => {
                              const updated = [...profilingFormOptions];
                              updated[idx] = { ...updated[idx], text: e.target.value };
                              setProfilingFormOptions(updated);
                            }}
                            placeholder={`Option ${idx + 1} label`}
                            className="flex-1 input"
                          />
                          {profilingFormOptions.length > 2 && (
                            <button
                              onClick={() =>
                                setProfilingFormOptions(profilingFormOptions.filter((_, i) => i !== idx))
                              }
                              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Image URL (optional)
                            </label>
                            <input
                              type="text"
                              value={option.image_url || ""}
                              onChange={(e) => {
                                const updated = [...profilingFormOptions];
                                updated[idx] = { ...updated[idx], image_url: e.target.value };
                                setProfilingFormOptions(updated);
                              }}
                              placeholder="https://example.com/icon.png"
                              className="input text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Alt Text (optional)
                            </label>
                            <input
                              type="text"
                              value={option.alt_text || ""}
                              onChange={(e) => {
                                const updated = [...profilingFormOptions];
                                updated[idx] = { ...updated[idx], alt_text: e.target.value };
                                setProfilingFormOptions(updated);
                              }}
                              placeholder="Describe the image"
                              className="input text-sm"
                            />
                          </div>
                        </div>

                        {option.image_url && (
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={option.image_url}
                              alt={option.alt_text || option.text}
                              className="w-12 h-12 object-contain rounded border border-slate-200"
                            />
                            <span className="text-xs text-slate-500">Preview</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setProfilingFormOptions([
                        ...profilingFormOptions,
                        { text: "", dimension_updates: {}, image_url: "", alt_text: "" },
                      ])
                    }
                    className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleSaveProfilingQuestion}
                  className="flex-1 btn-primary py-2 px-4"
                >
                  {profilingEditingId ? "Update Question" : "Add Question"}
                </button>
                <button
                  onClick={resetProfilingModal}
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
