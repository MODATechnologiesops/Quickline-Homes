import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { ALL_SERVICES } from "../../lib/services";

export const metadata = {
  title: "Property Services | Quickline Homes",
  description: "Browse Quickline Homes property management and maintenance services.",
};

export default function ServicesPage() {
  return (
    <main className="services-page">
      <SiteHeader />
      <section className="services-page-intro">
        <p className="marketplace-kicker">QUICKLINE HOMES SERVICES</p>
        <h1>Property support, requested your way.</h1>
        <p>Select a service, send us the property and date details, and our admin team will review the request and set the price.</p>
      </section>
      <section className="services-directory" aria-label="Available services">
        {ALL_SERVICES.map((service) => (
          <article className="service-card" key={service.slug}>
            <img src={service.image} alt={service.imageAlt} loading="lazy" />
            <div className="service-card-content">
            <p className="marketplace-kicker">PROPERTY SERVICE</p>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <Link className="btn" href={`/services/${service.slug}`}>View and book service</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
