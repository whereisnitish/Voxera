import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Lock, User, AlertCircle } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";

export function SignupPage() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signup(email, password, fullName || undefined);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign up failed");
    }
  }

  return (
    <AuthShell>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-sm text-muted mt-1.5">Spin up your first voice agent in minutes.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 mt-8">
        <div>
          <label className="label mb-1.5">Full name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="input pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Creating…" : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-muted-2 text-center mt-6">
        By signing up you agree to operate provider keys responsibly. Voxera encrypts them at rest.
      </p>
      <p className="text-sm text-muted mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-accent-400 hover:text-accent-500 font-medium">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
