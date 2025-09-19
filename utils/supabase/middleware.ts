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

  // Get user and role
  const { data: { user } } = await supabase.auth.getUser();
  
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

  const { pathname } = request.nextUrl;
  
  // Define route patterns
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/dashboard") || 
                     pathname.startsWith("/profile") || 
                     pathname.startsWith("/settings");
  const isPublicRoute = pathname === "/" || 
                       pathname.startsWith("/login") || 
                       pathname.startsWith("/signup") || 
                       pathname.startsWith("/about") || 
                       pathname.startsWith("/blog") || 
                       pathname.startsWith("/contact");

  // Handle authenticated users
  if (user) {
    // Admin accessing user routes or admin root
    if (userRole === "admin" && (isUserRoute || pathname === "/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    
    // User accessing admin routes
    if (userRole === "user" && isAdminRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    
    // Authenticated user accessing public routes
    if (isPublicRoute) {
      const redirectPath = userRole === "admin" ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  // Handle unauthenticated users accessing protected routes
  if (!user && (isUserRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}