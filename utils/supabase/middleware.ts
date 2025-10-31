import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Get user and role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole = "user";
  if (user) {
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

  // Allow auth routes to not pass through without checks
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/about",
    "/blog",
    "/contact",
    "/faq",
  ];

  if (publicRoutes.includes(pathname)) {
    if (user) {
      // Authenticated user should be redirected away from public routes
      return NextResponse.redirect(
        new URL(
          userRole === "admin" ? "/admin/dashboard" : "/dashboard",
          request.url
        )
      );
    }
    // Unauthenticated user can access public route
    return supabaseResponse;
  }

  // Define route patterns
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  // Handle authenticated users
  if (user) {
    if (userRole === "admin" || userRole === "moderator") {
      // Admin accessing admin root
      if (pathname === "/admin")
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      // Admin accessing user routes
      if (isUserRoute)
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      // Admin accessing login/signup
      if (pathname === "/login" || pathname === "/signup" || pathname === "/")
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else {
      // Regular user accessing admin routes
      if (isAdminRoute)
        return NextResponse.redirect(new URL("/dashboard", request.url));
      // Regular user accessing login/signup
      if (pathname === "/login" || pathname === "/signup" || pathname === "/")
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
