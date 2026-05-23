import { useState } from "react";

export interface BannerRegistryEntry {
  key: string;
  label: string;
  description: string;
}

export const BANNER_KEYS = {
  AI_AD_CAMPAIGN: "admin-ai-ad-campaign-banner-dismissed",
  GALLERIES_BLOG_NAV: "admin-galleries-blog-nav-banner-dismissed",
} as const;

export const BANNER_REGISTRY: BannerRegistryEntry[] = [
  {
    key: BANNER_KEYS.AI_AD_CAMPAIGN,
    label: "AI Ad Campaign banner",
    description: "Promotional banner in the Social Media Portal highlighting the AI-Powered Ad Campaign Manager.",
  },
  {
    key: BANNER_KEYS.GALLERIES_BLOG_NAV,
    label: "Galleries & Blog navigation banner",
    description: "Navigation hint on the Admin Dashboard directing admins to Galleries and Blog Posts in Content Management.",
  },
];

export function useDismissibleBanner(key: string) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(key) === "true"
  );

  const dismiss = () => {
    localStorage.setItem(key, "true");
    setDismissed(true);
  };

  const restore = () => {
    localStorage.removeItem(key);
    setDismissed(false);
  };

  return { dismissed, dismiss, restore };
}
