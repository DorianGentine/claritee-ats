"use client"

import { useEffect, useRef, useState } from "react"
import type { Resolver } from "react-hook-form"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { api } from "@/lib/trpc/client"
import {
  createJobOfferSchema,
  jobOfferStatusSchema,
  type CreateJobOfferInput,
  type UpdateJobOfferInput,
} from "@/lib/validations/offer"
import { getOfferStatusLabel } from "@/lib/offer-status-style"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type JobOfferStatus = z.infer<typeof jobOfferStatusSchema>

const STATUS_OPTIONS: JobOfferStatus[] = jobOfferStatusSchema.options

/** Valeur sentinelle pour "aucune sélection" (Radix Select n'accepte pas value="") */
const NONE_VALUE = "__none__"

type JobOfferFormValues = CreateJobOfferInput

type JobOfferFormProps = {
  mode: "create" | "edit"
  /**
   * Données initiales pour le formulaire en mode édition.
   * `id` est requis en mode "edit" pour déclencher offer.update.
   */
  initialOffer?: Partial<JobOfferFormValues> & { id?: string }
  /**
   * Callback appelé après succès de la mutation.
   */
  onSuccess?: (offer: {
    id: string
    title: string
    status: JobOfferStatus
    clientCompanyId: string | null
    clientContactId: string | null
    location: string | null
    salaryMin: number | null
    salaryMax: number | null
  }) => void
}

