---
title: Update the category pages to show the new service names and descriptions
---
# Update category pages for the new service catalog

  ## What & Why
  The industry / category pages (e.g. /services/real-estate, /services/property-inspections, /services/mapping-modeling) use a SLUG_TO_CATEGORY map that still references old category names like "Real Estate & Marketing". The new catalog uses "Real Estate & Aerial Services" as one of its categories. Without this fix, the category filter pages may show no services or broken counts.

  ## Done looks like
  - SLUG_TO_CATEGORY in `client/src/pages/industry-page.tsx` is updated so the three slugs map to the three new category strings: "Real Estate & Aerial Services", "Property Inspections", "Mapping & Modeling"
  - All 10 services are correctly distributed across the three category pages
  - No broken or empty category pages

  ## Relevant files
  - `client/src/pages/industry-page.tsx` — SLUG_TO_CATEGORY map and category filter logic