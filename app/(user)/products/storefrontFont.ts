import { Anton } from "next/font/google";

// Headline face for the storefront catalog only. Anton is a single-weight
// display cut that earns its keep at large sizes; body copy stays on Geist.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

/**
 * The catalog's black-and-gold world (`.storefront` swaps the shadcn tokens).
 * Only /products and the product pages wear it until their own redesign; the
 * cart and confirmation are on the 24/7 Bay tokens.
 */
export const STOREFRONT_CLASS = `storefront ${anton.variable} bg-background text-foreground`;
