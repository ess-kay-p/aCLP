"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopicInput from "@/components/TopicInput";
import ExplanationVariants from "@/components/ExplanationVariants";
import {
  generateVariants,
  selectStyle,
  ExplanationVariants as VariantsType,
} from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "variants">("input");
  const [topic, setTopic] = useState("");
  const [variants, setVariants] = useState<VariantsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTopicSubmit = async (userTopic: string) => {
    setIsLoading(true);
    setError("");
    setTopic(userTopic);

    const result = await generateVariants(userTopic);
    if (result.error) {
      setError(`Error: ${result.error}`);
      setIsLoading(false);
      return;
    }

    if (result.data) {
      setVariants(result.data);
      setStep("variants");
    }
    setIsLoading(false);
  };

  const handleStyleSelect = async (style: string) => {
    setIsLoading(true);
    setError("");

    const result = await selectStyle(topic, style);
    if (result.error) {
      setError(`Error: ${result.error}`);
      setIsLoading(false);
      return;
    }

    if (result.data) {
      // Profile created, redirect to home
      setTimeout(() => {
        router.push("/");
      }, 500);
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    setStep("input");
    setTopic("");
    setVariants(null);
    setError("");
  };

  return (
    <div className="container">
      <header className="text-center mb-12 pt-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Lexicon</h1>
        <p className="text-xl text-gray-600">
          Find your perfect learning style
        </p>
      </header>

      <div className="max-w-2xl mx-auto card">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {step === "input" && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Step 1: Tell us what you want to learn
            </h2>
            <TopicInput
              onSubmit={handleTopicSubmit}
              isLoading={isLoading}
            />
          </div>
        )}

        {step === "variants" && variants && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Step 2: Choose your style
              </h2>
              <button
                onClick={handleReset}
                className="text-gray-600 hover:text-gray-900 text-sm underline"
              >
                ← Back
              </button>
            </div>
            <ExplanationVariants
              topic={variants.topic}
              variants={variants.variants}
              onSelect={handleStyleSelect}
              isLoading={isLoading}
            />
          </div>
        )}

        {isLoading && step === "variants" && (
          <div className="text-center py-8">
            <p className="text-gray-600">Creating your personalized profile...</p>
          </div>
        )}
      </div>
    </div>
  );
}
