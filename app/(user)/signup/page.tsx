"use client";
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

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string[];
    password?: string[];
    fullName?: string[];
    message?: string;
  }>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setIsSuccess(false);

    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    const result = await signUp(formData);

    if (result?.errors) {
      setErrors(result.errors);
    } else if (result?.message) {
      if (result?.success) {
        setIsSuccess(true);
        form.reset();
      }
      setErrors({ message: result.message });
    }

    setIsLoading(false);
  };
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-900 hover:text-blue-700"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Create your account to get started with our platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.message && (
                <div
                  className={`text-sm ${
                    isSuccess
                      ? "text-green-600 bg-green-50 border border-green-200 rounded-md p-3"
                      : "text-red-600 bg-red-50 border border-red-200 rounded-md p-3"
                  }`}
                >
                  {errors.message}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <div className="text-red-600 text-sm">
                    {errors.fullName[0]}
                  </div>
                )}
              </div>
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
                  <div className="text-red-600 text-sm">{errors.email[0]}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Create a password"
                />
                {errors.password && (
                  <div className="text-red-600 text-sm">
                    {errors.password[0]}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  required
                  className="h-4 w-4 text-blue-900 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-blue-900 hover:underline">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-blue-900 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800"
                disabled={isLoading}
              >
                {isLoading ? "Creating an account..." : "Create Account"}
              </Button>
            </form>
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
  );
}
