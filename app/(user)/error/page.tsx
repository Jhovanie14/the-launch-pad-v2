"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message =
    searchParams.get("message") ||
    searchParams.get("error_description") ||
    searchParams.get("error") ||
    "Something went wrong.";

  const isVerificationError =
    message.toLowerCase().includes("verification") ||
    message.toLowerCase().includes("token") ||
    message.toLowerCase().includes("expired") ||
    message.toLowerCase().includes("invalid");

  const [email, setEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [resendError, setResendError] = useState("");

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResendStatus("loading");
    setResendError("");

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
      },
    });

    if (error) {
      setResendError(error.message);
      setResendStatus("error");
    } else {
      setResendStatus("sent");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {isVerificationError
              ? "Verification Link Expired"
              : "Authentication Error"}
          </h1>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {isVerificationError && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Why does this happen?</p>
              <p>
                Some email security scanners automatically click links in emails,
                which uses up the one-time verification link before you get to
                it. Request a new link below and click it right away.
              </p>
            </div>

            {resendStatus === "sent" ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-green-800 text-center">
                  New verification email sent! Check your inbox and click the
                  link right away.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="resend-email">Your email address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Button
                      type="submit"
                      disabled={resendStatus === "loading"}
                      className="bg-blue-900 hover:bg-blue-800 shrink-0"
                    >
                      {resendStatus === "loading" ? (
                        "Sending..."
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                  </div>
                  {resendStatus === "error" && (
                    <p className="text-sm text-red-600">{resendError}</p>
                  )}
                </div>
              </form>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/login">Back to Login</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/support">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
