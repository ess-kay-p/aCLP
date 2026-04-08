"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getQuestions,
  submitAnswers,
  getCategories,
  getSessionId,
  Category,
  Question,
} from "@/lib/api";
import { isAuthenticated, clearToken } from "@/lib/auth";

type OnboardingStep = "profiling-questions" | "initial-questions" | "category-selection" | "category-questions" | "loading" | "completing" | "summary";

export default function OnboardingPage() {
  const router = useRouter();

  const [profilingQuestions, setProfilingQuestions] = useState<Question[]>([]);
  const [profilingQuestionIndex, setProfilingQuestionIndex] = useState(0);
  const [profilingAnswers, setProfilingAnswers] = useState<Record<number, number[]>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>({});

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [categoryQuestions, setCategoryQuestions] = useState<Question[]>([]);
  const [categoryQuestionIndex, setCategoryQuestionIndex] = useState(0);
  const [categoryAnswers, setCategoryAnswers] = useState<Record<number, number>>({});

  const [step, setStep] = useState<OnboardingStep>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [questionsResult, categoriesResult, profilingResult] = await Promise.all([
          getQuestions(undefined, "vector"),
          getCategories(true),
          getQuestions(undefined, "profiling,open"),
        ]);

        if (questionsResult.error) {
          setError(`Failed to load questions: ${questionsResult.error}`);
          setIsLoading(false);
          return;
        }
        if (questionsResult.data && questionsResult.data.questions) {
          setQuestions(questionsResult.data.questions);
        }

        if (categoriesResult.error) {
          setError(`Failed to load categories: ${categoriesResult.error}`);
          setIsLoading(false);
          return;
        }
        if (categoriesResult.data) {
          setCategories(categoriesResult.data);
        }

        if (profilingResult.data && profilingResult.data.questions.length > 0) {
          setProfilingQuestions(profilingResult.data.questions);
          setStep("profiling-questions");
        } else {
          setStep("initial-questions");
        }

        setIsLoading(false);
      } catch (err) {
        setError("Failed to load onboarding data");
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleToggleProfilingOption = (questionId: number, optionIndex: number) => {
    const current = profilingAnswers[questionId] || [];
    const alreadySelected = current.includes(optionIndex);
    setError("");
    setProfilingAnswers({
      ...profilingAnswers,
      [questionId]: alreadySelected
        ? current.filter((i) => i !== optionIndex)
        : [...current, optionIndex],
    });
  };

  const handleContinueProfilingQuestion = () => {
    const currentQ = profilingQuestions[profilingQuestionIndex];
    if (currentQ.question_type === "open" && !openAnswers[currentQ.id]?.trim()) {
      setError("Please enter an answer before continuing.");
      return;
    }
    if (currentQ.question_type !== "open" && !(profilingAnswers[currentQ.id]?.length > 0)) {
      setError("Please select at least one option before continuing.");
      return;
    }
    setError("");
    if (profilingQuestionIndex < profilingQuestions.length - 1) {
      setProfilingQuestionIndex(profilingQuestionIndex + 1);
    } else {
      setStep("initial-questions");
    }
  };

  const handleSelectInitialOption = async (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (categories.length === 0) {
      await handleCompleteOnboarding();
    } else {
      setStep("category-selection");
    }
  };

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    setIsLoading(true);
    setError("");

    try {
      const questionsResult = await getQuestions(category.id);

      if (questionsResult.error) {
        setError(`Failed to load category questions: ${questionsResult.error}`);
        setIsLoading(false);
        return;
      }

      if (questionsResult.data && questionsResult.data.questions.length > 0) {
        setCategoryQuestions(questionsResult.data.questions);
        setStep("category-questions");
        setIsLoading(false);
      } else {
        await handleCompleteOnboarding();
      }
    } catch (err) {
      setError("Failed to load category questions");
      setIsLoading(false);
    }
  };

  const handleSelectCategoryOption = async (optionIndex: number) => {
    const currentQuestion = categoryQuestions[categoryQuestionIndex];
    const newAnswers = {
      ...categoryAnswers,
      [currentQuestion.id]: optionIndex,
    };
    setCategoryAnswers(newAnswers);

    if (categoryQuestionIndex < categoryQuestions.length - 1) {
      setCategoryQuestionIndex(categoryQuestionIndex + 1);
    } else {
      await handleCompleteOnboarding(newAnswers);
    }
  };

  const handleCompleteOnboarding = async (finalCategoryAnswers: Record<number, number> = {}) => {
    setStep("completing");
    setIsLoading(true);
    setError("");

    try {
      const sessionId = getSessionId();
      const allAnswers = { ...answers, ...finalCategoryAnswers };

      const profileResult = await submitAnswers(sessionId, allAnswers, undefined, profilingAnswers, openAnswers);
      if (profileResult.error) {
        setError(`Error creating profile: ${profileResult.error}`);
        setIsLoading(false);
        setStep(selectedCategory ? "category-questions" : "category-selection");
        return;
      }

      setIsLoading(false);
      if (profilingQuestions.length > 0) {
        setStep("summary");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("Failed to complete onboarding");
      setIsLoading(false);
      setStep(selectedCategory ? "category-questions" : "category-selection");
    }
  };

  const handleBack = () => {
    if (step === "profiling-questions" && profilingQuestionIndex > 0) {
      setProfilingQuestionIndex(profilingQuestionIndex - 1);
    } else if (step === "initial-questions" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (step === "initial-questions" && profilingQuestions.length > 0) {
      setStep("profiling-questions");
      setProfilingQuestionIndex(profilingQuestions.length - 1);
    } else if (step === "category-selection") {
      setStep("initial-questions");
      setCurrentQuestionIndex(questions.length - 1);
    } else if (step === "category-questions" && categoryQuestionIndex > 0) {
      setCategoryQuestionIndex(categoryQuestionIndex - 1);
    } else if (step === "category-questions") {
      setStep("category-selection");
    }
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("lexicon_session_id");
    router.push("/login");
  };

  if (isLoading && step === "loading") {
    return (
      <div className="container">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📚 Lexicon</h1>
          <p className="text-xl text-slate-600">Let's personalize your learning</p>
        </header>

        <div className="max-w-2xl mx-auto card text-center py-16">
          <div className="animate-spin mb-4">
            <div className="text-5xl">✨</div>
          </div>
          <p className="text-slate-600 font-medium">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && step !== "category-selection" && step !== "profiling-questions") {
    return (
      <div className="container">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📚 Lexicon</h1>
        </header>

        <div className="max-w-2xl mx-auto card text-center py-12">
          <p className="text-slate-600">Failed to load questionnaire</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="mb-12 pt-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">📚 Lexicon</h1>
            <p className="text-xl text-slate-600 mt-1">Let's find your perfect learning style</p>
          </div>
          {isMounted && isAuthenticated() && (
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto card">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* STEP 0: Profiling Questions (icon multi-select or text input) */}
        {step === "profiling-questions" && !isLoading && (
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎨</div>
              <h3 className="text-xl font-bold text-purple-700">Learning Style</h3>
              <p className="text-sm text-slate-500 mt-1">Discover how you learn best</p>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-600">
                  Question {profilingQuestionIndex + 1} of {profilingQuestions.length}
                </span>
                <span className="text-sm font-medium text-slate-600">
                  {Math.round(((profilingQuestionIndex + 1) / profilingQuestions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((profilingQuestionIndex + 1) / profilingQuestions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {profilingQuestions[profilingQuestionIndex].question}
            </h2>

            {profilingQuestions[profilingQuestionIndex].question_type === "open" ? (
              <>
                <p className="text-sm text-slate-500 mb-4">Type your answer below</p>
                <textarea
                  value={openAnswers[profilingQuestions[profilingQuestionIndex].id] || ""}
                  onChange={(e) => {
                    setError("");
                    setOpenAnswers({
                      ...openAnswers,
                      [profilingQuestions[profilingQuestionIndex].id]: e.target.value,
                    });
                  }}
                  placeholder="Your answer..."
                  className="w-full input mb-6 resize-none"
                  rows={4}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-6">Select all that apply</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {profilingQuestions[profilingQuestionIndex].options.map((option, index) => {
                    const qId = profilingQuestions[profilingQuestionIndex].id;
                    const isSelected = (profilingAnswers[qId] || []).includes(index);
                    return (
                      <button
                        key={index}
                        onClick={() => handleToggleProfilingOption(qId, index)}
                        className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all text-center ${
                          isSelected
                            ? "border-green-500 bg-green-50"
                            : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        {option.image_url && (
                          <img
                            src={option.image_url}
                            alt={option.alt_text || option.text}
                            className="w-12 h-12 object-contain"
                          />
                        )}
                        <span className="text-sm font-medium text-slate-900">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              onClick={handleContinueProfilingQuestion}
              className="w-full btn-primary py-3 px-4 mb-3"
            >
              Continue →
            </button>

            {profilingQuestionIndex > 0 && (
              <button
                onClick={handleBack}
                className="w-full btn-secondary py-2 px-4"
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {/* STEP 1: Initial Questions */}
        {step === "initial-questions" && !isLoading && (
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🧠</div>
              <h3 className="text-xl font-bold text-indigo-700">Your Preferences</h3>
              <p className="text-sm text-slate-500 mt-1">Tell us about your learning habits</p>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-600">
                  Step 1: Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium text-slate-600">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              {questions[currentQuestionIndex].question}
            </h2>

            <div className="space-y-3 mb-6">
              {questions[currentQuestionIndex].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectInitialOption(index)}
                  disabled={isLoading}
                  className="w-full p-4 text-left border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-slate-900 font-medium">{option.text}</span>
                </button>
              ))}
            </div>

            {(currentQuestionIndex > 0 || profilingQuestions.length > 0) && (
              <button
                onClick={handleBack}
                className="w-full btn-secondary py-2 px-4"
                disabled={isLoading}
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Category Selection */}
        {step === "category-selection" && !isLoading && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Step 2: Choose a Learning Category (Optional)
            </h2>
            <p className="text-slate-600 mb-8">
              Select a learning category to receive category-specific questions, or skip to start using Lexicon right away.
            </p>

            <div className="space-y-3 mb-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleSelectCategory(category)}
                  disabled={isLoading}
                  className="w-full p-4 text-left border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="text-slate-900 font-bold">{category.name}</p>
                  {category.description && (
                    <p className="text-slate-600 text-sm mt-1">{category.description}</p>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleCompleteOnboarding()}
                disabled={isLoading}
                className="flex-1 btn-primary py-2 px-4"
              >
                Skip & Continue →
              </button>
            </div>

            <button
              onClick={handleBack}
              className="w-full btn-secondary py-2 px-4"
              disabled={isLoading}
            >
              ← Back
            </button>
          </div>
        )}

        {/* STEP 3: Category-Specific Questions */}
        {step === "category-questions" && !isLoading && (
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="text-xl font-bold text-amber-700">{selectedCategory?.name}</h3>
              <p className="text-sm text-slate-500 mt-1">Questions tailored to your subject</p>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-600">
                  Step 3: {selectedCategory?.name} - Question {categoryQuestionIndex + 1} of{" "}
                  {categoryQuestions.length}
                </span>
                <span className="text-sm font-medium text-slate-600">
                  {Math.round(((categoryQuestionIndex + 1) / categoryQuestions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((categoryQuestionIndex + 1) / categoryQuestions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              {categoryQuestions[categoryQuestionIndex].question}
            </h2>

            <div className="space-y-3 mb-6">
              {categoryQuestions[categoryQuestionIndex].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectCategoryOption(index)}
                  disabled={isLoading}
                  className="w-full p-4 text-left border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-slate-900 font-medium">{option.text}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="w-full btn-secondary py-2 px-4"
              disabled={isLoading}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Summary Step */}
        {step === "summary" && (
          <div>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-slate-900">Profile complete!</h2>
              <p className="text-slate-500 mt-1">Here's what we learned about you</p>
            </div>

            <div className="mb-8">
              {profilingQuestions.map((q) => (
                <div key={q.id} className="mb-6">
                  <p className="text-sm font-semibold text-slate-700 mb-2">{q.question}</p>
                  {q.question_type === "open" ? (
                    <p className="text-slate-600 italic bg-slate-50 rounded p-3">
                      {openAnswers[q.id] || <span className="text-slate-400">No answer provided</span>}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(profilingAnswers[q.id] || []).map((optIdx) => (
                        <span
                          key={optIdx}
                          className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                        >
                          {q.options[optIdx]?.text}
                        </span>
                      ))}
                      {(profilingAnswers[q.id] || []).length === 0 && (
                        <span className="text-slate-400 text-sm">No options selected</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full btn-primary py-3 px-4"
            >
              Start Learning →
            </button>
          </div>
        )}

        {/* Loading / Completing State */}
        {isLoading && (step === "loading" || step === "completing") && (
          <div className="text-center py-16 space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin">
                <div className="text-5xl">✨</div>
              </div>
            </div>
            <p className="text-slate-700 font-medium text-lg">
              {step === "completing" ? "Completing your profile..." : "Loading questionnaire..."}
            </p>
            <p className="text-slate-500 text-sm">Just a moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
