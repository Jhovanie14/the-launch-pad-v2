"use client";

import { Loader2, Mail, Send, User, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// --- Proration template ---
function buildProrationTemplate(
  customerName: string,
  nextCharge: string,
  recurring: string,
  vehicleAdded: string,
) {
  return {
    subject: "About Your Recent Billing Charge — The Launch Pad Wash",
    title: "A Note About Your Recent Charge",
    body: `Hi ${customerName || "[Customer Name]"},

Thank you for being a valued subscriber at The Launch Pad Wash!

We noticed you may have a question about your most recent charge of $${nextCharge || "___"}. We want to make sure everything is clear.

When you added a new family vehicle (${vehicleAdded || "[license plate]"}) to your subscription during your current billing cycle, Stripe automatically calculated a prorated charge for the remaining days of that cycle. This is a one-time adjustment — not an error.

Here's the breakdown:
• Your regular monthly subscription covers your vehicles from the start of each billing period.
• Because the new vehicle was added mid-cycle, you were charged only for the days remaining in that period — this is called a proration.
• Starting your next billing date, your regular monthly charge will be $${recurring || "___"}/month going forward.

You were not overcharged. The higher amount this month is simply the partial charge for your new vehicle's remaining days, added on top of your normal renewal.

If you have any questions, feel free to reply to this email or call us at (832) 219-8320. We're happy to walk you through the details!

Thank you for trusting us with your vehicle,
The Launch Pad Wash Team`,
  };
}

export default function BroadcastPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="min-h-screen bg-muted/30 p-4 md:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Email Center</h1>
            </div>
            <p className="text-slate-600">Broadcast to all subscribers or send a direct message to one customer</p>
          </div>

          <Tabs defaultValue="broadcast">
            <TabsList className="mb-6">
              <TabsTrigger value="broadcast" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Broadcast All
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Direct Message
              </TabsTrigger>
            </TabsList>

            <TabsContent value="broadcast">
              <BroadcastForm />
            </TabsContent>

            <TabsContent value="direct">
              <DirectMessageForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─── Broadcast All ────────────────────────────────────────────────────────────

function BroadcastForm() {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const isFormValid = subject && body;

  const handleSend = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, title, body, bannerUrl }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to send broadcast");
      } else {
        toast.success(`Successfully sent to ${data.sentTo} active subscribers!`);
        setSubject(""); setTitle(""); setBody(""); setBannerUrl("");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <InputField label="Email Subject *" placeholder="e.g. Important Update from The Launch Pad Wash" value={subject} onChange={setSubject} />
          <InputField label="Email Title" placeholder="Main heading shown in the email" value={title} onChange={setTitle} />
          <TextAreaField label="Email Body *" placeholder="Write your message here..." value={body} onChange={setBody} />
          <InputField label="Banner Image URL (Optional)" placeholder="https://..." value={bannerUrl} onChange={setBannerUrl} />

          <button
            onClick={handleSend}
            disabled={loading || !isFormValid}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Send className="w-5 h-5" /> Send to All Active Subscribers</>}
          </button>
        </div>
        <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Note:</span> Sends to all active Express and Self-Service subscribers.
          </p>
        </div>
      </div>

      {(subject || title || body || bannerUrl) && (
        <PreviewCard subject={subject} title={title} body={body} bannerUrl={bannerUrl} />
      )}
    </div>
  );
}

// ─── Direct Message ───────────────────────────────────────────────────────────

function DirectMessageForm() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Proration template fields
  const [showProrationHelper, setShowProrationHelper] = useState(false);
  const [nextCharge, setNextCharge] = useState("");
  const [recurring, setRecurring] = useState("");
  const [vehicleAdded, setVehicleAdded] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email").then(({ data }) => {
      setCustomers(data || []);
    });
  }, []);

  const filtered = search.length > 1
    ? customers.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const applyProrationTemplate = () => {
    const name = selectedCustomer?.full_name?.split(" ")[0] || "";
    const tpl = buildProrationTemplate(name, nextCharge, recurring, vehicleAdded);
    setSubject(tpl.subject);
    setTitle(tpl.title);
    setBody(tpl.body);
    setShowProrationHelper(false);
  };

  const handleSend = async () => {
    if (!selectedCustomer || !subject || !body) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/send-direct-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selectedCustomer.email, subject, title, body, bannerUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send");
      toast.success(`Email sent to ${selectedCustomer.email}!`);
      setSubject(""); setTitle(""); setBody(""); setBannerUrl("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">

          {/* Customer Search */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Search Customer *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type name or email..."
                value={selectedCustomer ? `${selectedCustomer.full_name} (${selectedCustomer.email})` : search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedCustomer(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setSearch(""); }}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
              {showDropdown && filtered.length > 0 && !selectedCustomer && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filtered.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setSearch(""); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-slate-900">{c.full_name || "—"}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Proration Template Helper */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <button
              onClick={() => setShowProrationHelper(!showProrationHelper)}
              className="flex items-center gap-2 text-sm font-semibold text-blue-800 w-full text-left"
            >
              <Sparkles className="w-4 h-4" />
              Use Proration Explanation Template
              <span className="ml-auto text-blue-500 text-xs">{showProrationHelper ? "▲ Hide" : "▼ Fill in amounts"}</span>
            </button>
            {showProrationHelper && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-blue-700">Fill in the billing amounts and we'll pre-write the explanation email for you.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Next Charge ($)</label>
                    <input
                      type="text"
                      placeholder="e.g. 111.95"
                      value={nextCharge}
                      onChange={(e) => setNextCharge(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Recurring ($)</label>
                    <input
                      type="text"
                      placeholder="e.g. 98.98"
                      value={recurring}
                      onChange={(e) => setRecurring(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Vehicle Added</label>
                    <input
                      type="text"
                      placeholder="e.g. ABC 1234"
                      value={vehicleAdded}
                      onChange={(e) => setVehicleAdded(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={applyProrationTemplate}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Apply Template →
                </button>
              </div>
            )}
          </div>

          <InputField label="Email Subject *" placeholder="e.g. About your recent charge" value={subject} onChange={setSubject} />
          <InputField label="Email Title" placeholder="Main heading in the email" value={title} onChange={setTitle} />
          <TextAreaField label="Email Body *" placeholder="Write your message..." value={body} onChange={setBody} />
          <InputField label="Banner Image URL (Optional)" placeholder="https://..." value={bannerUrl} onChange={setBannerUrl} />

          <button
            onClick={handleSend}
            disabled={loading || !selectedCustomer || !subject || !body}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
              : <><Send className="w-5 h-5" /> Send to {selectedCustomer?.full_name || "Customer"}</>
            }
          </button>
        </div>
      </div>

      {(subject || title || body) && (
        <PreviewCard subject={subject} title={title} body={body} bannerUrl={bannerUrl} />
      )}
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function InputField({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
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

function TextAreaField({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      <textarea
        rows={8}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
      />
      <p className="text-xs text-slate-500">{value.length} characters</p>
    </div>
  );
}


function PreviewCard({ subject, title, body, bannerUrl }: any) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Email Preview</h3>
      <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
        {subject && <div><p className="text-xs text-slate-500 mb-1">Subject:</p><p className="font-semibold text-slate-900">{subject}</p></div>}
        {title && <div><p className="text-xs text-slate-500 mb-1">Title:</p><h2 className="text-xl font-bold text-slate-900">{title}</h2></div>}
        {body && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Body:</p>
            <p className="text-slate-700 whitespace-pre-wrap text-sm">{body}</p>
          </div>
        )}
        {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-full rounded-md" />}
      </div>
    </div>
  );
}
