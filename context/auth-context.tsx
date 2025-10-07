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

    const user = await getUserProfile();
    const role = user?.role || "user";

    if (role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/dashboard");
    }
  };

  const signUp = async (formData: FormData) => {
    const validatedFields = signUpSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { email, password, fullName } = validatedFields.data;

    // Check if user already exists
    const { data: userExists, error: checkError } = await supabase.rpc(
      "check_user_exists",
      { email_to_check: email }
    );

    if (checkError) {
      console.error("Error checking user:", checkError);
      return {
        message: "Failed to check user existence",
      };
    }

    if (userExists) {
      return {
        message: "User with this email already exists",
      };
    }

    const siteUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL ||
          "https://www.thelaunchpadwash.com";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${siteUrl}/auth/confirm`,
      },
    });

    if (error) {
      return {
        message: "Failed to create account",
      };
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

  const value = useMemo(
    () => ({
      user,
      userProfile,
      isLoading,
      signIn,
      signUp,
      signOut,
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
