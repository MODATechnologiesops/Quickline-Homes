export const SERVICES = [
  {
    slug: "property-management",
    name: "Property Management",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Modern residential property managed by a property team",
    description: "Get professional support coordinating the daily care and operation of your property.",
  },
  {
    slug: "tenant-rent-management",
    name: "Tenant & Rent Management",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Bright apartment interior prepared for tenants",
    description: "Request help coordinating tenant communication, rent administration, and property records.",
  },
  {
    slug: "maintenance-repairs",
    name: "Maintenance & Repairs",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Technician carrying out building maintenance",
    description: "Book a maintenance visit or repair assessment for your property.",
  },
  {
    slug: "property-inspections",
    name: "Property Inspections",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Well-maintained home interior ready for inspection",
    description: "Arrange a property inspection and receive a service price from our team.",
  },
  {
    slug: "professional-service",
    name: "Professional & Reliable Service",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Professional team-managed commercial property",
    description: "Tell us what property support you need and our team will review your request.",
  },
  {
    slug: "project-planning-management",
    name: "Project Planning and Management",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Architect reviewing building plans at a desk",
    description: "Request help scoping, planning, and coordinating a property or construction project.",
  },
  {
    slug: "property-valuation",
    name: "Property Valuation",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Residential property for a professional valuation",
    description: "Arrange a professional assessment of your property's market value.",
  },
  {
    slug: "facility-management",
    name: "Facility Management",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Well-managed modern commercial facility",
    description: "Request ongoing support for the operation, upkeep, and coordination of your facility.",
  },
  {
    slug: "property-investment-consultations",
    name: "Property Investment Consultations",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Property professionals meeting to discuss investment plans",
    description: "Book a consultation to discuss property investment opportunities and goals.",
  },
  {
    slug: "commercial-cleaning-services",
    name: "Commercial Cleaning Services",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Professional cleaning team caring for a commercial property",
    description: "Request a commercial cleaning service for your property or facility.",
    subServices: [
      {
        slug: "estate-cleaning",
        name: "Estate Cleaning",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "Clean and orderly residential estate",
        description: "Arrange cleaning for shared spaces and grounds across a residential estate.",
        parentSlug: "commercial-cleaning-services",
      },
      {
        slug: "post-construction-cleaning",
        name: "Post-construction Cleaning",
        image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "Completed construction project being prepared for handover",
        description: "Request a detailed clean to prepare a newly built or renovated property for handover.",
        parentSlug: "commercial-cleaning-services",
      },
    ],
  },
];

export const ALL_SERVICES = SERVICES.flatMap((service) => [
  service,
  ...(service.subServices || []),
]);

export function getServiceBySlug(slug) {
  return ALL_SERVICES.find((service) => service.slug === slug);
}
