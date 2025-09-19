"use client";

import { getUserProfile } from "@/auth/actions";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
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
  signIn: (
    formData: FormData
  ) => Promise<{ errors?: Record<string, string[]>; message?: string } | void>;
  signUp: (
    formData: FormData
  ) => Promise<{
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
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

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
      redirect("/admin/dashboard");
    }
    // revalidatePath("/", "layout");
    redirect("/dashboard");
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_REDIRECT_URL}/auth/callback`,
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
    await supabase.auth.signOut();
    // revalidatePath("/", "layout");
    redirect("/");
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthContextProvider");
  }
  return context;
}
