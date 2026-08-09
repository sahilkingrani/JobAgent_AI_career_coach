import { useState } from "react";
import { supabase } from "../lib/supabase";
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}`,
          },
        });
        if (signUpError) throw signUpError;
        // For development without email verification, auto-sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
      onAuthSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
            JobAgent
          </h1>
          <p className="text-foreground/50 text-sm mt-2 font-sans">
            Your AI-powered career coach
          </p>
        </div>

        <div className="card-base border-border/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  !isSignUp
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground/60 hover:bg-muted/80"
                }`}
                onClick={() => { setIsSignUp(false); setError(""); }}
              >
                <LogIn className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isSignUp
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground/60 hover:bg-muted/80"
                }`}
                onClick={() => { setIsSignUp(true); setError(""); }}
              >
                <UserPlus className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
                Sign Up
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pl-10"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10 pr-10"
                  placeholder="Minimum 6 characters"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}