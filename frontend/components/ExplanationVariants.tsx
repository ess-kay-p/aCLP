"use client";

import { useState } from "react";

interface ExplanationVariantsProps {
  topic: string;
  variants: {
    sports: string;
    step_by_step: string;
    narrative: string;
    technical: string;
  };
  onSelect: (style: string) => void;
  isLoading: boolean;
}

const styleInfo = {
  sports: { label: "Sports Analogy", icon: "🏀" },
  step_by_step: { label: "Step-by-Step", icon: "📋" },
  narrative: { label: "Story", icon: "📖" },
  technical: { label: "Technical", icon: "🔬" },
};

export default function ExplanationVariants({
  topic,
  variants,
  onSelect,
  isLoading,
}: ExplanationVariantsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Topic: {topic}</h2>
        <p className="text-gray-600">
          Choose the explanation style that resonates with you most:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(variants) as Array<[keyof typeof variants, string]>).map(
          ([style, text]) => (
            <StyleCard
              key={style}
              style={style}
              text={text}
              onSelect={onSelect}
              isLoading={isLoading}
            />
          )
        )}
      </div>
    </div>
  );
}

interface StyleCardProps {
  style: keyof typeof styleInfo;
  text: string;
  onSelect: (style: string) => void;
  isLoading: boolean;
}

function StyleCard({ style, text, onSelect, isLoading }: StyleCardProps) {
  const info = styleInfo[style];

  return (
    <button
      onClick={() => onSelect(style)}
      disabled={isLoading}
      className="card text-left hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col h-full"
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{info.icon}</span>
        <h3 className="text-lg font-bold text-gray-800">{info.label}</h3>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed flex-grow max-h-40 overflow-y-auto mb-4">{text}</p>
      <div className="mt-auto text-blue-500 font-medium text-sm">
        Click to select →
      </div>
    </button>
  );
}
