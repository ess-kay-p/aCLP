"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getConcepts, getSessionId } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [concepts, setConcepts] = useState<string[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      const sessionId = getSessionId();

      // Check if profile exists by trying to get explanation
      // If API returns 404 for profile, user hasn't completed onboarding
      try {
        // Try to get concepts (always available)
        const conceptsResult = await getConcepts();
        if (conceptsResult.data) {
          setConcepts(conceptsResult.data.concepts);
        }

        // Try to get an explanation to verify profile exists
        const explanationResult = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/explain`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              concept: "acceleration",
            }),
          }
        );

        // If explanation fetch succeeds, profile exists
        if (explanationResult.ok) {
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      } catch (error) {
        // Network error, assume no profile
        setHasProfile(false);
      }

      setIsLoading(false);
    };

    checkProfile();
  }, []);

  const handleConceptClick = (concept: string) => {
    router.push(`/learn/${concept}`);
  };

  const handleStartOnboarding = () => {
    router.push("/onboarding");
  };

  const handleNewSession = () => {
    localStorage.removeItem("lexicon_session_id");
    window.location.reload();
  };

  return (
    <div className="container">
      <header className="text-center mb-12 pt-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Lexicon</h1>
        <p className="text-xl text-gray-600">
          Explanations tailored to your learning style
        </p>
      </header>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : hasProfile ? (
        // User has completed onboarding - Show concepts
        <div className="space-y-8">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🎓 Choose a Concept
            </h2>
            <p className="text-gray-600 mb-6">
              Pick a topic to learn with your personalized explanations
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {concepts.map((concept) => (
                <button
                  key={concept}
                  onClick={() => handleConceptClick(concept)}
                  className="card text-left hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500"
                >
                  <div className="text-4xl mb-3">
                    {concept === "acceleration" && "⚡"}
                    {concept === "energy" && "💡"}
                    {concept === "probability" && "🎲"}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 capitalize">
                    {concept}
                  </h3>
                  <p className="text-gray-600 text-sm mt-2">
                    Learn about {concept.toLowerCase()}
                  </p>
                  <p className="text-blue-500 font-medium text-sm mt-4">
                    Start learning →
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleNewSession}
              className="btn-secondary py-2 px-6 text-sm"
            >
              Reset Profile
            </button>
          </div>
        </div>
      ) : (
        // User hasn't completed onboarding yet - Show welcome screen
        <div className="card text-center space-y-6 max-w-2xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to Lexicon! 👋
            </h2>
            <p className="text-gray-600 text-lg mb-4">
              Let's find the explanation style that works best for you.
            </p>
            <p className="text-gray-500 text-sm">
              We'll ask you one question about how you prefer to learn, then
              personalize all explanations just for you.
            </p>
          </div>

          <button
            onClick={handleStartOnboarding}
            className="btn-primary py-3 px-8 text-lg inline-block"
          >
            Start Personalization →
          </button>

          <p className="text-sm text-gray-500">Takes about 1 minute</p>
        </div>
      )}
    </div>
  );
}
