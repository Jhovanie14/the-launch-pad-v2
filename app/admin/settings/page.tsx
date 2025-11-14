"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { InviteAdminForm } from "@/components/admin/admin-invite-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import LoadingDots from "@/components/loading";

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
  });

  const [currentUser, setCurrentUser] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role")
          .eq("id", user.id)
          .single();

        if (profile) setCurrentUser(profile);
      }
    };

    fetchCurrentUser();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .eq("role", "admin")
        .order("created_at", { ascending: true }); // or descending for newest first

      if (error) throw error;
      setAdmins(data ?? []);
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      toast.error("Failed to load admin list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Optional: upload avatar to Supabase storage
      let avatarUrl = formData.avatar_url;
      if (file) {
        const filePath = `admin-avatars/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      // Example: update admin profile table
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          avatar_url: avatarUrl,
        })
        .eq("id", "ADMIN_ID"); // Replace with current admin ID from session or context

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating admin profile:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingDots />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Admin Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and account preferences.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="max-w-4xl">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={previewUrl || formData.avatar_url || undefined}
                      alt="Admin Avatar"
                    />
                    <AvatarFallback>
                      {formData.full_name?.[0]?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {currentUser?.role === "admin" && (
              <div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-semibold">Admin Settings</h1>
                  <InviteAdminForm />
                </div>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Admin Moderators</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <p>Loading admins...</p>
                    ) : admins.length === 0 ? (
                      <p>No admins found.</p>
                    ) : (
                      <div className="space-y-2">
                        {admins.map((admin) => (
                          <div
                            key={admin.id}
                            className="flex items-center justify-between gap-4 p-2 border rounded-md"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={admin.avatar_url || undefined}
                                />
                                <AvatarFallback>
                                  {admin.full_name?.[0]?.toUpperCase() || "A"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-2">
                                <p className="font-semibold">
                                  {admin.full_name}
                                </p>
                                <p className="text-sm text-foreground">
                                  {admin.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {admin.role}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost">
                                  <MoreHorizontal size={20} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => toast("Edit admin")}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toast("Delete admin")}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
