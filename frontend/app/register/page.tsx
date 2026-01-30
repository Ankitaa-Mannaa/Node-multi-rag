"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, initialize } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordHint, setShowPasswordHint] = useState(false);

  useEffect(() => {
    initialize();
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router, isAuthenticated, initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

    if (email.length < 6 || !emailRegex.test(email)) {
      setError("Email must be at least 6 characters and valid");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6 || !passwordRegex.test(password)) {
      setError(
        "Password must be at least 6 characters and include uppercase, lowercase, and number"
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register(email, password);
      setAuth(response.user, response.token, response.refresh_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f5f3f0' }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-black">Multi-RAG AI</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new account</p>
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
              onFocus={() => setShowPasswordHint(true)}
              onBlur={() => setShowPasswordHint(false)}
              required
              placeholder="••••••••"
            />
            {showPasswordHint && (
              <p className="text-xs text-gray-600">
                Must be at least 6 characters and include uppercase, lowercase,
                and a number.
              </p>
            )}
            <Input
              label="Confirm Password"
              type="password"
              showPasswordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign Up
            </Button>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-black hover:text-gray-700">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
