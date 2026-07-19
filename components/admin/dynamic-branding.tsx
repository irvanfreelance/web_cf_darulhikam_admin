"use client";

import { useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DynamicBranding() {
  const { data: config } = useSWR('/api/ngo-config', fetcher);

  useEffect(() => {
    if (config) {
      // Update Title
      if (config.ngo_name) {
        document.title = `${config.ngo_name} | Admin Panel`;
      }

      // Update Favicon Aggressively
      const defaultFavicon = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🕯️</text></svg>";
      const faviconUrl = config.favicon_url || defaultFavicon;
      
      const iconLinks = document.querySelectorAll("link[rel*='icon']");
      iconLinks.forEach(link => {
        (link as HTMLLinkElement).href = `${faviconUrl}${faviconUrl.startsWith('data:') ? '' : `?t=${Date.now()}`}`;
      });
      
      if (iconLinks.length === 0) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = `${faviconUrl}${faviconUrl.startsWith('data:') ? '' : `?t=${Date.now()}`}`;
        document.head.appendChild(link);
      }
      
      // Update Primary Color (CSS Variable)
      if (config.primary_color) {
        document.documentElement.style.setProperty('--primary-color', config.primary_color);
      }
    }
  }, [config]);

  return null;
}
