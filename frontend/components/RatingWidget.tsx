"use client";

import { useState } from "react";

interface RatingWidgetProps {
  onSubmit: (rating: number) => void;
  isLoading: boolean;
}

export default function RatingWidget({ onSubmit, isLoading }: RatingWidgetProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    setTimeout(() => onSubmit(rating), 200);
  };

  return (
    <div className="card text-center space-y-4">
      <h3 className="text-xl font-bold text-gray-800">
        How well did this explanation work for you?
      </h3>

      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleRate(rating)}
            onMouseEnter={() => setHoveredRating(rating)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={isLoading}
            className="text-4xl transition-transform hover:scale-125 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              className={
                rating <= (hoveredRating || selectedRating)
                  ? "text-yellow-400"
                  : "text-gray-300"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-600 min-h-6">
        {selectedRating > 0 && !isLoading && (
          <p className="font-medium">
            Submitted: {selectedRating} star{selectedRating !== 1 ? "s" : ""}
          </p>
        )}
        {isLoading && <p>Updating your profile...</p>}
      </div>
    </div>
  );
}
