import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import ServiceRequestForm from "../../../components/ServiceRequestForm";
import { ALL_SERVICES, getServiceBySlug } from "../../../lib/services";

export function generateStaticParams() {
  return ALL_SERVICES.map(({ slug }) => ({ service: slug }));
}

export async function generateMetadata({ params }) {
  const service = getServiceBySlug(params.service);
  return {
    title: service ? `${service.name} | Quickline Homes` : "Service not found | Quickline Homes",
    description: service?.description || "Quickline Homes service booking.",
  };
}

export default function ServiceDetailPage({ params }) {
  const service = getServiceBySlug(params.service);
  if (!service) notFound();

  return (
    <main className="services-page">
      <SiteHeader />
      <section className="service-detail-intro">
        <Link href="/services" className="service-back-link">← All services</Link>
        <p className="marketplace-kicker">QUICKLINE HOMES SERVICE</p>
        <h1>{service.name}</h1>
        <p>{service.description}</p>
      </section>
      <div className="service-detail-image">
        <img src={service.image} alt={service.imageAlt} />
      </div>
      {service.subServices?.length > 0 && (
        <nav className="service-detail-subservices" aria-label={`${service.name} service options`}>
          {service.subServices.map((subService) => (
            <Link href={`/services/${subService.slug}`} key={subService.slug}>
              {subService.name} →
            </Link>
          ))}
        </nav>
      )}
      <ServiceRequestForm service={service} />
    </main>
  );
}
