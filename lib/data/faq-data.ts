export const faqData = [
  // Detailing Hours leads the array on purpose: category order on the page is
  // the order categories first appear here (see components/faq-section.tsx),
  // and the printed QR code points at bare /faq with no anchor to scroll to.
  {
    id: "hours-1",
    category: "Detailing Hours",
    question: "What are the new detailing hours and days?",
    answer:
      "Starting September 18, our detailing services run Thursday through Sunday, 9:30 AM to 6:30 PM. Detailing is not available Monday through Wednesday. Our self-service wash bays are unaffected and stay open 24/7, so you can still wash your vehicle any day, at any hour. Detailing takes roughly 45 minutes to an hour, so please allow enough time before closing.",
  },
  {
    id: "hours-2",
    category: "Detailing Hours",
    question: "Why did the detailing hours change?",
    answer:
      "Two reasons, and we want to be straightforward about both.\n\nOur team. Detailing is hands-on work, and running it seven days a week left our detailers without a real day off. Concentrating detailing into Thursday through Sunday gives them consecutive days to rest and recover, and that shows up directly in the quality of the work on your vehicle.\n\nRising costs. Supplies, water, utilities, and labor have all climbed steadily, and staffing a full detailing crew on our slowest days — Monday through Wednesday — cost more than those days brought in. Rather than raise prices or switch to cheaper products, we chose to focus detailing on the days our customers actually use it most.\n\nYour membership price stays exactly the same, and our self-service bays remain open 24/7. Thank you for understanding — this change is what lets us keep detailing quality high without passing higher costs on to you.",
  },
  {
    id: "hours-3",
    category: "Detailing Hours",
    question: "I'm on a monthly plan. Does this change my price or my membership?",
    answer:
      "No. Your plan and pricing stay exactly the same — this affects only the days and times detailing is available. Self-service bay access is still 24/7, every day. If the new schedule no longer works for you, you can cancel anytime from your dashboard under Billing.",
  },
  {
    id: "account-1",
    category: "Account & Login",
    question: "How do I reset my password?",
    answer:
      "Click on 'Forgot Password' on the login page and follow the instructions sent to your email. You'll receive a link to create a new password within 5 minutes.",
  },
  {
    id: "account-2",
    category: "Account & Login",
    question: "Can I change my email address?",
    answer:
      "No, you can't change your email address. Please contact our support team for assistance.",
  },
  // {
  //   id: "billing-1",
  //   category: "Billing & Payments",
  //   question: "What payment methods do you accept?",
  //   answer:
  //     "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for enterprise customers.",
  // },
  {
    id: "billing-2",
    category: "Billing & Payments",
    question: "Can I get an invoice for my payment?",
    answer:
      "Yes, invoices are automatically generated and sent to your email after each payment.",
  },
  {
    id: "billing-3",
    category: "Billing & Payments",
    question: "Why was my bill higher than usual after adding a family vehicle?",
    answer:
      "When you add a family vehicle to your subscription in the middle of your billing cycle, Stripe automatically calculates a one-time prorated charge for the remaining days of that period. For example, if your billing date is the 1st and you add a vehicle on the 15th, you are charged for roughly half a month's cost of that new vehicle — only the days remaining. This is called proration and it is a one-time adjustment, not an error. Starting your next billing date, your charge returns to the regular monthly amount which includes all your vehicles. If you have questions about a specific charge, please contact us at (832) 219-8320 or email info@thelaunchpadwash.com.",
  },
  {
    id: "billing-4",
    category: "Billing & Payments",
    question: "How does the Flock (family vehicle) discount work on my bill?",
    answer:
      "On a personal plan, every additional vehicle you add receives a 35% discount off the base plan price. For example, if your plan is $59.99/month, each additional vehicle is billed at $38.99/month instead. Commercial plans work differently: because those rates are already set for commercial vehicles, every vehicle on a commercial plan is billed at the full plan price with no family discount. In both cases, the first month a vehicle is added may show a slightly different amount due to proration (a partial charge for the remaining days of your current billing cycle). From the following billing date onward, you will see the regular rate for every vehicle on your account.",
  },
  // {
  //   id: "technical-1",
  //   category: "Technical Issues",
  //   question: "Why am I experiencing slow performance?",
  //   answer:
  //     "Slow performance can be caused by several factors. Try clearing your browser cache, disabling extensions, or using a different browser. If the issue persists, contact our support team.",
  // },
  // {
  //   id: "technical-2",
  //   category: "Technical Issues",
  //   question: "Is there an API available?",
  //   answer:
  //     "Currently, we do not offer an API. All features and data interactions are managed directly within the platform.",
  // },
  // {
  //   id: "feature-1",
  //   category: "Features",
  //   question: "How do I export my data?",
  //   answer:
  //     "Data export is not supported at the moment. All user information and content remain securely stored within the platform.",
  // },
  // {
  //   id: "feature-2",
  //   category: "Features",
  //   question: "Can I integrate with third-party tools?",
  //   answer:
  //     "No, as of now we don't support integrations with popular tools like Slack, Zapier, and more.",
  // },
  {
    id: "services-1",
    category: "Services & Packages",
    question: "What services does The Launch Pad offer?",
    answer:
      "We offer a comprehensive range of car care services including exterior wash packages, express interior detailing, paint protection, wax treatments, and epxress premium detailing services. Our packages range from basic wash to deluxe premium detailing.",
  },
  {
    id: "services-2",
    category: "Services & Packages",
    question: "How long does a typical car wash take?",
    answer:
      "Service times vary by package: Basic wash takes 15-20 minutes, Premium wash takes 30-45 minutes, and Full detailing services can take 45 minutes to 1 hour depending on your vehicle's condition and selected services.",
  },
  {
    id: "services-3",
    category: "Services & Packages",
    question:
      "Do you provide services for large vehicles like trucks and SUVs?",
    answer:
      "We accommodate vehicles of all sizes including trucks, SUVs, vans, and commercial vehicles. Pricing may vary based on vehicle size, and we recommend calling ahead for oversized vehicles to ensure availability.",
  },
  {
    id: "pricing-1",
    category: "Pricing & Memberships",
    question: "Do you offer membership or subscription plans?",
    answer:
      "Yes! We offer two monthly unlimited wash memberships: Basic — $39.99/month (Exterior Only, Unlimited, Any vehicle) and Deluxe — $59.99/month (Inside & Outside, Unlimited, Any vehicle). No contracts • Cancel anytime • No vehicle upcharges.",
  },
  {
    id: "payment-1",
    category: "Payment & Policies",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, MasterCard, American Express, Discover), debit cards, cash, Apple Pay, Google Pay, and contactless payments. Monthly memberships are automatically charged to your preferred payment method.",
  },
  {
    id: "payment-2",
    category: "Payment & Policies",
    question: "What's your cancellation and refund policy?",
    answer:
      "For individual services, cancellations made 2+ hours in advance receive full refunds. Memberships can be cancelled anytime — there is no contract and no notice period. You can cancel yourself from your dashboard under Billing, or by visiting our location. Your membership stays active through the end of the billing period you've already paid for, and partial months are not refunded.",
  },
  {
    id: "eco-1",
    category: "Eco-Friendly & Safety",
    question: "Do you offer eco-friendly car wash options?",
    answer:
      "Yes! We use biodegradable soaps, water reclamation systems, and eco-friendly products in all our services. Our green wash option uses 100% environmentally safe products and minimal water consumption.",
  },
  {
    id: "eco-2",
    category: "Eco-Friendly & Safety",
    question: "Can I wait in my car during the wash?",
    answer:
      "Yes, you're welcome to remain in your vehicle throughout the wash. Our system is fully designed for a safe and comfortable in-car experience.",
  },
  {
    id: "quality-1",
    category: "Quality & Guarantees",
    question: "Do you offer any guarantees on your services?",
    answer:
      "We stand behind our work with a 100% satisfaction guarantee. If you're not completely satisfied with any service, let us know within 1 hour and we'll make it right with a complimentary re-wash.",
  },
  {
    id: "contact-1",
    category: "Contact & Support",
    question:
      "I have additional questions not covered here, who can I contact?",
    answer:
      "Our friendly team is here to help! You can reach us at (832) 219-8320, email us at info@thelaunchpadwash.com, or visit us at 10410 S Main St, Houston, TX 77025.",
  },
];
