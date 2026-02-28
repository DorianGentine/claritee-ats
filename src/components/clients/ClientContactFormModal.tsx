"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientContactSchema } from "@/lib/validations/client";
import type { z } from "zod";
import { toast } from "sonner";

type ClientContactFormInput = z.input<typeof createClientContactSchema>;

const defaultFormValues: ClientContactFormInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  linkedinUrl: "",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientCompanyId: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    position: string | null;
    linkedinUrl: string | null;
  } | null;
  onSuccess?: () => void;
};

export const ClientContactFormModal = ({
  open,
  onOpenChange,
  clientCompanyId,
  contact,
  onSuccess,
}: Props) => {
  const utils = api.useUtils();
  const isEdit = Boolean(contact?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientContactFormInput>({
    resolver: zodResolver(createClientContactSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        reset({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          position: contact.position ?? "",
          linkedinUrl: contact.linkedinUrl ?? "",
        });
      } else {
        reset(defaultFormValues);
      }
    }
  }, [open, contact, reset]);

  const createMutation = api.clientCompany.createContact.useMutation({
    onSuccess: () => {
      void utils.clientCompany.getById.invalidate({ id: clientCompanyId });
      onSuccess?.();
      onOpenChange(false);
      reset(defaultFormValues);
      toast.success("Contact créé.")
    },
  });

  const updateMutation = api.clientCompany.updateContact.useMutation({
    onSuccess: () => {
      void utils.clientCompany.getById.invalidate({ id: clientCompanyId });
      onSuccess?.();
      onOpenChange(false);
      reset(defaultFormValues);
      toast.success("Contact modifié.")
    },
  });

  const onSubmit = (values: ClientContactFormInput) => {
    if (isEdit && contact) {
      // For update: send null for cleared optional fields so they are present in JSON
      // (undefined is stripped by JSON.stringify). Server uses null to clear DB fields.
      updateMutation.mutate({
        id: contact.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email ?? null,
        phone: values.phone ?? null,
        position: values.position ?? null,
        linkedinUrl: values.linkedinUrl ?? null,
      });
    } else {
      createMutation.mutate({
        clientCompanyId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email ?? undefined,
        phone: values.phone ?? undefined,
        position: values.position ?? undefined,
        linkedinUrl: values.linkedinUrl ?? undefined,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le contact" : "Ajouter un contact"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit
              ? "Formulaire de modification d'un contact client"
              : "Formulaire d'ajout d'un contact client"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-firstName">Prénom *</Label>
              <Input
                id="contact-firstName"
                {...register("firstName")}
                placeholder="Jean"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="contact-lastName">Nom *</Label>
              <Input
                id="contact-lastName"
                {...register("lastName")}
                placeholder="Dupont"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              {...register("email")}
              placeholder="jean.dupont@exemple.fr"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="contact-phone">Téléphone</Label>
            <Input
              id="contact-phone"
              {...register("phone")}
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div>
            <Label htmlFor="contact-position">Poste</Label>
            <Input
              id="contact-position"
              {...register("position")}
              placeholder="DRH"
            />
          </div>

          <div>
            <Label htmlFor="contact-linkedinUrl">LinkedIn</Label>
            <Input
              id="contact-linkedinUrl"
              {...register("linkedinUrl")}
              placeholder="https://linkedin.com/in/..."
            />
            {errors.linkedinUrl && (
              <p className="mt-1 text-xs text-destructive">
                {errors.linkedinUrl.message}
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive">
              Une erreur est survenue. Réessayez.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
