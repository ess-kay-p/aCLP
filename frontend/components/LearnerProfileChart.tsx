"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LearnerProfileChartProps {
  vector: number[];
  dimensions?: string[];
}

const DEFAULT_DIMENSIONS = [
  "Sports",
  "Systems",
  "Visual",
  "Narrative",
  "Analogy",
  "Step-by-Step",
  "Academic",
  "Simple",
];

export default function LearnerProfileChart({
  vector,
  dimensions = DEFAULT_DIMENSIONS,
}: LearnerProfileChartProps) {
  // Transform vector into radar chart data
  const data = dimensions.map((name, index) => ({
    name,
    score: vector[index] || 0,
    fullMark: 1.0,
  }));

  return (
    <div className="w-full h-96 flex flex-col items-center">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Your Learning Profile
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: "#666", fontSize: 12 }}
            angle={90}
            orientation="outer"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tick={{ fill: "#999", fontSize: 10 }}
          />
          <Radar
            name="Profile"
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-500 mt-4">
        Your preferences across 8 learning dimensions (0.0 = low, 1.0 = high)
      </p>
    </div>
  );
}
