"use client";

interface ExplanationCardProps {
  concept: string;
  style: string;
  text: string;
  onRateStart: () => void;
}

const styleEmojis: Record<string, string> = {
  sports: "🏀",
  step_by_step: "📋",
  narrative: "📖",
  technical: "🔬",
  visual: "🎨",
};

export default function ExplanationCard({
  concept,
  style,
  text,
  onRateStart,
}: ExplanationCardProps) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">{styleEmojis[style] || "💡"}</span>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 capitalize">
            {concept}
          </h2>
          <p className="text-gray-600 capitalize">
            {style === "step_by_step" ? "Step-by-Step" : style} Explanation
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-500 max-h-96 overflow-y-auto">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
          {text}
        </p>
      </div>

      <button
        onClick={onRateStart}
        className="btn-primary w-full py-3 text-lg mt-6"
      >
        Rate This Explanation ⭐
      </button>
    </div>
  );
}
