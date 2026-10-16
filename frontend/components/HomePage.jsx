import Link from "next/link";
import Marketplace from "./Marketplace";
import SiteHeader from "./SiteHeader";
import { ALL_SERVICES } from "../lib/services";

export default function HomePage() {
  return (
    <div className="home-page">
      <SiteHeader />

      <main>
        <section className="home-hero">
          <div>
            <small>WELCOME TO QUICKLINE HOMES</small>
            <h1>Your property.<br /><em>Our priority.</em></h1>
            <p>Find your next place, manage rentals and keep property operations in one organized workspace.</p>
            <div className="home-hero-actions">
              <a className="home-button" href="#marketplace-listings">Explore properties ↗</a>
              <Link className="home-button home-button-ghost" href="/login?mode=register">Register as a landlord</Link>
            </div>
          </div>
          <img src="/images/apartment-building.png" alt="Modern apartment building" />
        </section>

        <div className="home-slogan">Your Property. Our Priority. Your Peace of Mind.</div>

        <Marketplace embedded />

        <section className="home-spaces" id="spaces">
          <p className="marketplace-kicker">EXPLORE QUICKLINE</p>
          <h2>Find a space for what’s next.</h2>
          <div className="home-cards">
            <article><span aria-hidden="true">🏢</span><h3>Apartments</h3><p>Browse apartments and rental homes.</p><Link href="/marketplace">Explore →</Link></article>
            <article><span aria-hidden="true">⌂</span><h3>Houses</h3><p>Find a place that fits your life.</p><Link href="/marketplace">Explore →</Link></article>
            <article><span aria-hidden="true">▤</span><h3>Commercial spaces</h3><p>Shops, stalls, malls and offices.</p><Link href="/marketplace">Explore →</Link></article>
            <article><span aria-hidden="true">▧</span><h3>Hotels & stays</h3><p>Discover short-stay properties.</p><Link href="/marketplace">Explore →</Link></article>
          </div>
        </section>

        <section className="home-services" id="services">
          <div>
            <p className="marketplace-kicker">SERVICES</p>
            <h2>Property care that gives you peace of mind.</h2>
          </div>
          <div className="home-service-links">
            {ALL_SERVICES.map((service) => (
              <Link href={`/services/${service.slug}`} key={service.slug} className="home-service-card">
                <img src={service.image} alt={service.imageAlt} loading="lazy" />
                <span className="home-service-card-content">
                  <strong>{service.name}</strong><small>View service →</small>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-audience">
          <h2>Made for landlords and tenants</h2>
          <div className="home-audience-cards">
            <article>
              <h3>For landlords</h3>
              <p>Create an account and add your Paybill or Till number where tenants pay rent.</p>
              <Link className="home-button" href="/login?mode=register">Register as a landlord</Link>
            </article>
            <article>
              <h3>For tenants</h3>
              <p>Use the reference number from your landlord to check rent details and payment instructions.</p>
              <Link className="home-button home-button-ghost" href="/payments">Pay rent</Link>
            </article>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <strong>Quickline Homes</strong>
        <span>+254-706-127-044 · Quicklinemanagementafrica@gmail.com</span>
        <small>© 2026 Quickline Homes. All rights reserved.</small>
      </footer>
    </div>
  );
}
