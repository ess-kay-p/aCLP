/**
 * API client for Lexicon backend
 */
import { getToken, getAuthHeader } from "./auth";

// Ensure HTTPS in production
let API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// Enforce HTTPS for non-localhost URLs regardless of env var configuration
if (API_BASE.startsWith('http://') && !API_BASE.includes('localhost') && !API_BASE.includes('127.0.0.1')) {
  API_BASE = API_BASE.replace('http://', 'https://');
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const fullUrl = `${API_BASE}${endpoint}`;
  const method = options?.method || "GET";

  console.log(`[API] ${method} ${fullUrl}`);
  console.log(`[API] Headers:`, {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options?.headers,
  });
  if (options?.body) {
    console.log(`[API] Body:`, options.body);
  }

  try {
    const authHeader = getAuthHeader();
    const response = await fetch(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...options?.headers,
      },
      ...options,
    });

    console.log(`[API] Response Status: ${response.status} ${response.statusText}`);
    console.log(`[API] Response Headers:`, {
      "content-type": response.headers.get("content-type"),
      "content-length": response.headers.get("content-length"),
    });

    if (!response.ok) {
      const error = await response.text();
      const errorMsg = error || `API error: ${response.status}`;
      console.error(`[API Error] ${method} ${fullUrl} - ${response.status}: ${errorMsg}`);
      console.trace(`[API Error] Stack trace for ${method} ${fullUrl}`);
      return { error: errorMsg };
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    console.log(`[API] ✓ Success:`, data);
    return { data };
  } catch (error) {
    console.error(`[API Exception] ${method} ${fullUrl}:`, error);
    if (error instanceof Error) {
      console.error("[API Exception] Stack trace:", error.stack);
    }
    return { error: `Network error: ${error}` };
  }
}

// Authentication API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<TokenResponse>> {
  return fetchApi<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string
): Promise<ApiResponse<TokenResponse>> {
  return fetchApi<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export interface UserInfo {
  id: number;
  email: string;
  is_admin: boolean;
}

export async function getCurrentUser(): Promise<ApiResponse<UserInfo>> {
  const token = getToken();
  if (!token) {
    return { error: "Not authenticated" };
  }

  return fetchApi<UserInfo>("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function resetUserProfile(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<{ status: string }>("/api/onboarding/reset-profile", {
    method: "POST",
  });
}

// Session management
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("lexicon_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("lexicon_session_id", sessionId);
  }
  return sessionId;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("lexicon_session_id");
  }
}

// Onboarding API - Questionnaire based
export interface Question {
  id: number;
  question: string;
  options: Array<{
    text: string;
    image_url?: string;
    alt_text?: string;
  }>;
  question_type?: string;
  allow_multiple?: boolean;
}

export interface QuestionnaireResponse {
  questions: Question[];
}

function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function getQuestions(
  categoryId?: number,
  questionType?: string
): Promise<ApiResponse<QuestionnaireResponse>> {
  return fetchApi<QuestionnaireResponse>(
    buildUrl("/api/onboarding/questions", { category_id: categoryId, question_type: questionType })
  );
}

export async function getStudentProfile(
  sessionId: string
): Promise<ApiResponse<StudentProfile>> {
  const url = sessionId
    ? `/api/onboarding/profile/${sessionId}`
    : `/api/onboarding/profile`;
  return fetchApi<StudentProfile>(url);
}

export async function checkSessionProfile(
  sessionId: string
): Promise<ApiResponse<{ explanation?: string }>> {
  return fetchApi<{ explanation?: string }>("/api/explain", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      concept: "Photosynthesis",
    }),
  });
}

export interface StudentProfile {
  session_id: string;
  vector: number[];
}

export async function submitAnswers(
  sessionId: string,
  answers: Record<number, number>,
  selectedStyle?: string,
  profilingAnswers?: Record<number, number[]>,
  openAnswers?: Record<number, string>
): Promise<ApiResponse<StudentProfile>> {
  return fetchApi<StudentProfile>("/api/onboarding/submit", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      answers,
      selected_style: selectedStyle,
      profiling_answers: profilingAnswers,
      open_answers: openAnswers,
    }),
  });
}

export interface PersonalizedVariants {
  topic: string;
  variants: Array<{
    style: string;
    text: string;
  }>;
}

export async function generatePersonalizedVariants(
  sessionId: string,
  topic: string,
  categoryId?: number
): Promise<ApiResponse<PersonalizedVariants>> {
  return fetchApi<PersonalizedVariants>("/api/onboarding/generate-personalized", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      topic,
      category_id: categoryId,
    }),
  });
}

export interface PersonalizedExplanation {
  topic: string;
  explanation: string;
  style: string;
  image_url?: string;
  diagram_svg?: string;
}

export async function generatePersonalizedExplanation(
  sessionId: string,
  topic: string,
  categoryId?: number
): Promise<ApiResponse<PersonalizedExplanation>> {
  return fetchApi<PersonalizedExplanation>("/api/onboarding/generate-explanation", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      topic,
      category_id: categoryId,
    }),
  });
}

// Legacy API functions (kept for backward compatibility)
export interface ExplanationVariants {
  topic: string;
  variants: {
    sports: string;
    step_by_step: string;
    narrative: string;
    technical: string;
  };
}

export async function generateVariants(
  topic: string
): Promise<ApiResponse<ExplanationVariants>> {
  return fetchApi<ExplanationVariants>("/api/onboarding/generate", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

export async function selectStyle(
  topic: string,
  selectedStyle: string
): Promise<ApiResponse<StudentProfile>> {
  const sessionId = getSessionId();
  return fetchApi<StudentProfile>("/api/onboarding/select", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      topic,
      selected_style: selectedStyle,
    }),
  });
}

