"use client";

import { useEffect, useState } from "react";
import { getHistory, deleteHistoryItem, HistoryItem } from "@/lib/api";

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectItem: (item: HistoryItem) => void;
  sessionId?: string;
  refreshTick: number;
}

export default function HistorySidebar({
  isOpen,
  onToggle,
  onSelectItem,
  sessionId,
  refreshTick,
}: HistorySidebarProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      const result = await getHistory(sessionId);
      if (result.data) {
        setItems(result.data);
      }
      setIsLoading(false);
    };

    fetchHistory();
  }, [isOpen, refreshTick, sessionId]);

  const handleDelete = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setDeletingId(item.id);
    const result = await deleteHistoryItem(item.id, sessionId);
    if (!result.error) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setDeletingId(null);
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full w-72 bg-white border-l border-slate-200 shadow-lg flex flex-col z-20 transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">History</h2>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          aria-label="Close history"
        >
          ✕
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse space-y-1">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm px-4 text-center">
            No history yet. Ask a question to get started.
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => onSelectItem(item)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-start gap-2 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.topic}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[10px] capitalize">
                        {item.style.replace(/_/g, " ")}
                      </span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, item)}
                    disabled={deletingId === item.id}
                    className="flex-shrink-0 text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 mt-0.5"
                    aria-label="Delete history item"
                  >
                    {deletingId === item.id ? (
                      <span className="inline-block animate-spin text-xs">⟳</span>
                    ) : (
                      "✕"
                    )}
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
