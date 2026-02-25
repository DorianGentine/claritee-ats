"use client";

import { useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/trpc/client";

/** Cache TTL : 14 min (URL signée expire à 15 min) */
const CACHE_TTL_MS = 14 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const cache = new Map<string, CacheEntry>();

const getCacheKey = (candidateId?: string, shareToken?: string) =>
  shareToken ? `share:${shareToken}` : `candidate:${candidateId}`;

export const useCvDownloadUrl = () => {
  const utils = api.useUtils();
  const utilsRef = useRef(utils);
  useEffect(() => {
    utilsRef.current = utils;
  }, [utils]);

  const getUrl = useCallback(
    async (
      opts: { candidateId: string } | { shareToken: string }
    ): Promise<string> => {
      const currentUtils = utilsRef.current;
      const key = getCacheKey(
        "candidateId" in opts ? opts.candidateId : undefined,
        "shareToken" in opts ? opts.shareToken : undefined
      );
      const now = Date.now();
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.url;
      }
      let result: { url: string };
      if ("candidateId" in opts) {
        result = await currentUtils.candidate.getCvDownloadUrl.fetch({
          candidateId: opts.candidateId,
        });
      } else {
        result =
          await currentUtils.candidate.getCvDownloadUrlByShareToken.fetch({
            token: opts.shareToken,
          });
      }
      cache.set(key, { url: result.url, expiresAt: now + CACHE_TTL_MS });
      return result.url;
    },
    []
  );

  return { getUrl };
};
