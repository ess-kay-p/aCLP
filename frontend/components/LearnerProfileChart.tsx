"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface LearnerProfileChartProps {
  vector: number[];
  dimensions?: string[];
  stacked?: boolean;
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
  stacked = false,
}: LearnerProfileChartProps) {
  // Transform vector into radar chart data
  const data = dimensions.map((name, index) => ({
    name,
    score: vector[index] || 0,
    fullMark: 1.0,
  }));

  // Create dimension details with percentages
  const dimensionDetails = dimensions.map((name, index) => ({
    name,
    value: vector[index] || 0,
    percentage: Math.round((vector[index] || 0) * 100),
  }));

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-slate-800 mb-2">
        Your Learning Profile
      </h3>
      <p className="text-sm text-slate-600 mb-6">
        Your preferences across 8 learning dimensions (0% = low, 100% = high)
      </p>

      {stacked ? (
        /* Stacked layout: radar centered on top, 4-col grid below */
        <div className="space-y-6">
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 30, right: 50, bottom: 30, left: 50 }}>
                <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "#666", fontSize: 11 }} angle={0} orientation="outer" />
                <PolarRadiusAxis angle={0} domain={[0, 1]} tick={false} />
                <Radar name="Profile" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {dimensionDetails.map((dim) => (
              <div key={dim.name} className="p-2.5 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg border border-indigo-200">
                <p className="font-semibold text-slate-800 text-xs mb-1 truncate">{dim.name}</p>
                <p className="text-base font-bold text-indigo-600 leading-none mb-1.5">{dim.percentage}%</p>
                <div className="w-full bg-indigo-200 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${dim.percentage}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{dim.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Side-by-side layout: radar left, 2-col grid right */
        <div className="flex gap-8 items-start">
          <div className="flex-shrink-0 w-96 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "#666", fontSize: 11 }} angle={0} orientation="outer" />
                <PolarRadiusAxis angle={0} domain={[0, 1]} tick={false} />
                <Radar name="Profile" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {dimensionDetails.map((dim) => (
              <div key={dim.name} className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-indigo-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-800 text-sm">{dim.name}</span>
                  <span className="text-lg font-bold text-indigo-600">{dim.percentage}%</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${dim.percentage}%` }} />
                </div>
                <span className="text-xs text-slate-600 mt-1 block">{dim.value.toFixed(2)} / 1.00</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
