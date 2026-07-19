"use client";

import React from 'react';
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api";

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        errorRetryCount: 2,
        // Keep showing old data while fresh fetch runs → no blank flash
        keepPreviousData: true,
        // Deduplicate identical requests within 10s window (prevents re-fetch on every navigation)
        dedupingInterval: 10_000,
      }}
    >
      {children}
    </SWRConfig>
  );
};

