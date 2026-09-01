# Auth email + captcha setup

Signup, password reset, and resend-confirmation all send mail through Supabase
Auth. On Supabase's **built-in** SMTP that is capped at **2 emails per hour for
the whole project** — so under any real load most registrations never receive a
confirmation link, and the signup looks like it silently did nothing.

The fix has two halves. The code half is in the repo; this file is the other
half, which lives in the Supabase, Cloudflare, and Vercel dashboards.

## Order of operations

**Do these in order.** Supabase's captcha toggle applies to sign-up, sign-in,
password recovery, and resend *all at once*. Enabling it while the deployed
build has no Turnstile site key breaks every one of those flows — including
login for existing customers.

1. Cloudflare — create the widget, copy both keys
2. Vercel — add the site key, redeploy, confirm the widget renders
3. Supabase — SMTP
4. Supabase — rate limit
5. Supabase — captcha toggle (last)

## 1. Cloudflare Turnstile

dash.cloudflare.com → **Turnstile** → **Add widget**

| Field | Value |
| --- | --- |
| Widget mode | Managed |
| Hostnames | `thelaunchpadwash.com`, `www.thelaunchpadwash.com`, `localhost` |

Add `vercel.app` to hostnames too if you want captcha working on preview
deployments. Copy the **Site Key** and **Secret Key**.

## 2. Vercel

Add to Production, Preview, and Development:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key from step 1>
```

Redeploy, then load `/signup` and confirm the Turnstile widget appears above
the Create Account button. **Do not continue until you have seen it render.**

`.env.local` currently holds Cloudflare's always-passes test key
(`1x00000000000000000000AA`). Swap in the real site key when you want to
exercise the real challenge locally.

## 3. Supabase — custom SMTP

Dashboard → **Authentication** → **Emails** → **SMTP Settings** → enable
*Custom SMTP*.

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | your Resend API key (the `re_…` value already in `RESEND_API_KEY`) |
| Sender email | `noreply@thelaunchpadwash.com` |
| Sender name | `The Launch Pad Wash` |

Port `465` also works if 587 is blocked. The sender domain is already verified
in Resend — the app sends transactional mail from it today — so no DNS work is
needed.

## 4. Supabase — rate limit

Dashboard → **Authentication** → **Rate Limits** → **Rate limit for sending
emails**.

This stays low even after custom SMTP is configured, so it is easy to fix the
SMTP half and still be throttled. Raise it to **200 per hour** (Resend's own
limits are far above this).

Leave *Minimum interval between emails* at its default — that is a per-address
cooldown, not a project-wide cap, and it is useful anti-abuse.

## 5. Supabase — captcha

Dashboard → **Authentication** → **Attack Protection** → **Enable Captcha
protection**.

| Field | Value |
| --- | --- |
| Provider | Turnstile by Cloudflare |
| Secret key | Secret Key from step 1 |

## Verify

Run all four — they share the captcha toggle, so a break in one is a break in
all:

- [ ] `/signup` with a fresh address → confirmation email arrives, from
      `noreply@thelaunchpadwash.com`
- [ ] The send appears in Resend → **Emails** (proves it left via Resend, not
      Supabase's sender)
- [ ] `/login` with an existing account → succeeds
- [ ] `/forgot-password` → reset email arrives
- [ ] `/error` → resend confirmation works
- [ ] Sign up ~5 times in a row → all 5 emails arrive (this is the actual bug;
      on the old setup, 3 through 5 would vanish)

## Rollback

Turn off **Enable Captcha protection** in Supabase. The app keeps working
unchanged — Supabase ignores a captcha token when captcha is disabled, so the
widget can stay deployed. Nothing needs to be redeployed to roll back.

## How the code responds

- `components/auth/turnstile-field.tsx` renders nothing when
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, so a machine without the key still
  works. `captchaEnabled` must track the Supabase toggle.
- Turnstile tokens are single-use. Every failed submit resets the widget; drop
  that and a user's second attempt fails as `captcha_failed` no matter what
  they corrected.
- `lib/auth/authErrorMessage.ts` maps Supabase's developer-facing strings to
  customer copy. `over_email_send_rate_limit` is the one that was surfacing as
  a bare `email rate limit exceeded`.
