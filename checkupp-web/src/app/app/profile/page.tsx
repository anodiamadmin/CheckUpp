"use client";

import { FormEvent } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useClinicianProfileQuery,
  useUpsertClinicianProfileMutation,
} from "@/lib/query/clinician-hooks";

export default function ProfilePage() {
  const profileQuery = useClinicianProfileQuery();
  const saveMutation = useUpsertClinicianProfileMutation();

  useQueryErrorToast({
    isError: profileQuery.isError,
    error: profileQuery.error,
    title: "Failed to load clinician profile",
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
    const specialty = String(formData.get("specialty") ?? "").trim();

    saveMutation.mutate(
      {
        licenseNumber: licenseNumber || null,
        specialty: specialty || null,
      },
      {
        onSuccess: () => {
          toast.success("Clinician profile saved.");
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save profile. Check API validation and try again.";
          toast.error("Failed to save profile", { description: message });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clinician Profile"
        description="Keep your professional profile current for patient relationship and consent workflows."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinician Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {profileQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Profile unavailable</AlertTitle>
              <AlertDescription>
                The API could not return a clinician profile for this account.
              </AlertDescription>
            </Alert>
          ) : null}

          <form
            key={profileQuery.data?.id ?? "profile-form"}
            className="mt-4 space-y-4"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profileQuery.data?.user?.email || ""} readOnly />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  defaultValue={profileQuery.data?.licenseNumber || ""}
                  placeholder="Enter license number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  name="specialty"
                  defaultValue={profileQuery.data?.specialty || ""}
                  placeholder="e.g. Oncology"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={profileQuery.data?.organization?.name || "Not assigned"}
                readOnly
              />
            </div>

            <Button className="w-full md:w-auto" disabled={saveMutation.isPending} type="submit">
              <Save className="mr-1 size-4" />
              {saveMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
