"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, initialize } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initialize();
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router, isAuthenticated, initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

      if (email.length < 6 || !emailRegex.test(email)) {
        setError("Email must be at least 6 characters and valid");
        setIsLoading(false);
        return;
      }
      if (password.length < 6 || !passwordRegex.test(password)) {
        setError(
          "Password must be at least 6 characters and include uppercase, lowercase, and number"
        );
        setIsLoading(false);
        return;
      }

      const response = await authApi.login(email, password);
      setAuth(response.user, response.token, response.refresh_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f5f3f0' }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-black">Multi-RAG AI</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              showPasswordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link href="/register" className="text-black hover:text-gray-700">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
