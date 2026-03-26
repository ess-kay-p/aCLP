"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getConcepts, getSessionId } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [concepts, setConcepts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const sessionId = getSessionId();
      // Check if user has completed onboarding by trying to get concepts
      const result = await getConcepts();
      if (result.data) {
        setConcepts(result.data.concepts);
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const handleConceptClick = (concept: string) => {
    router.push(`/learn/${concept}`);
  };

  const handleNewSession = () => {
    localStorage.removeItem("lexicon_session_id");
    router.push("/onboarding");
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
      ) : concepts.length > 0 ? (
        <div className="space-y-8">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Choose a Concept
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {concepts.map((concept) => (
                <button
                  key={concept}
                  onClick={() => handleConceptClick(concept)}
                  className="card text-left hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500"
                >
                  <div className="text-4xl mb-3">
                    {concept === "acceleration" && "⚡"}
                    {concept === "energy" && "⚡"}
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
              Start New Session
            </button>
          </div>
        </div>
      ) : (
        <div className="card text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to Lexicon!
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              Let's find the explanation style that works best for you.
            </p>
          </div>
          <button
            onClick={() => router.push("/onboarding")}
            className="btn-primary py-3 px-8 text-lg inline-block"
          >
            Start Learning →
          </button>
        </div>
      )}
    </div>
  );
}
