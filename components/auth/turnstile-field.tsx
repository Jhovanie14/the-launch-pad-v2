"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useImperativeHandle, useRef, type Ref } from "react";

/**
 * The hidden input Turnstile injects into the surrounding <form>. Handlers that
 * build a FormData can read the token straight out of it — no prop drilling.
 */
export const TURNSTILE_FIELD_NAME = "cf-turnstile-response";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Whether captcha is wired up on this deployment.
 *
 * This MUST track the "Enable captcha protection" toggle in Supabase (Auth →
 * Attack Protection). Supabase applies that toggle to sign-up, sign-in,
 * password recovery and resend all at once, so the safe rollout order is: ship
 * the site key first, confirm it renders, then flip the Supabase toggle. Turn
 * it on there while this is unset and every one of those calls returns
 * `captcha_failed`.
 */
export const captchaEnabled = Boolean(SITE_KEY);

/** Pull the Turnstile token off a submitted form, if the widget is present. */
export function captchaTokenFrom(formData: FormData): string | undefined {
  const token = formData.get(TURNSTILE_FIELD_NAME);
  return typeof token === "string" && token ? token : undefined;
}

export type TurnstileFieldHandle = {
  /**
   * Discard the current token and issue a fresh challenge. Turnstile tokens are
   * single-use, so call this after any failed submit — otherwise the user's
   * second attempt fails as `captcha_failed` no matter what they fixed.
   */
  reset: () => void;
};

type TurnstileFieldProps = {
  ref?: Ref<TurnstileFieldHandle>;
  /**
   * Receives the token when the challenge passes, and `null` when it expires or
   * errors. Forms that submit via FormData can ignore this and read the hidden
   * input instead; controlled forms need it.
   */
  onToken?: (token: string | null) => void;
  className?: string;
};

export function TurnstileField({ ref, onToken, className }: TurnstileFieldProps) {
  const widget = useRef<TurnstileInstance | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    reset: () => {
      widget.current?.reset();
      onToken?.(null);
    },
  }));

  // No site key configured: render nothing and let the form submit without a
  // token. Captcha must be off in Supabase too, or these calls will fail.
  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <Turnstile
        ref={widget}
        siteKey={SITE_KEY}
        options={{ theme: "auto", size: "flexible" }}
        onSuccess={(token) => onToken?.(token)}
        onExpire={() => onToken?.(null)}
        onError={(code) => {
          console.error("[turnstile] challenge error:", code);
          onToken?.(null);
        }}
      />
    </div>
  );
}
