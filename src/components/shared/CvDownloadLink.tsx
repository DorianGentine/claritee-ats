"use client";

import { useState } from "react";
import { Download, FileUp } from "lucide-react";
import { useCvDownloadUrl } from "@/hooks/useCvDownloadUrl";

type Props = {
  displayName: string;
} & ({ candidateId: string } | { shareToken: string });

export const CvDownloadLink = (props: Props) => {
  const { displayName } = props;
  const { getUrl } = useCvDownloadUrl();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const url =
        "candidateId" in props
          ? await getUrl({ candidateId: props.candidateId })
          : await getUrl({ shareToken: props.shareToken });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        aria-label={`Télécharger ${displayName}`}
      >
        <FileUp className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{displayName}</span>
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {loading && <span className="sr-only">Chargement…</span>}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
