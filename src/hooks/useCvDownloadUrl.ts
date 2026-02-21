"use client";

import { useCallback } from "react";
import { api } from "@/lib/trpc/client";

/** Cache TTL : 14 min (URL signée expire à 15 min) */
const CACHE_TTL_MS = 14 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const cache = new Map<string, CacheEntry>();

const getCacheKey = (candidateId?: string, shareToken?: string) =>
  shareToken ? `share:${shareToken}` : `candidate:${candidateId}`;

export const useCvDownloadUrl = () => {
  const utils = api.useUtils();

  const getUrl = useCallback(
    async (
      opts: { candidateId: string } | { shareToken: string },
    ): Promise<string> => {
      const key = getCacheKey(
        "candidateId" in opts ? opts.candidateId : undefined,
        "shareToken" in opts ? opts.shareToken : undefined,
      );
      const now = Date.now();
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.url;
      }
      let result: { url: string };
      if ("candidateId" in opts) {
        result = await utils.candidate.getCvDownloadUrl.fetch({
          candidateId: opts.candidateId,
        });
      } else {
        result = await utils.candidate.getCvDownloadUrlByShareToken.fetch({
          token: opts.shareToken,
        });
      }
      cache.set(key, { url: result.url, expiresAt: now + CACHE_TTL_MS });
      return result.url;
    },
    [utils],
  );

  return { getUrl };
};
