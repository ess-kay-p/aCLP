"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentProfile, resetUserProfile, getCurrentUser, getCategories, generatePersonalizedExplanation, getSessionId } from "@/lib/api";
import { isAuthenticated, clearToken } from "@/lib/auth";
import LearnerProfileChart from "@/components/LearnerProfileChart";
import { Category } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileVector, setProfileVector] = useState<number[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Ask question state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState<{
    topic: string;
    explanation: string;
    style: string;
  } | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        if (isAuthenticated()) {
          const userResult = await getCurrentUser();
          if (userResult.data && userResult.data.is_admin) {
            setIsAdmin(true);
            router.push("/settings");
            return;
          }

          const categoriesResult = await getCategories();
          if (categoriesResult.data) {
            setCategories(categoriesResult.data);
          }

          const profileResult = await getStudentProfile("");
          if (profileResult.data) {
            setHasProfile(true);
            setProfileVector(profileResult.data.vector);
          } else {
            setHasProfile(false);
          }
        } else {
          const sessionId = localStorage.getItem("lexicon_session_id");
          if (!sessionId) {
            setIsLoading(false);
            router.push("/login");
            return;
          }

          const explanationResult = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/explain`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: sessionId,
                concept: "Photosynthesis",
              }),
            }
          );

          if (explanationResult.ok) {
            setHasProfile(true);

            try {
              const profileResult = await getStudentProfile(sessionId);
              if (profileResult.data) {
                setProfileVector(profileResult.data.vector);
              }
            } catch (err) {
              console.log("Could not fetch profile vector");
            }
          } else {
            setHasProfile(false);
          }
        }
      } catch (error) {
        setHasProfile(false);
      }

      setIsLoading(false);
    };

    checkProfile();
  }, [router]);

  const handleStartOnboarding = () => {
    router.push("/onboarding");
  };

  const handleResetProfile = async () => {
    if (isAuthenticated()) {
      await resetUserProfile();
    }
    localStorage.removeItem("lexicon_session_id");
    window.location.reload();
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("lexicon_session_id");
    router.push("/login");
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setExplanationError("Please enter a question");
      return;
    }

    setIsGeneratingExplanation(true);
    setExplanationError("");

    try {
      const sessionId = getSessionId();
      const result = await generatePersonalizedExplanation(
        sessionId,
        question
      );

      if (result.error) {
        setExplanationError(result.error);
        setIsGeneratingExplanation(false);
        return;
      }

      if (result.data) {
        setExplanation(result.data);
        setQuestion("");
      }

      setIsGeneratingExplanation(false);
    } catch (err) {
      setExplanationError("Failed to generate explanation");
      setIsGeneratingExplanation(false);
    }
  };

  const handleClearExplanation = () => {
    setExplanation(null);
    setExplanationError("");
  };

  const wrapperClassName = isGeneratingExplanation ? "pointer-events-none opacity-50" : "";

  return (
    <div className={wrapperClassName}>
      <div className="container">
        <header className="mb-12 pt-8 border-b border-slate-200 pb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">📚 Lexicon</h1>
              <p className="text-slate-600 mt-1">Explanations tailored to your learning style</p>
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

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block">
              <div className="animate-spin mb-4">
                <div className="text-5xl">✨</div>
              </div>
              <p className="text-slate-600 font-medium">Loading your profile...</p>
            </div>
          </div>
        ) : hasProfile ? (
          <div className="space-y-8">
            {profileVector.length > 0 && (
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Your Learning Profile</h2>
                  <button
                    onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                    className="text-slate-600 hover:text-slate-900 transition"
                  >
                    <span className={`inline-block transition ${isProfileExpanded ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>
                </div>
                {isProfileExpanded && <LearnerProfileChart vector={profileVector} />}
              </div>
            )}

            {!explanation && !isGeneratingExplanation && (
              <div className="card">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  ❓ Ask a Question
                </h2>
                <p className="text-slate-600 mb-6">
                  Ask about any topic and get a personalized explanation tailored to your learning style.
                </p>

                {explanationError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
                    {explanationError}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Your Question
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., How does photosynthesis work? What is quantum entanglement?"
                      className="w-full border border-slate-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 resize-none"
                      rows={4}
                      disabled={isGeneratingExplanation}
                    />
                  </div>

                  <button
                    onClick={handleAskQuestion}
                    disabled={isGeneratingExplanation || !question.trim()}
                    className="w-full btn-primary py-3 px-4 font-medium"
                  >
                    Get Explanation →
                  </button>
                </div>
              </div>
            )}

            {isGeneratingExplanation && (
              <div className="card text-center py-16 space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin">
                    <div className="text-5xl">✨</div>
                  </div>
                </div>
                <p className="text-slate-700 font-medium text-lg">
                  Generating your personalized explanation...
                </p>
                <p className="text-slate-500 text-sm">
                  This usually takes 5-10 seconds
                </p>
              </div>
            )}

            {explanation && (
              <div className="card">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Your Explanation</h2>
                  <button
                    onClick={handleClearExplanation}
                    className="text-slate-400 hover:text-slate-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Question</p>
                    <p className="text-lg font-semibold text-slate-900">{explanation.topic}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Learning Style</p>
                    <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium text-sm capitalize">
                      {explanation.style.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Explanation</p>
                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {explanation.explanation}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClearExplanation}
                  className="w-full btn-primary py-3 px-4 font-medium"
                >
                  Ask Another Question ↻
                </button>
              </div>
            )}

            <div className="text-center pb-8">
              <button
                onClick={handleResetProfile}
                className="btn-secondary"
              >
                Reset Profile
              </button>
            </div>
          </div>
        ) : isMounted && isAuthenticated() ? (
          <div className="max-w-2xl mx-auto card text-center py-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Welcome to Lexicon! 👋
            </h2>
            <p className="text-slate-600 text-lg mb-6">
              Let's personalize your learning experience.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Answer a few quick questions about your learning preferences, and we'll
              personalize all explanations just for you.
            </p>

            <button
              onClick={handleStartOnboarding}
              className="btn-primary py-3 px-8 text-lg inline-block font-medium"
            >
              Start Personalization →
            </button>

            <p className="text-sm text-slate-500 mt-4">Takes about 1 minute</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
