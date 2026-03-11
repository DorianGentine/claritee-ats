/** Retourne les initiales (2 lettres) à partir du prénom et du nom. */
export const getInitials = (firstName: string, lastName: string): string =>
  `${firstName.trim().charAt(0).toUpperCase()}${lastName.trim().charAt(0).toUpperCase()}`
