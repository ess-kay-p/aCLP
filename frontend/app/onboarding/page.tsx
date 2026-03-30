"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getQuestions, submitAnswers, generatePersonalizedVariants, getSessionId } from "@/lib/api";
import LearnerProfileChart from "@/components/LearnerProfileChart";

interface Question {
  id: number;
  question: string;
  options: Array<{
    text: string;
  }>;
}

interface Variant {
  style: string;
  text: string;
}

type OnboardingStep = "questions" | "profile" | "topic" | "variants" | "loading";

export default function OnboardingPage() {
  const router = useRouter();

  // Questions step
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // Topic step
  const [topic, setTopic] = useState("");

  // Variants step
  const [variants, setVariants] = useState<Variant[]>([]);

  // Profile vector (from questionnaire)
  const [profileVector, setProfileVector] = useState<number[]>([]);

  // General state
  const [step, setStep] = useState<OnboardingStep>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load questions on mount
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
          setStep("questions");
          setIsLoading(false);
        }
      } catch (err) {
        setError("Failed to load questionnaire");
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  // Handle question option selection
  const handleSelectOption = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: optionIndex,
    };
    setAnswers(newAnswers);

    // Move to next question or show profile
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Last question - calculate and show profile
      calculateAndShowProfile(newAnswers);
    }
  };

  // Calculate profile from answers and show profile chart
  const calculateAndShowProfile = async (finalAnswers: Record<number, number>) => {
    setIsLoading(true);
    try {
      const sessionId = getSessionId();
      const result = await submitAnswers(sessionId, finalAnswers);
      if (result.error) {
        setError(`Error creating profile: ${result.error}`);
        setIsLoading(false);
        return;
      }
      if (result.data) {
        setProfileVector(result.data.vector);
        setStep("profile");
      }
    } catch (err) {
      setError("Failed to create profile");
    }
    setIsLoading(false);
  };

  // Move from profile to topic
  const handleContinueToTopic = () => {
    setStep("topic");
  };

  // Handle topic submission
  const handleTopicSubmit = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic or question");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const sessionId = getSessionId();

      // Generate variants based on profile + topic
      const variantsResult = await generatePersonalizedVariants(sessionId, topic);
      if (variantsResult.error) {
        setError(`Error generating variants: ${variantsResult.error}`);
        setIsLoading(false);
        return;
      }

      if (variantsResult.data && variantsResult.data.variants) {
        setVariants(variantsResult.data.variants);
        setStep("variants");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to generate explanations");
      setIsLoading(false);
    }
  };

  // Handle variant selection
  const handleSelectVariant = async (selectedStyle: string) => {
    setIsLoading(true);
    setError("");

    try {
      const sessionId = getSessionId();

      // Update profile based on selected variant
      const result = await submitAnswers(sessionId, answers, selectedStyle);
      if (result.error) {
        setError(`Error updating profile: ${result.error}`);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        // Profile updated, redirect to home
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (err) {
      setError("Failed to complete onboarding");
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "questions" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (step === "profile") {
      setStep("questions");
      setCurrentQuestionIndex(questions.length - 1);
    } else if (step === "topic") {
      setStep("profile");
    } else if (step === "variants") {
      setStep("topic");
    }
  };

  if (isLoading && step === "loading") {
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

        {/* STEP 1: Questions */}
        {step === "questions" && !isLoading && (
          <div>
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-8">
              {questions[currentQuestionIndex].question}
            </h2>

            <div className="space-y-3 mb-6">
              {questions[currentQuestionIndex].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOption(index)}
                  disabled={isLoading}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-gray-900 font-medium">{option.text}</span>
                </button>
              ))}
            </div>

            {currentQuestionIndex > 0 && (
              <button
                onClick={handleBack}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Profile Visualization */}
        {step === "profile" && !isLoading && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Step 2: Your Learning Profile
            </h2>
            <p className="text-gray-600 mb-6">
              Based on your answers, here's your personalized learning profile. The chart shows your preferences across 8 learning dimensions.
            </p>

            <LearnerProfileChart vector={profileVector} />

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">What this means:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Higher values</strong> = stronger preference for that learning style</li>
                <li>• All values start at 0.5 baseline and adapt based on your answers</li>
                <li>• Your explanations will be customized to match your profile</li>
                <li>• Your profile improves as you rate explanations</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                ← Back
              </button>
              <button
                onClick={handleContinueToTopic}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Topic Input */}
        {step === "topic" && !isLoading && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Step 3: What would you like to learn about?
            </h2>
            <p className="text-gray-600 mb-6">
              Enter a topic or question you'd like to explore. We'll generate personalized explanations based on your learning style.
            </p>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., How does photosynthesis work? What is gravity? How does compound interest affect my savings?"
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 mb-6"
              rows={4}
              disabled={isLoading}
            />

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                ← Back
              </button>
              <button
                onClick={handleTopicSubmit}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={isLoading || !topic.trim()}
              >
                Generate Explanations →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 Loading */}
        {step === "topic" && isLoading && (
          <div className="text-center py-12 space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin">
                <div className="text-4xl">✨</div>
              </div>
            </div>
            <p className="text-gray-700 font-medium">
              Generating personalized explanations...
            </p>
            <p className="text-gray-500 text-sm">
              This usually takes 5-10 seconds
            </p>
          </div>
        )}

        {/* STEP 4: Variant Selection */}
        {step === "variants" && !isLoading && variants.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Step 4: Choose your favorite explanation
            </h2>
            <p className="text-gray-600 mb-6">
              We've generated 4 different explanations for you. Pick the one that resonates most with your learning style.
            </p>

            <div className="space-y-4 mb-6">
              {variants.map((variant, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectVariant(variant.style)}
                  disabled={isLoading}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-bold text-gray-800 mb-2 capitalize">{variant.style.replace(/_/g, " ")}</p>
                  <div className="text-gray-600 text-sm max-h-32 overflow-y-auto">
                    <p>{variant.text}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Variants Loading */}
        {step === "variants" && isLoading && (
          <div className="text-center py-12 space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin">
                <div className="text-4xl">⚙️</div>
              </div>
            </div>
            <p className="text-gray-700 font-medium">
              Creating your personalized profile...
            </p>
            <p className="text-gray-500 text-sm">
              Just a moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
