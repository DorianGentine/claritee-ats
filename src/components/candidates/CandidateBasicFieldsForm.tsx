"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CandidateBasicFields = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  title?: string;
  city?: string;
  summary?: string;
};

type Props = {
  register: UseFormRegister<CandidateBasicFields>;
  errors: FieldErrors<CandidateBasicFields>;
  showSummary?: boolean;
};

export const CandidateBasicFieldsForm = ({
  register,
  errors,
  showSummary = false,
}: Props) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">
          Prénom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="firstName"
          autoComplete="given-name"
          aria-required
          aria-invalid={!!errors.firstName}
          {...register("firstName")}
        />
        {errors.firstName && (
          <p className="text-sm text-destructive" role="alert">
            {errors.firstName.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="lastName"
          autoComplete="family-name"
          aria-required
          aria-invalid={!!errors.lastName}
          {...register("lastName")}
        />
        {errors.lastName && (
          <p className="text-sm text-destructive" role="alert">
            {errors.lastName.message}
          </p>
        )}
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        placeholder="candidat@exemple.fr"
        aria-invalid={!!errors.email}
        {...register("email")}
      />
      {errors.email && (
        <p className="text-sm text-destructive" role="alert">
          {errors.email.message}
        </p>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="phone">Téléphone</Label>
      <Input
        id="phone"
        type="tel"
        autoComplete="tel"
        placeholder="06 12 34 56 78"
        aria-invalid={!!errors.phone}
        {...register("phone")}
      />
      {errors.phone && (
        <p className="text-sm text-destructive" role="alert">
          {errors.phone.message}
        </p>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="linkedinUrl">Profil LinkedIn</Label>
      <Input
        id="linkedinUrl"
        type="url"
        placeholder="https://linkedin.com/in/..."
        aria-invalid={!!errors.linkedinUrl}
        {...register("linkedinUrl")}
      />
      {errors.linkedinUrl && (
        <p className="text-sm text-destructive" role="alert">
          {errors.linkedinUrl.message}
        </p>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="title">Intitulé du poste / Titre</Label>
      <Input
        id="title"
        placeholder="Développeur full stack"
        aria-invalid={!!errors.title}
        {...register("title")}
      />
      {errors.title && (
        <p className="text-sm text-destructive" role="alert">
          {errors.title.message}
        </p>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="city">Ville</Label>
      <Input
        id="city"
        autoComplete="address-level2"
        placeholder="Paris"
        aria-invalid={!!errors.city}
        {...register("city")}
      />
      {errors.city && (
        <p className="text-sm text-destructive" role="alert">
          {errors.city.message}
        </p>
      )}
    </div>

    {showSummary && (
      <div className="space-y-2">
        <Label htmlFor="summary">Résumé</Label>
        <Textarea
          id="summary"
          rows={4}
          maxLength={500}
          placeholder="Décrivez brièvement le profil du candidat…"
          aria-invalid={!!errors.summary}
          {...register("summary")}
        />
        {errors.summary && (
          <p className="text-sm text-destructive" role="alert">
            {errors.summary.message}
          </p>
        )}
      </div>
    )}
  </>
);
