"use client";

import { useState } from "react";

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  isLoading: boolean;
}

export default function TopicInput({ onSubmit, isLoading }: TopicInputProps) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-4">
        <div>
          <label htmlFor="topic" className="block text-lg font-medium text-slate-700 mb-2">
            What would you like to learn?
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="E.g., 'Why does a car accelerate when I press the gas pedal?' or 'What is energy?'"
            className="w-full p-4 border-2 border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Generating explanations..." : "Get Explanations"}
        </button>
      </div>
    </form>
  );
}
