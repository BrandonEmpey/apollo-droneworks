// Schema.org JSON-LD helpers for Apollo DroneWorks
// Embed via <script type="application/ld+json">{JSON.stringify(schema)}</script> inside <Helmet>

export const SITE_URL = "https://apollodroneworks.com";
export const BUSINESS_NAME = "Apollo DroneWorks";
export const BUSINESS_EMAIL = "apollodroneworks@icloud.com";
export const BUSINESS_PHONE = "+14357035509";
export const BUSINESS_AREA = "Southern Utah";
export const LOGO_URL = `${SITE_URL}/apollo-logo.png`;
export const OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS_NAME,
    description:
      "Professional drone services including aerial photography, real estate videography, photogrammetry, 3D mapping, and construction monitoring in Southern Utah.",
    url: SITE_URL,
    logo: LOGO_URL,
    image: LOGO_URL,
    email: BUSINESS_EMAIL,
    telephone: BUSINESS_PHONE,
    areaServed: {
      "@type": "State",
      name: "Utah",
      sameAs: "https://en.wikipedia.org/wiki/Utah",
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: "UT",
      addressCountry: "US",
    },
    priceRange: "$$",
    sameAs: [
      "https://www.instagram.com/apollodroneworks",
      "https://www.facebook.com/apollodroneworks",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Drone Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Real Estate Aerial Photography" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Construction Site Monitoring" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Photogrammetry & 3D Mapping" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Aerial Videography" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Roof & Infrastructure Inspection" } },
      ],
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS_NAME,
    publisher: { "@id": `${SITE_URL}/#business` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/services?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function serviceSchema(svc: {
  id: number;
  name: string;
  description: string;
  price?: string | number | null;
  imageUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/services/${svc.id}`,
    name: svc.name,
    description: svc.description,
    provider: { "@id": `${SITE_URL}/#business` },
    areaServed: BUSINESS_AREA,
    url: `${SITE_URL}/services/${svc.id}`,
    ...(svc.imageUrl ? { image: svc.imageUrl } : {}),
    ...(svc.price
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: String(svc.price),
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
        { "@type": "ListItem", position: 3, name: svc.name, item: `${SITE_URL}/services/${svc.id}` },
      ],
    },
  };
}

export function articleSchema(post: {
  id: number;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}) {
  const datePublished = post.createdAt ? new Date(post.createdAt).toISOString() : undefined;
  const dateModified = post.updatedAt ? new Date(post.updatedAt).toISOString() : datePublished;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE_URL}/blog/${post.id}`,
    headline: post.title,
    description: post.excerpt || undefined,
    ...(post.imageUrl ? { image: post.imageUrl } : {}),
    author: {
      "@type": "Person",
      name: post.authorName || BUSINESS_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: BUSINESS_NAME,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    datePublished,
    dateModified,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.id}` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.id}` },
      ],
    },
  };
}

export function breadcrumbSchema(items: { name: string; item?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(crumb.item ? { item: crumb.item } : {}),
    })),
  };
}
