"use client";

import { getUserProfile } from "@/auth/actions";
import { UserProfile } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { redirect, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { success, z } from "zod";

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
  // const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);
      if (currentUser) {
        const profile = await fetchUserProfile(currentUser.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session) => {
      console.log("🔑 Auth event:", event);

      if (event === "TOKEN_REFRESHED") {
        // session still valid
        return;
      }

      if (event === "TOKEN_REFRESH_FAILED") {
        // refresh failed → force logout
        console.warn("❌ Session expired. Logging out.");
        await supabase.auth.signOut();
        setUser(null);
        setUserProfile(null);
        router.push("/login");
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          const profile = await fetchUserProfile(newUser.id);
          setUserProfile(profile);
        }
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setUserProfile(null);
        router.push("/login"); // or "/" depending on your UX
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      // revalidatePath("/admin", "layout");
      router.push("/admin/dashboard");
    }
    // revalidatePath("/", "layout");
    router.push("/dashboard");
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

    //   check if user already exists
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
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

  const fetchUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return profile;
  };

  const signOut = async () => {
    const user = await getUserProfile();
    const role = user?.role || "user";
    // reset first
    setUser(null);
    setUserProfile(null);

    await supabase.auth.signOut();

    router.push(role === "admin" ? "/admin" : "/");
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
