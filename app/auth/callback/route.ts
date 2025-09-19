import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  console.log('Auth callback received:', { code, error, errorDescription, origin })
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    console.log('Exchanging code for session...')
    const supabase = await createClient()
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${exchangeError.message}`)
    }
    
    console.log('Session exchange successful:', data)
    const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
    const isLocalEnv = process.env.NODE_ENV === 'development'
    if (isLocalEnv) {
      // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
      return NextResponse.redirect(`${origin}${next}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`)
    } else {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  console.log('No code provided, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}&description=${errorDescription}`)
}
