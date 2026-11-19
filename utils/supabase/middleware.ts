import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SIGNED_OUT_ONLY_ROUTES, signedInRedirect } from "@/lib/auth/signedInRedirect";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Get user (this also refreshes the session cookie, so it runs everywhere).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The role is only read on the routes below that redirect by it. Every
  // other request (the booking steps, server actions, API calls) used to pay
  // for a second database round trip here that nothing used.
  const routeNeedsRole =
    SIGNED_OUT_ONLY_ROUTES.includes(pathname) ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  let userRole = "user";
  if (user && routeNeedsRole) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      userRole = profile?.role || "user";
    } catch (err) {
      console.error("Middleware - Error fetching user role:", err);
    }
  }

  // Signed-in visitors browse the public site freely; only login and signup
  // send them to their dashboard.
  if (SIGNED_OUT_ONLY_ROUTES.includes(pathname)) {
    const target = user ? signedInRedirect(pathname, userRole) : null;
    return target ? NextResponse.redirect(new URL(target, request.url)) : supabaseResponse;
  }

  // Define route patterns
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  // Handle authenticated users
  if (user) {
    if (userRole === "admin") {
      // Admin accessing admin root
      if (pathname === "/admin")
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      // Admin accessing user routes
      if (isUserRoute)
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else {
      // Regular user accessing admin routes
      if (isAdminRoute)
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Unauthenticated users
  if (!user && (isAdminRoute || isUserRoute)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Handle unauthenticated users accessing protected routes
  // if (!user && (isUserRoute || isAdminRoute)) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  return supabaseResponse;
}
