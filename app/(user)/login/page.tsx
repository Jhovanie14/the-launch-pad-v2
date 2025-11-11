"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useSearchParams } from "next/navigation";
import LoadingDots from "@/components/loading";

function LoginFormContent() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string[];
    password?: string[];
    message?: string;
  }>({});
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoggingIn(true); // show full-screen loader
    const formData = new FormData(e.currentTarget);

    const result = await signIn(formData);
    // simulate delay (optional)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (result?.errors || result?.message) {
      setErrors(result.errors || { message: result.message });
      setIsLoggingIn(false);
    }
  };
  return (
    <>
      {isLoggingIn && <LoadingDots />}
      <div
        className={`flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isLoggingIn ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-900 hover:text-blue-700"
              >
                create a new account
              </Link>
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.message && (
                  <div className="text-red-600 text-sm">{errors.message}</div>
                )}
                <input type="hidden" name="next" value={next} />
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <div className="text-red-600 text-sm">
                      {errors.email[0]}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                  />
                  {errors.password && (
                    <div className="text-red-600 text-sm">
                      {errors.password[0]}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-800"
                  disabled={isLoggingIn}
                >
                  Sign In
                </Button>
              </form>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-500 hover:text-blue-700 mt-2 block"
              >
                Forgot password?
              </Link>
              <div className="mt-4 text-center">
                <Link
                  href="/"
                  className="text-sm text-blue-900 hover:text-blue-700"
                >
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
