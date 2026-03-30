"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { setToken } from "@/lib/auth";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(email, password);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        setToken(result.data.access_token);
        router.push("/onboarding");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full card">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📚 Lexicon</h1>
          <p className="text-slate-600">Create your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
            <p className="mt-2 text-xs text-slate-500">At least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 font-medium"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </Link>
          </p>

          <button
            onClick={() => router.push("/")}
            className="w-full text-center text-sm text-slate-600 hover:text-slate-800"
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}
