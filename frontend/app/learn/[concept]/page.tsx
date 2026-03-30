"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ExplanationCard from "@/components/ExplanationCard";
import RatingWidget from "@/components/RatingWidget";
import {
  getExplanation,
  submitFeedback,
  ExplanationResponse,
} from "@/lib/api";
import { isAuthenticated, clearToken } from "@/lib/auth";

type PageState = "loading" | "explanation" | "rating" | "submitted" | "error";

export default function LearnPage() {
  const router = useRouter();
  const params = useParams();
  const rawConcept = params.concept as string;
  // Decode the concept name to handle special characters like apostrophes
  const concept = decodeURIComponent(rawConcept);

  const [pageState, setPageState] = useState<PageState>("loading");
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const loadExplanation = async () => {
      const result = await getExplanation(concept);
      if (result.error) {
        setError(result.error);
        setPageState("error");
        return;
      }

      if (result.data) {
        setExplanation(result.data);
        setPageState("explanation");
      }
    };

    loadExplanation();
  }, [concept]);

  const handleRateStart = () => {
    setPageState("rating");
  };

  const handleRating = async (rating: number) => {
    if (!explanation) return;

    setIsSubmitting(true);
    const result = await submitFeedback(concept, explanation.id, rating);

    if (result.error) {
      setError(result.error);
      setPageState("error");
      setIsSubmitting(false);
      return;
    }

    // Profile updated successfully, reload explanation to show improved match
    setPageState("submitted");

    setTimeout(async () => {
      // Fetch the new best-matched explanation with updated profile
      const newExplanation = await getExplanation(concept);
      if (newExplanation.data) {
        setExplanation(newExplanation.data);
        setPageState("explanation");
      }
      // Reset submitting state
      setIsSubmitting(false);
    }, 1500);
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("lexicon_session_id");
    router.push("/login");
  };

  return (
    <div className="container">
      <header className="mb-8 pt-8">
        <div className="flex justify-between items-start mb-4">
          <button
            onClick={() => router.push("/")}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            ← Back to concepts
          </button>
          {isMounted && isAuthenticated() && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
        <h1 className="text-center text-4xl font-bold text-gray-900 capitalize">
          Learn {concept}
        </h1>
      </header>

      <div className="max-w-2xl mx-auto">
        {pageState === "loading" && (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">
              Finding the best explanation for you...
            </p>
          </div>
        )}

        {pageState === "error" && (
          <div className="card space-y-4">
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-bold mb-2">Error</p>
              <p>{error}</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="btn-primary w-full py-2"
            >
              Return Home
            </button>
          </div>
        )}

        {pageState === "explanation" && explanation && (
          <ExplanationCard
            concept={explanation.concept}
            style={explanation.style}
            text={explanation.text}
            onRateStart={handleRateStart}
          />
        )}

        {pageState === "rating" && (
          <RatingWidget
            onSubmit={handleRating}
            isLoading={isSubmitting}
          />
        )}

        {pageState === "submitted" && (
          <div className="card text-center space-y-4">
            <p className="text-2xl">✓ Thank you for your feedback!</p>
            <p className="text-gray-600">
              Your profile has been updated. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
