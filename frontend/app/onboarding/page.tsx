"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getQuestions,
  submitAnswers,
  getCategories,
  getSessionId,
  Category,
} from "@/lib/api";
import { isAuthenticated, clearToken } from "@/lib/auth";

interface Question {
  id: number;
  question: string;
  options: Array<{
    text: string;
  }>;
}

type OnboardingStep = "initial-questions" | "category-selection" | "category-questions" | "loading" | "completing";

export default function OnboardingPage() {
  const router = useRouter();

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
        const questionsResult = await getQuestions();
        if (questionsResult.error) {
          setError(`Failed to load questions: ${questionsResult.error}`);
          setIsLoading(false);
          return;
        }
        if (questionsResult.data && questionsResult.data.questions) {
          setQuestions(questionsResult.data.questions);
        }

        const categoriesResult = await getCategories();
        if (categoriesResult.error) {
          setError(`Failed to load categories: ${categoriesResult.error}`);
          setIsLoading(false);
          return;
        }
        if (categoriesResult.data) {
          setCategories(categoriesResult.data);
        }

        setStep("initial-questions");
        setIsLoading(false);
      } catch (err) {
        setError("Failed to load onboarding data");
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleSelectInitialOption = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
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
      } else {
        setStep("topic-input");
      }
      setIsLoading(false);
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

      const profileResult = await submitAnswers(sessionId, allAnswers);
      if (profileResult.error) {
        setError(`Error creating profile: ${profileResult.error}`);
        setIsLoading(false);
        setStep(selectedCategory ? "category-questions" : "category-selection");
        return;
      }

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err) {
      setError("Failed to complete onboarding");
      setIsLoading(false);
      setStep(selectedCategory ? "category-questions" : "category-selection");
    }
  };

  const handleBack = () => {
    if (step === "initial-questions" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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

  if (questions.length === 0 && step !== "category-selection") {
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

        {/* STEP 1: Initial Questions */}
        {step === "initial-questions" && !isLoading && (
          <div>
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

            {currentQuestionIndex > 0 && (
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
