"use client";

import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";

export default function BroadcastPage() {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bannerUrl, setBannerUrl] = useState(""); // New: banner image URL
  const [loading, setLoading] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = subject && body;

  const handleSend = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, title, body, bannerUrl }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to send broadcast");
      } else {
        setSentCount(data.sentTo);

        // Reset form fields
        setSubject("");
        setTitle("");
        setBody("");
        setBannerUrl("");

        // Automatically clear success message after 5 seconds
        setTimeout(() => setSentCount(null), 5000);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        {/* Header */}
        <Header />

        {/* Broadcast Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
              <InputField
                label="Email Subject"
                placeholder="Enter your email subject..."
                value={subject}
                onChange={setSubject}
              />
              <InputField
                label="Email Title"
                placeholder="Enter the main title for your email..."
                value={title}
                onChange={setTitle}
              />
              <TextAreaField
                label="Email Body"
                placeholder="Write your email content here..."
                value={body}
                onChange={setBody}
              />
              <InputField
                label="Banner Image URL (Optional)"
                placeholder="Enter banner image URL..."
                value={bannerUrl}
                onChange={setBannerUrl}
              />

              {/* Error */}
              {error && <Message type="error" text={error} />}

              {/* Success */}
              {sentCount !== null && !loading && (
                <Message
                  type="success"
                  text={`Successfully sent to ${sentCount} subscribers!`}
                />
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={loading || !isFormValid}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Broadcast
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Note:</span> This email will be
                sent to all active subscribers.
              </p>
            </div>
          </div>

          {/* Preview */}
          {(subject || title || body || bannerUrl) && (
            <PreviewCard
              subject={subject}
              title={title}
              body={body}
              bannerUrl={bannerUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Components ---
function Header() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Broadcast Email</h1>
      </div>
      <p className="text-slate-600">
        Send emails to all your subscribers at once
      </p>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <textarea
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
      />
      <p className="text-xs text-slate-500">{value.length} characters</p>
    </div>
  );
}

function Message({ type, text }: any) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-center gap-2 p-4 ${isError ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"} border rounded-lg`}
    >
      {isError ? (
        <AlertCircle className="w-5 h-5" />
      ) : (
        <CheckCircle2 className="w-5 h-5" />
      )}
      <p className="text-sm">{text}</p>
    </div>
  );
}

function PreviewCard({ subject, title, body, bannerUrl }: any) {
  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">
        Email Preview
      </h3>
      <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
        {subject && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Subject:</p>
            <p className="font-semibold text-slate-900">{subject}</p>
          </div>
        )}
        {title && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Title:</p>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          </div>
        )}
        {body && (
          <div className="mb-10">
            <p className="text-xs text-slate-500 mb-1">Body:</p>
            <p className="text-slate-700 whitespace-pre-wrap">{body}</p>
          </div>
        )}
        {bannerUrl && (
          <img src={bannerUrl} alt="Banner" className="w-full rounded-md" />
        )}
      </div>
    </div>
  );
}
