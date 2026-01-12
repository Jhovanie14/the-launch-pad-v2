import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Phone,
  Mail,
} from "lucide-react";

export default function ProcessSteps() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const qualifyingConditions = [
    {
      icon: CheckCircle,
      title: "Service Not Completed as Described",
      description:
        "If the services listed in your package were not performed or were significantly below our quality standards.",
    },
    {
      icon: CheckCircle,
      title: "Visible Defects or Missed Areas",
      description:
        "Noticeable spots, streaks, or uncleaned areas that were part of the service package.",
    },
    {
      icon: CheckCircle,
      title: "Damage Caused by Our Team",
      description:
        "Any damage to your vehicle directly caused by our staff or equipment during the service.",
    },
    {
      icon: CheckCircle,
      title: "Product Issues",
      description:
        "Adverse reactions or visible damage from products used during our service.",
    },
  ];

  const nonQualifyingConditions = [
    {
      icon: XCircle,
      title: "Pre-Existing Vehicle Damage",
      description:
        "Scratches, dents, or wear that existed before service. We document vehicle condition upon arrival.",
    },
    {
      icon: XCircle,
      title: "Normal Wear After Service",
      description:
        "Dirt accumulation, weather exposure, or normal use occurring after service completion.",
    },
    {
      icon: XCircle,
      title: "Unrealistic Expectations",
      description:
        "Expecting removal of permanent stains, deep scratches, or paint damage beyond detailing scope.",
    },
    {
      icon: XCircle,
      title: "Customer-Caused Issues",
      description:
        "Damage or dirtying of vehicle after service completion or during customer handling.",
    },
    {
      icon: XCircle,
      title: "Changed Mind or Preferences",
      description:
        "Dissatisfaction unrelated to service quality (e.g., preferring different service after completion).",
    },
  ];

  const claimProcess = [
    {
      step: 1,
      title: "Report Issue",
      description: "Contact us within 24 hours of service completion",
      icon: Phone,
    },
    {
      step: 2,
      title: "Provide Evidence",
      description: "Share photos/videos showing the specific concern",
      icon: FileText,
    },
    {
      step: 3,
      title: "Review Process",
      description: "Our team reviews your claim within 24 hours",
      icon: Clock,
    },
    {
      step: 4,
      title: "Resolution",
      description:
        "Receive re-service, partial refund, or full refund based on evaluation",
      icon: CheckCircle,
    },
  ];

  const faqs = [
    {
      question: "How long do I have to file a claim?",
      answer:
        "You must report any issues within 24 hours of service completion. This allows us to assess the concern while the service is still recent and address it promptly.",
    },
    {
      question: "What documentation do I need?",
      answer:
        "Please provide clear photos or videos showing the specific areas of concern, along with your service receipt and booking confirmation number.",
    },
    {
      question: "Will I get a full refund or re-service?",
      answer:
        "Depending on the nature of the issue, we may offer: (1) Complimentary re-service to address the concern, (2) Partial refund for services not meeting standards, or (3) Full refund if we cannot resolve the issue to your satisfaction.",
    },
    {
      question: "What if I just don't like the results?",
      answer:
        "We stand behind our quality. If there's a specific defect or missed area, we'll make it right. However, subjective preferences without quality issues may not qualify for refunds.",
    },
    {
      question: "Does this cover subscription services?",
      answer:
        "Subscription members can report issues per visit. However, subscription fees are non-refundable. If quality issues persist, we'll work with you to find a solution or allow cancellation without penalty.",
    },
  ];

  return (
    <div className="bg-gray-50 py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-full mb-4">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Our Promise to You</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            Satisfaction Guarantee & Refund Policy
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We're committed to delivering exceptional service. If we don't meet
            our standards, we'll make it right — guaranteed.
          </p>
        </div>

        {/* Main Guarantee Statement */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Star className="w-12 h-12 text-blue-900 shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-blue-900 mb-3">
                  Our Guarantee
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We guarantee that every service will be completed to our
                  published quality standards. If you're not satisfied due to
                  service quality issues, we'll re-service your vehicle at no
                  charge or provide a refund according to the terms outlined
                  below.
                </p>
                <p className="text-sm text-gray-600 italic">
                  Last Updated: December 10, 2025 | Effective for all services
                  booked on or after this date
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Qualifies */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            What's Covered
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {qualifyingConditions.map((item, idx) => (
              <Card key={idx} className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <item.icon className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* What Doesn't Qualify */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600" />
            What's Not Covered
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {nonQualifyingConditions.map((item, idx) => (
              <Card key={idx} className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <item.icon className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Claim Process */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            How to File a Claim
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {claimProcess.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.step} className="text-center">
                  <CardContent className="p-6">
                    <div className="bg-blue-900 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                      {item.step}
                    </div>
                    <Icon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Time Limits & Important Terms */}
        <Card className="mb-8 border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-orange-600 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Important Terms & Time Limits
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>24-Hour Window:</strong> All claims must be
                      submitted within 24 hours of service completion.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>One-Time Re-service:</strong> We offer one
                      complimentary re-service per transaction. If issues
                      persist, a refund will be issued.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Refund Processing:</strong> Approved refunds are
                      processed within 5-7 business days to the original payment
                      method.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Subscriptions:</strong> Monthly fees are
                      non-refundable, but you can cancel anytime without
                      penalty.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <Card key={idx}>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(`faq-${idx}`)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {faq.question}
                    </CardTitle>
                    {expandedSection === `faq-${idx}` ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </CardHeader>
                {expandedSection === `faq-${idx}` && (
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
