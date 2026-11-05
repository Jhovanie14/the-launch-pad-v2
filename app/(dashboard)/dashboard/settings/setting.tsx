"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuthUser } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { BadgeCheck, Car, Pencil, Plus } from "lucide-react";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import UpdateVehicleModal from "@/components/update-vehicle-modal";
import { MarketingConsentSwitch } from "@/components/settings/marketing-consent-switch";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  user: AuthUser;
}

const CARD = "rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7";
const SECTION_TITLE = "text-xl font-black tracking-tight text-ink";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const QUIET_BUTTON = cn(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas disabled:opacity-60",
  FOCUS,
);
const SOLID_BUTTON = cn(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-night px-4 text-sm font-semibold text-on-night hover:bg-night-raised disabled:opacity-60",
  FOCUS,
);
const FIELD = "h-11";

const EMPTY_VEHICLE = { plate: "", make: "", model: "", year: "", body_type: "", color: "" };

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

  // Update the preview when a new file is selected
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

  const handleAvatarUpload = async (): Promise<string | null> => {
    if (!file) return formData.avatar_url; // return current avatar if no new file
    setIsUploading(true);

    const filePath = `${user.id}/avatar-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      toast.error(`Couldn't upload your photo: ${uploadError.message}`);
      setIsUploading(false);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    setIsUploading(false);
    return publicUrl;
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
      toast.success("Profile saved.");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Couldn't save your profile. Please try again.");
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
  const [vehicleToDelete, setVehicleToDelete] = useState<typeof userVehicles[0] | null>(null);
  const [newVehicle, setNewVehicle] = useState(EMPTY_VEHICLE);

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
      toast.success("Vehicle saved.");
      setNewVehicle(EMPTY_VEHICLE);
      setShowAddForm(false);
    } else {
      toast.error("Couldn't save that vehicle. Check the plate and try again.");
    }
    setAddingVehicle(false);
  };

  const handleRemoveVehicle = async (id: string) => {
    const ok = await removeVehicle(id);
    if (ok) toast.success("Vehicle deleted.");
    else toast.error("Couldn't delete that vehicle. Please try again.");
  };

  const busy = isLoading || isUploading;
  const displayName = formData.fullName;
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        {/* Profile */}
        <section aria-labelledby="profile-heading" className={CARD}>
          <div className="flex items-start justify-between gap-4">
            <h2 id="profile-heading" className={SECTION_TITLE}>
              Profile
            </h2>
            {!isEditing && (
              <button type="button" onClick={() => setIsEditing(true)} className={cn(QUIET_BUTTON, "-mt-2")}>
                <Pencil aria-hidden className="size-4" />
                Edit profile
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <Avatar className="size-16 ring-1 ring-line">
              <AvatarImage
                src={previewUrl || formData.avatar_url || undefined}
                alt=""
              />
              <AvatarFallback className="bg-dusk text-xl font-bold text-on-night">
                {formData.fullName?.charAt(0).toUpperCase() ||
                  formData.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{displayName || "No name yet"}</p>
              <p className="truncate text-sm text-ink-muted">{user.email}</p>
            </div>
          </div>

          {isEditing ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile photo</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className={cn(FIELD, "py-2 file:h-7")}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  className={FIELD}
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className={FIELD}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="(832) 555-0123"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={handleCancel} disabled={busy} className={QUIET_BUTTON}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className={SOLID_BUTTON}>
                  {isUploading ? "Uploading photo…" : isLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <dl className="mt-6 divide-y divide-line-soft border-y border-line-soft text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-ink-muted">Full name</dt>
                <dd className="text-right font-semibold text-ink">{formData.fullName || "Not set"}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-ink-muted">Email</dt>
                <dd className="min-w-0 truncate text-right font-semibold text-ink">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-ink-muted">Phone</dt>
                <dd className="text-right font-semibold text-ink">{formData.phone || "Not set"}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-ink-muted">Customer since</dt>
                <dd className="text-right font-semibold text-ink">{memberSince}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* Email preferences */}
        <section aria-labelledby="email-heading" className={CARD}>
          <h2 id="email-heading" className={SECTION_TITLE}>
            Email preferences
          </h2>
          <div className="mt-4">
            <MarketingConsentSwitch />
          </div>
        </section>
      </div>

      {/* Vehicles */}
      <section aria-labelledby="vehicles-heading" className={CARD}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="vehicles-heading" className={SECTION_TITLE}>
            Your vehicles
          </h2>
          {!showAddForm && (
            <button type="button" onClick={() => setShowAddForm(true)} className={cn(SOLID_BUTTON, "-mt-2")}>
              <Plus aria-hidden className="size-4" />
              Add vehicle
            </button>
          )}
        </div>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Saved vehicles make booking faster. Saving one here doesn&apos;t add it to your
          membership; do that from{" "}
          <Link
            href="/dashboard/billing"
            className="rounded font-semibold text-ink underline underline-offset-4 hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Billing
          </Link>
          .
        </p>

        {/* Add vehicle form */}
        {showAddForm && (
          <form onSubmit={handleAddVehicle} className="mt-5 border-t border-line-soft pt-5">
            <fieldset className="space-y-4">
              <legend className="text-base font-bold text-ink">Add a vehicle</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="new-plate">License plate</Label>
                  <Input
                    id="new-plate"
                    placeholder="ABC 1234"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                    className={cn(FIELD, "font-mono uppercase tracking-[0.12em]")}
                    autoComplete="off"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-make">Make <span className="font-normal text-ink-muted">(optional)</span></Label>
                  <Input
                    id="new-make"
                    placeholder="Toyota"
                    className={FIELD}
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, make: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-model">Model <span className="font-normal text-ink-muted">(optional)</span></Label>
                  <Input
                    id="new-model"
                    placeholder="Camry"
                    className={FIELD}
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, model: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-year">Year <span className="font-normal text-ink-muted">(optional)</span></Label>
                  <Input
                    id="new-year"
                    inputMode="numeric"
                    placeholder="2022"
                    className={FIELD}
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, year: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-body">Body type <span className="font-normal text-ink-muted">(optional)</span></Label>
                  <Input
                    id="new-body"
                    placeholder="SUV, sedan…"
                    className={FIELD}
                    value={newVehicle.body_type}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, body_type: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="new-color">Color <span className="font-normal text-ink-muted">(optional)</span></Label>
                  <Input
                    id="new-color"
                    placeholder="Black"
                    className={FIELD}
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle((p) => ({ ...p, color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={QUIET_BUTTON}
                  onClick={() => {
                    setShowAddForm(false);
                    setNewVehicle(EMPTY_VEHICLE);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={addingVehicle} className={SOLID_BUTTON}>
                  {addingVehicle ? "Saving…" : "Save vehicle"}
                </button>
              </div>
            </fieldset>
          </form>
        )}

        {/* Vehicle list */}
        {vehiclesLoading ? (
          <div aria-busy="true" aria-label="Loading your vehicles" className="mt-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-line-soft motion-reduce:animate-none" />
            ))}
          </div>
        ) : userVehicles.length === 0 ? (
          !showAddForm && (
            <div className="mt-5 flex items-center gap-3 border-t border-line-soft pt-5 text-sm text-ink-muted">
              <Car aria-hidden className="size-5 shrink-0 text-ink-subtle" />
              No saved vehicles yet. Add one and it&apos;s ready to pick next time you book.
            </div>
          )
        ) : (
          <ul className="mt-5 divide-y divide-line-soft border-y border-line-soft">
            {userVehicles.map((vehicle) => {
              const onPlan = subscribedIds.has(vehicle.id);
              const name =
                [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
              const details = [vehicle.body_type, vehicle.colors?.join(", ")].filter(Boolean).join(" · ");
              return (
                <li key={vehicle.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4">
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-semibold text-ink">{name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <LicensePlate plate={vehicle.license_plate} />
                      {details && <span className="text-sm text-ink-muted">{details}</span>}
                    </div>
                    {onPlan && (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        <BadgeCheck aria-hidden className="size-4 text-brand-blue" />
                        On your plan
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={QUIET_BUTTON}
                      onClick={() => setEditingVehicle(vehicle)}
                    >
                      Edit<span className="sr-only"> {vehicle.license_plate}</span>
                    </button>
                    {!onPlan && (
                      <button
                        type="button"
                        onClick={() => setVehicleToDelete(vehicle)}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-destructive/10",
                          FOCUS,
                        )}
                      >
                        Delete<span className="sr-only"> {vehicle.license_plate}</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Delete saved vehicle confirmation */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent className="lp-theme rounded-2xl border-line bg-paper text-ink">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight">
              Delete {vehicleToDelete?.license_plate} from your saved vehicles?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-muted">
              You won&apos;t be able to pick it when you book. You can add it again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 font-semibold">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive font-semibold text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
              onClick={() => {
                if (vehicleToDelete) handleRemoveVehicle(vehicleToDelete.id);
                setVehicleToDelete(null);
              }}
            >
              Delete vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
