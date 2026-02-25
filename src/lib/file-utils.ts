/**
 * Convertit un fichier en base64 et extrait le type MIME depuis l'en-tête data URL.
 * @param file - Fichier à convertir
 * @param defaultMime - Type MIME par défaut si l'en-tête n'est pas parsable
 */
export const fileToBase64 = (
  file: File,
  defaultMime = "application/octet-stream"
): Promise<{ base64: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeMatch = header?.match(/:(.+);/);
      const mimeType = (mimeMatch?.[1] ?? defaultMime) as string;
      resolve({ base64: base64 ?? "", mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
