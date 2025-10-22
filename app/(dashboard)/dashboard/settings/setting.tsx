"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
// import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AuthUser } from "@/types";
import { createClient } from "@/utils/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfileProps {
  user: AuthUser;
}

export function UserProfile({ user }: UserProfileProps) {
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    fullName: user.full_name || "",
    email: user.email,
    phone: user.phone || "",
    avatar_url: user.avatar_url || null,
  });

  // 👇 Update preview when a new file is selected
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Cleanup URL when file changes or component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // 👈 instant preview
    }
  };

  const handleAvatarUpload = async (): Promise<string | null> => {
    if (!file) return formData.avatar_url; // return current avatar if no new file
    setIsUploading(true);

    const filePath = `${user.id}/avatar-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      alert(uploadError.message);
      setIsUploading(false);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    setIsUploading(false);
    return publicUrl; // ✅ return the URL
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Upload avatar if selected
      let avatarUrl = formData.avatar_url;
      if (file) {
        avatarUrl = await handleAvatarUpload(); // returns public URL
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update local state
      setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setSuccessMessage("Profile updated successfully!");
      setShowSuccessDialog(true); // 👈 show success popup
    } catch (error) {
      console.error("Error saving profile:", error);
      setSuccessMessage("Failed to update profile.");
      setShowSuccessDialog(true); // show error in the same dialog
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.full_name || "",
      email: user.email,
      phone: user.phone || "",
      avatar_url: user.avatar_url || "",
    });
    setIsEditing(false);
  };

  return (
    <>
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your account settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={previewUrl || formData.avatar_url || undefined}
                alt={formData.fullName || "User"}
              />
              <AvatarFallback>
                {formData.fullName?.charAt(0) ||
                  formData.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <div>
                <Label htmlFor="avatar">Change Avatar</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            )}
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-sm">{user.full_name || "No name set"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="text-sm">{user.phone || "No phone number set"}</p>
              )}
            </div>

            {/* <div className="space-y-2">
            <Label>Role</Label>
            <Badge variant="outline">{user.role}</Badge>
          </div> */}

            <div className="space-y-2">
              <Label>Member Since</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading && <p>loading</p>}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {successMessage.includes("successfully") ? "Success" : "Error"}
            </AlertDialogTitle>
            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowSuccessDialog(false)}
              className="bg-blue-900 hover:bg-blue-800"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
