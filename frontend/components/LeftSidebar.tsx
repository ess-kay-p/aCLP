"use client";

import { useEffect, useRef, useState } from "react";
import {
  getHistory,
  deleteHistoryItem,
  getProfilingAnswers,
  getPersonalizationSummary,
  HistoryItem,
} from "@/lib/api";
import LearnerProfileChart from "@/components/LearnerProfileChart";

interface LeftSidebarProps {
  profileVector: number[];
  sessionId?: string;
  refreshTick: number;
  onResetProfile: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
}

type PanelType = "style" | "profiling" | "vector";

// ---------- Side Panel ----------

interface SidePanelProps {
  title: string;
  arrowTop: number;
  panelWidth: number;
  onClose: () => void;
  children: React.ReactNode;
}

function SidePanel({ title, arrowTop, panelWidth, onClose, children }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Always start panel near top of viewport for maximum height — arrow still points at trigger
  const MARGIN = 16;
  const panelTop = MARGIN;
  const arrowRelative = arrowTop - panelTop;
  const maxHeight = `calc(100vh - ${MARGIN * 2}px)`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onMouse = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed bg-white border border-slate-200 rounded-r-2xl shadow-2xl z-20 flex flex-col"
      style={{ left: 256, top: panelTop, width: panelWidth, maxHeight }}
    >
      {/* Arrow pointing left — border layer */}
      <div
        className="absolute pointer-events-none"
        style={{ top: arrowRelative - 11, left: -12 }}
      >
        <div className="w-0 h-0" style={{
          borderTop: "12px solid transparent",
          borderBottom: "12px solid transparent",
          borderRight: "12px solid #e2e8f0",
        }} />
      </div>
      {/* Arrow — fill layer */}
      <div
        className="absolute pointer-events-none"
        style={{ top: arrowRelative - 10, left: -10 }}
      >
        <div className="w-0 h-0" style={{
          borderTop: "11px solid transparent",
          borderBottom: "11px solid transparent",
          borderRight: "11px solid white",
        }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none" aria-label="Close">
          ✕
        </button>
      </div>

      {/* Content — grows naturally, scrolls only if it exceeds viewport */}
      <div className="overflow-y-auto px-5 py-4">{children}</div>
    </div>
  );
}

// ---------- Panel Contents ----------

const STYLE_SECTIONS = [
  { key: "learning_style", icon: "🎯", label: "Learning Style",     color: "bg-indigo-50 border-indigo-200" },
  { key: "what_works",     icon: "✅", label: "What Works For You", color: "bg-green-50 border-green-200" },
  { key: "complexity",     icon: "📈", label: "Complexity Level",   color: "bg-blue-50 border-blue-200" },
  { key: "avoid",          icon: "⚠️", label: "What to Avoid",      color: "bg-amber-50 border-amber-200" },
  { key: "unique_trait",   icon: "✨", label: "Your Unique Trait",  color: "bg-purple-50 border-purple-200" },
] as const;

