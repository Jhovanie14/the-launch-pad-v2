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
import { AuthUser } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import UpdateVehicleModal from "@/components/update-vehicle-modal";

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
      toast.success("Profile updated successfully! 🎉");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile. Please try again.");
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

  const { vehicles: userVehicles, subscribedIds, loading: vehiclesLoading, addVehicle, removeVehicle, refetch } = useUserVehicles();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<typeof userVehicles[0] | null>(null);
  const [newVehicle, setNewVehicle] = useState({ plate: "", make: "", model: "", year: "", body_type: "", color: "" });

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate.trim()) return;
    setAddingVehicle(true);
    const ok = await addVehicle(newVehicle.plate, {
      make: newVehicle.make,
      model: newVehicle.model,
      year: newVehicle.year,
      body_type: newVehicle.body_type,
      color: newVehicle.color,
    });
    if (ok) {
      toast.success("Vehicle added successfully!");
      setNewVehicle({ plate: "", make: "", model: "", year: "", body_type: "", color: "" });
      setShowAddForm(false);
    } else {
      toast.error("Failed to add vehicle. Please try again.");
    }
    setAddingVehicle(false);
  };

  const handleRemoveVehicle = async (id: string) => {
    const ok = await removeVehicle(id);
    if (ok) toast.success("Vehicle removed.");
    else toast.error("Failed to remove vehicle.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <Card className="h-fit">
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

      {/* My Vehicles */}
      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Vehicles</CardTitle>
              <CardDescription className="space-y-1">
                <span className="block">Save your vehicles for faster booking.</span>
                <span className="block text-xs text-amber-600 font-medium">⚠ Added vehicles are not part of your subscription.</span>
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button size="sm" onClick={() => setShowAddForm(true)} className="bg-blue-900 hover:bg-blue-800">
                <Plus className="w-4 h-4 mr-1" /> Add Vehicle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Vehicle Form */}
          {showAddForm && (
            <form onSubmit={handleAddVehicle} className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="new-plate">License Plate <span className="text-red-500">*</span></Label>
                  <Input
                    id="new-plate"
                    placeholder="e.g. ABC 1234"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                    className="font-mono uppercase tracking-widest"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-make">Make <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input
                    id="new-make"
                    placeholder="e.g. Toyota"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, make: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-model">Model <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input
                    id="new-model"
                    placeholder="e.g. Camry"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, model: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-year">Year <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input
                    id="new-year"
                    placeholder="e.g. 2022"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, year: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-body">Body Type <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input
                    id="new-body"
                    placeholder="e.g. SUV, Sedan"
                    value={newVehicle.body_type}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, body_type: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="new-color">Color <span className="text-xs text-gray-400">(optional)</span></Label>
                  <Input
                    id="new-color"
                    placeholder="e.g. Black"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setShowAddForm(false); setNewVehicle({ plate: "", make: "", model: "", year: "", body_type: "", color: "" }); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addingVehicle} className="bg-blue-900 hover:bg-blue-800">
                  {addingVehicle ? "Saving..." : "Save Vehicle"}
                </Button>
              </div>
            </form>
          )}

          {/* Vehicle List */}
          {vehiclesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : userVehicles.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              <Car className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              No vehicles saved yet. Add one to speed up your bookings.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex flex-col justify-between p-4 border rounded-lg bg-white gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Car className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <p className="font-bold font-mono tracking-wider text-gray-900">
                          {vehicle.license_plate}
                        </p>
                        {subscribedIds.has(vehicle.id) ? (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Subscription</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Saved</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                        {vehicle.make && (
                          <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Make:</span> {vehicle.make}</p>
                        )}
                        {vehicle.model && (
                          <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Model:</span> {vehicle.model}</p>
                        )}
                        {vehicle.year && (
                          <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Year:</span> {vehicle.year}</p>
                        )}
                        {vehicle.body_type && (
                          <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Type:</span> {vehicle.body_type}</p>
                        )}
                        {vehicle.colors && vehicle.colors.length > 0 && (
                          <p className="text-xs text-gray-500 col-span-2"><span className="font-medium text-gray-700">Color:</span> {vehicle.colors.join(", ")}</p>
                        )}
                        {vehicle.license_plate && (
                          <p className="text-xs text-gray-500 col-span-2"><span className="font-medium text-gray-700">License Plate:</span> {vehicle.license_plate}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingVehicle(vehicle)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    {!subscribedIds.has(vehicle.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRemoveVehicle(vehicle.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <UpdateVehicleModal
          open={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          vehicles={[{
            id: editingVehicle.id,
            license_plate: editingVehicle.license_plate,
            year: editingVehicle.year ?? null,
            make: editingVehicle.make,
            model: editingVehicle.model,
            body_type: editingVehicle.body_type,
            colors: editingVehicle.colors ?? null,
          }]}
          subscriberName={user.full_name || user.email}
          onUpdated={() => { refetch(); setEditingVehicle(null); }}
        />
      )}
    </div>
  );
}
