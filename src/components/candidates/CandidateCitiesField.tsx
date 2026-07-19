"use client";

import { Label } from "@/components/ui/label";
import {
  CityAutocomplete,
  type CityOption,
} from "@/components/shared/CityAutocomplete";

type Props = {
  value: CityOption[];
  onChange: (cities: CityOption[]) => void;
  disabled?: boolean;
};

/**
 * Champ « Villes » d'un candidat : liste ordonnée gérée hors React Hook Form
 * (state contrôlé value/onChange). Partagé entre les formulaires de création et
 * d'édition. L'ordre est dérivé de la position des chips dans CityAutocomplete.
 */
export const CandidateCitiesField = ({ value, onChange, disabled }: Props) => (
  <div className="space-y-2">
    <Label>Villes</Label>
    <CityAutocomplete
      mode="multi"
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);
