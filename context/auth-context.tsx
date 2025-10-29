"use client";

import { getUserProfile } from "@/auth/actions";
import { UserProfile } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms and Conditions",
  }),
});

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  userProfile: UserProfile | null;
  signIn: (
    formData: FormData
  ) => Promise<{ errors?: Record<string, string[]>; message?: string } | void>;
  signUp: (formData: FormData) => Promise<{
    errors?: Record<string, string[]>;
    message?: string;
    success?: boolean;
  } | void>;
  signOut: () => Promise<void>;
  forgotPassword: (formData: FormData) => Promise<{
    errors?: Record<string, string[]>;
    message?: string;
    success?: boolean;
  }>;
  resetPassword: (formData: FormData) => Promise<{
    errors?: Record<string, string[]>;
    message?: string;
    success?: boolean;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const supabase = createClient();

  // Prevent multiple simultaneous profile fetches
  const fetchingProfile = useRef(false);

  useEffect(() => {
    const getUserAndProfile = async (user: User | null) => {
      setIsLoading(true);

      if (user) {
        setUser(user);
        const profile = await fetchUserProfile(user.id);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }

      setIsLoading(false);
    };

    // Check current session immediately
    supabase.auth.getUser().then(({ data }) => {
      getUserAndProfile(data.user);
    });

    // Listen to session changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        getUserAndProfile(session?.user ?? null);
      }
    );

    // Cleanup
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    if (fetchingProfile.current) return userProfile;

    fetchingProfile.current = true;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      return profile;
    } finally {
      fetchingProfile.current = false;
    }
  };

  const signIn = async (formData: FormData) => {
    const validatedFields = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email, password } = validatedFields.data;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        message: "Invalid credentials",
      };
    }
    const next = (formData.get("next") as string) || "";
    if (next) {
      router.push(next);
      return;
    }

    const user = await getUserProfile();
    const role = user?.role || "user";
    router.push(role === "admin" ? "/admin/dashboard" : "/dashboard");
  };

  const signUp = async (formData: FormData) => {
    const validated = signUpSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
      termsAccepted: formData.get("terms") === "on",
    });

    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    const { email, password, fullName } = validated.data;

    const siteUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;

    // First, check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from("profiles") // or your users table
      .select("email")
      .eq("email", email)
      .single();

    if (existingUsers) {
      return {
        message:
          "This email is already registered. Please sign in or check your inbox to confirm your account.",
      };
    }

    // If no existing user, proceed with signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm`,
        data: { full_name: fullName, terms_version: "v1.0" },
      },
    });

    // console.log("Redirect URL:", `${siteUrl}/auth/confirm`);

    if (error) {
      console.error("Signup error:", error);
      return { message: error.message };
    }

    return {
      success: true,
      message: "Check your email to confirm your account",
    };
  };

  const signOut = async () => {
    try {
      const user = await getUserProfile();
      const role = user?.role || "user";

      // Reset state first
      setUser(null);
      setUserProfile(null);

      await supabase.auth.signOut();

      router.push(role === "admin" ? "/admin" : "/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  const forgotPassword = async (formData: FormData) => {
    const email = formData.get("email") as string;

    // Validate email
    if (!email || !email.includes("@")) {
      return {
        errors: { email: ["Please enter a valid email address"] } as Record<
          string,
          string[]
        >,
      };
    }

    const siteUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;

    console.log("🌐 Current origin:", window.location.origin);
    console.log("📍 Site URL being used:", siteUrl);
    console.log("🔗 Full redirect URL:", `${siteUrl}/auth/reset-callback`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-callback`,
    });

    if (error) {
      console.error("Password reset error:", error);
      return { message: error.message };
    }

    // Always return success message to prevent email enumeration
    return {
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link shortly.",
    };
  };

  const resetPassword = async (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validate passwords
    if (!password || password.length < 8) {
      return {
        errors: {
          password: ["Password must be at least 8 characters"],
        } as Record<string, string[]>,
      };
    }

    if (password !== confirmPassword) {
      return {
        errors: { confirmPassword: ["Passwords do not match"] } as Record<
          string,
          string[]
        >,
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Password update error:", error);
      return { message: error.message };
    }

    return {
      success: true,
      message:
        "Password updated successfully! You can now sign in with your new password.",
    };
  };

  const value = useMemo(
    () => ({
      user,
      userProfile,
      isLoading,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
    }),
    [user, userProfile, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthContextProvider");
  }
  return context;
}