function StyleContent({ summary, loading }: { summary: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0,1,2,3,4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-2">
            <div className="h-3.5 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  // Try to parse as JSON sections
  let sections: Record<string, string> | null = null;
  try {
    if (summary.trim().startsWith("{")) {
      sections = JSON.parse(summary);
    }
  } catch {}

  if (sections) {
    return (
      <div className="space-y-3">
        {STYLE_SECTIONS.map(({ key, icon, label, color }) => {
          const text = sections![key];
          if (!text) return null;
          return (
            <div key={key} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>{icon}</span>{label}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: plain text
  return <p className="text-sm text-slate-700 leading-relaxed">{summary || "No personalization data yet."}</p>;
}

function ProfilingContent({ sessionId }: { sessionId?: string }) {
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfilingAnswers(sessionId).then((res) => {
      setAnswers(res.data?.answers || {});
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-8 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(answers || {});
  if (!entries.length) return <p className="text-sm text-slate-400">No profiling answers found.</p>;

  return (
    <div className="space-y-5">
      {entries.map(([question, answer], i) => (
        <div key={i}>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Q{i + 1}</p>
          <p className="text-sm font-medium text-slate-800 mb-2 whitespace-nowrap overflow-hidden text-ellipsis" title={question}>{question}</p>
          <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
            {answer}
          </div>
        </div>
      ))}
    </div>
  );
}

function VectorContent({ vector }: { vector: number[] }) {
  return <LearnerProfileChart vector={vector} stacked />;
}

// ---------- Main Sidebar ----------

export default function LeftSidebar({
  profileVector,
  sessionId,
  refreshTick,
  onResetProfile,
  onSelectHistoryItem,
}: LeftSidebarProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retakeConfirm, setRetakeConfirm] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const [arrowTop, setArrowTop] = useState(0);
  const [richSummary, setRichSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);

  const openPanel = (type: PanelType, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setArrowTop(rect.top + rect.height / 2);
    setActivePanel(type);
    // If summary hasn't loaded yet, retry on open
    if (type === "style" && !richSummary && !summaryLoading) {
      setSummaryLoading(true);
      getPersonalizationSummary(sessionId).then((res) => {
        if (res.data?.summary) setRichSummary(res.data.summary);
        setSummaryLoading(false);
      });
    }
  };

  // Re-fetch history whenever a new explanation is generated (refreshTick) or session changes
  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      const res = await getHistory(sessionId);
      if (res.data) setItems(res.data);
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [refreshTick, sessionId]);

  // Fetch summary once when profile is ready; re-fetch if session changes
  useEffect(() => {
    const fetchSummary = async () => {
      setSummaryLoading(true);
      const res = await getPersonalizationSummary(sessionId);
      if (res.data?.summary) setRichSummary(res.data.summary);
      setSummaryLoading(false);
    };
    fetchSummary();
  }, [sessionId]);

  const handleDelete = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setDeletingId(item.id);
    const res = await deleteHistoryItem(item.id, sessionId);
    if (!res.error) setItems((prev) => prev.filter((i) => i.id !== item.id));
    setDeletingId(null);
  };

  const PANEL_CONFIG: Record<PanelType, { title: string; panelWidth: number }> = {
    style:     { title: "✨ Your Learning Style",     panelWidth: 560 },
    profiling: { title: "🧠 Your Profiling Answers",  panelWidth: 640 },
    vector:    { title: "📊 Learning Profile Graph",  panelWidth: 720 },
  };

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-30">
        {/* Brand */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-900">📚 Lexicon</h1>
          <p className="text-xs text-slate-400 mt-0.5">Personalized learning</p>
        </div>

        {/* Profile buttons */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 space-y-1">
          {(["style", "profiling", "vector"] as PanelType[]).map((type) => {
            const icons: Record<PanelType, string> = { style: "✨", profiling: "🧠", vector: "📊" };
            const labels: Record<PanelType, string> = {
              style: "Your Learning Style",
              profiling: "View Profiling Answers",
              vector: "Learning Profile Graph",
            };
            return (
              <button
                key={type}
                onClick={(e) => openPanel(type, e)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  activePanel === type
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="text-base">{icons[type]}</span>
                <span>{labels[type]}</span>
              </button>
            );
          })}
        </div>

        {/* Recent history */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Recent</p>
          </div>
          {historyLoading ? (
            <div className="px-4 py-2 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">No history yet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-slate-50 last:border-0 group flex items-start hover:bg-slate-50 transition">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { onSelectHistoryItem(item); setActivePanel(null); }}
                    onKeyDown={(e) => e.key === "Enter" && onSelectHistoryItem(item)}
                    className="flex-1 min-w-0 text-left px-4 py-2.5 cursor-pointer"
                  >
                    <p className="text-xs font-medium text-slate-700 truncate">{item.topic}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="inline-block px-1 py-0.5 bg-indigo-50 text-indigo-400 rounded capitalize">
                        {item.style.replace(/_/g, " ")}
                      </span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, item)}
                    disabled={deletingId === item.id}
                    className="flex-shrink-0 self-center mr-3 text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-xs"
                    aria-label="Delete"
                  >
                    {deletingId === item.id ? <span className="animate-spin inline-block">⟳</span> : "✕"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Retake Test */}
        <div className="px-4 py-4 border-t border-slate-200 flex-shrink-0">
          {retakeConfirm ? (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-600 font-medium">Reset your profile and retake the test?</p>
              <div className="flex gap-2">
                <button
                  onClick={onResetProfile}
                  className="flex-1 text-xs py-2 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 active:bg-red-700 transition font-semibold shadow-sm"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setRetakeConfirm(false)}
                  className="flex-1 text-xs py-2 px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRetakeConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 active:bg-red-200 transition shadow-sm"
            >
              <span className="text-base">↺</span>
              <span>Retake Test</span>
            </button>
          )}
        </div>
      </aside>

      {activePanel && (
        <SidePanel
          title={PANEL_CONFIG[activePanel].title}
          arrowTop={arrowTop}
          panelWidth={PANEL_CONFIG[activePanel].panelWidth}
          onClose={() => setActivePanel(null)}
        >
          {activePanel === "style"     && <StyleContent summary={richSummary} loading={summaryLoading} />}
          {activePanel === "profiling" && <ProfilingContent sessionId={sessionId} />}
          {activePanel === "vector"    && <VectorContent vector={profileVector} />}
        </SidePanel>
      )}
    </>
  );
}