export const JobOfferForm = ({
  mode,
  initialOffer,
  onSuccess,
}: JobOfferFormProps) => {
  const router = useRouter()
  const utils = api.useUtils()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobOfferFormValues>({
    resolver: zodResolver(createJobOfferSchema) as Resolver<JobOfferFormValues>,
    defaultValues: {
      title: initialOffer?.title ?? "",
      description: initialOffer?.description ?? "",
      location: initialOffer?.location ?? "",
      salaryMin: initialOffer?.salaryMin ?? undefined,
      salaryMax: initialOffer?.salaryMax ?? undefined,
      status: initialOffer?.status ?? "TODO",
      clientCompanyId: initialOffer?.clientCompanyId ?? undefined,
      clientContactId: initialOffer?.clientContactId ?? undefined,
    },
  })

  const clientCompanyId = useWatch({
    control,
    name: "clientCompanyId",
  })
  const status = useWatch({ control, name: "status" })
  const clientContactId = useWatch({ control, name: "clientContactId" })

  const prevClientCompanyIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (
      prevClientCompanyIdRef.current !== undefined &&
      prevClientCompanyIdRef.current !== clientCompanyId
    ) {
      setValue("clientContactId", undefined)
    }
    prevClientCompanyIdRef.current = clientCompanyId
  }, [clientCompanyId, setValue])

  const clientsQuery = api.clientCompany.list.useQuery()
  const selectedClientId = clientCompanyId ?? initialOffer?.clientCompanyId

  const clientDetailsQuery = api.clientCompany.getById.useQuery(
    { id: selectedClientId ?? "" },
    { enabled: !!selectedClientId },
  )

  const createMutation = api.offer.create.useMutation({
    onSuccess: async (offer) => {
      await utils.offer.list.invalidate()
      onSuccess?.(offer)
    },
  })

  const updateMutation = api.offer.update.useMutation({
    onSuccess: async (offer) => {
      await Promise.all([
        utils.offer.list.invalidate(),
        utils.offer.getById.invalidate({ id: offer.id }),
      ])
      onSuccess?.(offer)
    },
  })

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending

  const handleSubmitForm = async (values: JobOfferFormValues) => {
    setServerError(null)

    const payload: CreateJobOfferInput = {
      title: values.title,
      description: values.description,
      location: values.location,
      salaryMin: values.salaryMin,
      salaryMax: values.salaryMax,
      status: values.status,
      clientCompanyId: values.clientCompanyId,
      clientContactId: values.clientContactId,
    }

    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(payload)
        onSuccess?.(created)
        router.push("/offers?created=1")
        return
      }

      if (!initialOffer?.id) {
        throw new Error("Missing offer id for edit mode")
      }

      const updatePayload: UpdateJobOfferInput = {
        id: initialOffer.id,
        title: values.title,
        description: values.description?.trim() ? values.description.trim() : null,
        location: values.location?.trim() ? values.location.trim() : null,
        salaryMin: values.salaryMin ?? null,
        salaryMax: values.salaryMax ?? null,
        status: values.status,
        clientCompanyId: values.clientCompanyId ?? null,
        clientContactId: values.clientContactId ?? null,
      }

      const updated = await updateMutation.mutateAsync(updatePayload)
      onSuccess?.(updated)
      router.push(`/offers?updated=1`)
    } catch (err) {
      const message =
        (err as { message?: string })?.message ??
        "Une erreur est survenue. Réessayez."
      setServerError(message)
    }
  }

  const handleSalaryTransform = (value: unknown) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return undefined
    }
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  }

  const hasClient = !!clientCompanyId
  const contacts = clientDetailsQuery.data?.contacts ?? []

  return (
    <form
      onSubmit={handleSubmit(handleSubmitForm)}
      className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            autoFocus
            placeholder="Ex. Développeur Full Stack"
            {...register("title")}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Description du poste, missions, contexte…"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="location">Localisation</Label>
          <Input
            id="location"
            placeholder="Ex. Paris, Remote…"
            {...register("location")}
          />
          {errors.location && (
            <p className="mt-1 text-xs text-destructive">
              {errors.location.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="salaryMin">Salaire min (k€ annuel)</Label>
            <Input
              id="salaryMin"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              {...register("salaryMin", {
                setValueAs: handleSalaryTransform,
              })}
            />
            {errors.salaryMin && (
              <p className="mt-1 text-xs text-destructive">
                {errors.salaryMin.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="salaryMax">Salaire max (k€ annuel)</Label>
            <Input
              id="salaryMax"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              {...register("salaryMax", {
                setValueAs: handleSalaryTransform,
              })}
            />
            {errors.salaryMax && (
              <p className="mt-1 text-xs text-destructive">
                {errors.salaryMax.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="status">Statut</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as JobOfferStatus)
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Sélectionner un statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {getOfferStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="mt-1 text-xs text-destructive">
              {errors.status.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="clientCompanyId">Client (optionnel)</Label>
          <Select
            value={clientCompanyId ?? NONE_VALUE}
            onValueChange={(value) =>
              setValue(
                "clientCompanyId",
                value === NONE_VALUE ? undefined : value,
              )
            }
          >
            <SelectTrigger id="clientCompanyId">
              <SelectValue placeholder="Sans client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sans client</SelectItem>
              {(clientsQuery.data ?? []).map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientCompanyId && (
            <p className="mt-1 text-xs text-destructive">
              {errors.clientCompanyId.message}
            </p>
          )}
        </div>

        {hasClient && (
          <div>
            <Label htmlFor="clientContactId">Contact référent (optionnel)</Label>
            <Select
              value={clientContactId ?? NONE_VALUE}
              onValueChange={(value) =>
                setValue(
                  "clientContactId",
                  value === NONE_VALUE ? undefined : value,
                )
              }
              disabled={clientDetailsQuery.isLoading || contacts.length === 0}
            >
              <SelectTrigger id="clientContactId">
                <SelectValue
                  placeholder={
                    contacts.length === 0
                      ? "Aucun contact pour ce client"
                      : "Sélectionner un contact"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Aucun</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientContactId && (
              <p className="mt-1 text-xs text-destructive">
                {errors.clientContactId.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending
            ? mode === "create"
              ? "Création…"
              : "Enregistrement…"
            : mode === "create"
              ? "Créer l'offre"
              : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/offers")}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}