// Concepts API
export async function getConcepts(): Promise<ApiResponse<{ concepts: string[] }>> {
  return fetchApi<{ concepts: string[] }>("/api/concepts");
}

// Explanation API
export interface ExplanationResponse {
  id: number;
  concept: string;
  style: string;
  text: string;
  vector: number[];
}

export async function getExplanation(
  concept: string
): Promise<ApiResponse<ExplanationResponse>> {
  const sessionId = getSessionId();
  return fetchApi<ExplanationResponse>("/api/explain", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      concept,
    }),
  });
}

// Feedback API
export async function submitFeedback(
  concept: string,
  explanationId: number,
  rating: number
): Promise<ApiResponse<StudentProfile>> {
  const sessionId = getSessionId();
  return fetchApi<StudentProfile>("/api/feedback", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      concept,
      explanation_id: explanationId,
      rating,
    }),
  });
}

// Categories API
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_by?: number;
}

export async function getCategories(hasQuestions?: boolean): Promise<ApiResponse<Category[]>> {
  const url = hasQuestions ? "/api/categories/?has_questions=true" : "/api/categories/";
  return fetchApi<Category[]>(url);
}

export async function createCategory(
  name: string,
  description?: string
): Promise<ApiResponse<Category>> {
  return fetchApi<Category>("/api/categories/", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function updateCategory(
  categoryId: number,
  name?: string,
  description?: string
): Promise<ApiResponse<Category>> {
  return fetchApi<Category>(`/api/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify({ name, description }),
  });
}

export async function deleteCategory(categoryId: number): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<{ status: string }>(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });
}

// Questionnaire Management API
export interface QuestionOption {
  text: string;
  dimension_updates: Record<string, number>;
  image_url?: string;
  alt_text?: string;
}

export interface QuestionData {
  id: number;
  question: string;
  options: QuestionOption[];
  category_id?: number;
  question_type?: string;
  allow_multiple?: boolean;
}

export async function getQuestionnaire(
  categoryId?: number,
  questionType?: string
): Promise<ApiResponse<{ questions: QuestionData[] }>> {
  return fetchApi<{ questions: QuestionData[] }>(
    buildUrl("/api/questionnaire/", { category_id: categoryId, question_type: questionType })
  );
}

export async function createQuestion(
  questionData: QuestionData
): Promise<ApiResponse<{ id: number; status: string }>> {
  return fetchApi<{ id: number; status: string }>("/api/questionnaire/", {
    method: "POST",
    body: JSON.stringify(questionData),
  });
}

export async function updateQuestion(
  questionId: number,
  questionData: QuestionData
): Promise<ApiResponse<{ id: number; status: string }>> {
  return fetchApi<{ id: number; status: string }>(
    `/api/questionnaire/${questionId}`,
    {
      method: "PUT",
      body: JSON.stringify(questionData),
    }
  );
}

export async function deleteQuestion(
  questionId: number
): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<{ status: string }>(`/api/questionnaire/${questionId}`, {
    method: "DELETE",
  });
}

export async function resetQuestionnaire(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<{ status: string }>("/api/questionnaire/reset", {
    method: "POST",
  });
}

// Personalization summary API
export async function getPersonalizationSummary(sessionId?: string): Promise<ApiResponse<{ summary: string }>> {
  const url = sessionId
    ? `/api/onboarding/personalization-summary?session_id=${encodeURIComponent(sessionId)}`
    : "/api/onboarding/personalization-summary";
  return fetchApi<{ summary: string }>(url);
}

// Profiling answers API
export async function getProfilingAnswers(sessionId?: string): Promise<ApiResponse<{ answers: Record<string, string> }>> {
  const url = sessionId
    ? `/api/onboarding/profiling-answers?session_id=${encodeURIComponent(sessionId)}`
    : "/api/onboarding/profiling-answers";
  return fetchApi<{ answers: Record<string, string> }>(url);
}

// History API
export interface HistoryItem {
  id: number;
  topic: string;
  explanation: string;
  style: string;
  image_url?: string;
  diagram_svg?: string;
  created_at: string;
}

export async function getHistory(sessionId?: string): Promise<ApiResponse<HistoryItem[]>> {
  const url = sessionId
    ? `/api/history?session_id=${encodeURIComponent(sessionId)}`
    : "/api/history";
  return fetchApi<HistoryItem[]>(url);
}

export async function deleteHistoryItem(
  itemId: number,
  sessionId?: string
): Promise<ApiResponse<{ status: string }>> {
  const url = sessionId
    ? `/api/history/${itemId}?session_id=${encodeURIComponent(sessionId)}`
    : `/api/history/${itemId}`;
  return fetchApi<{ status: string }>(url, { method: "DELETE" });
}

// Health check
export async function healthCheck(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<{ status: string }>("/api/health");
}

// Admin API
export interface AdminUser {
  id: number;
  email: string;
  created_at: string;
  has_vector: boolean;
  has_profile: boolean;
}

export async function adminListUsers(): Promise<ApiResponse<AdminUser[]>> {
  return fetchApi<AdminUser[]>("/api/admin/users");
}

export async function adminGetUserProfile(userId: number): Promise<ApiResponse<{ vector: number[] }>> {
  return fetchApi<{ vector: number[] }>(`/api/admin/users/${userId}/profile`);
}

export async function adminGetUserProfilingAnswers(userId: number): Promise<ApiResponse<{ answers: Record<string, string> }>> {
  return fetchApi<{ answers: Record<string, string> }>(`/api/admin/users/${userId}/profiling-answers`);
}

export async function adminGetUserPersonalizationSummary(userId: number): Promise<ApiResponse<{ summary: string }>> {
  return fetchApi<{ summary: string }>(`/api/admin/users/${userId}/personalization-summary`);
}
