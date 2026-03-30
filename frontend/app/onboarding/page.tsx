"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getQuestions, submitAnswers, getSessionId } from "@/lib/api";

interface Question {
  id: number;
  question: string;
  options: Array<{
    text: string;
  }>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const result = await getQuestions();
        if (result.error) {
          setError(`Failed to load questions: ${result.error}`);
          setIsLoading(false);
          return;
        }
        if (result.data && result.data.questions) {
          setQuestions(result.data.questions);
          setIsLoading(false);
        }
      } catch (err) {
        setError("Failed to load questionnaire");
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  const handleSelectOption = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });

    // Move to next question or submit
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const sessionId = getSessionId();
      const result = await submitAnswers(sessionId, answers);

      if (result.error) {
        setError(`Error creating profile: ${result.error}`);
        setIsSubmitting(false);
        return;
      }

      if (result.data) {
        // Profile created successfully, redirect to home
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (err) {
      setError("Failed to create profile");
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Lexicon</h1>
          <p className="text-xl text-gray-600">
            Personalized learning starts here
          </p>
        </header>

        <div className="max-w-2xl mx-auto card text-center py-12">
          <p className="text-gray-600">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Lexicon</h1>
        </header>

        <div className="max-w-2xl mx-auto card text-center py-12">
          <p className="text-gray-600">Failed to load questionnaire</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="container">
      <header className="text-center mb-12 pt-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Lexicon</h1>
        <p className="text-xl text-gray-600">
          Let's find your perfect learning style
        </p>
      </header>

      <div className="max-w-2xl mx-auto card">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isSubmitting ? (
          <div className="text-center py-12 space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin">
                <div className="text-4xl">✨</div>
              </div>
            </div>
            <p className="text-gray-700 font-medium">
              Creating your personalized profile...
            </p>
            <p className="text-gray-500 text-sm">
              Just a moment
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-8">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOption(index)}
                  disabled={isSubmitting}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-gray-900 font-medium">
                    {option.text}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              {currentQuestionIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
              )}
              {currentQuestionIndex === questions.length - 1 && answers[currentQuestion.id] !== undefined && (
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Complete Onboarding
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
