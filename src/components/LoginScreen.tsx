import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: () => void;
  title: string;
  description: string;
}

export default function LoginScreen({ onLoginSuccess, title, description }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      triggerShake();
      return;
    }
    if (!password) {
      setError("Password cannot be empty");
      triggerShake();
      return;
    }

    if (username.trim() === "comillatraders" && (password === "admin123" || password === "admin123 " || password.trim() === "admin123")) {
      onLoginSuccess();
    } else {
      setError("Invalid username or password. Access blocked.");
      triggerShake();
      setPassword("");
    }
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div
        className={`max-w-md w-full space-y-6 bg-white border border-slate-200 p-8 rounded-3xl shadow-lg transition-all duration-300 ${
          shaking ? "animate-bounce" : ""
        }`}
      >
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-800 tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-xs text-slate-500 border-l-2 border-indigo-500 pl-3 inline-block text-left">
            {description}
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 px-5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-250"
                placeholder="Enter host username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-5 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-250"
                  placeholder="Enter access password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 border-none rounded-full font-bold text-sm tracking-widest text-white focus:outline-none shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              UNLOCK TERMINAL
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span>Strict Authorization Required</span>
        </div>
      </div>
    </div>
  );
}
