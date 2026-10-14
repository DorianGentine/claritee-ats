/** Retourne les initiales (2 lettres) à partir du prénom et du nom. */
export const getInitials = (firstName: string, lastName: string): string =>
  `${firstName.trim().charAt(0).toUpperCase()}${lastName.trim().charAt(0).toUpperCase()}`

/** Libellé des villes du candidat, dans l'ordre reçu (« Paris · Lyon »), ou null si aucune. */
export const formatCandidateCities = (
  cities: Array<{ city: { name: string } }>
): string | null =>
  cities.length > 0
    ? cities.map((candidateCity) => candidateCity.city.name).join(" · ")
    : null
