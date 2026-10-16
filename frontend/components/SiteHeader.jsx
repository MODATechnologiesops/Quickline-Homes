"use client";

import { useState } from "react";
import Link from "next/link";
import { SERVICES } from "../lib/services";

export default function SiteHeader() {
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <header className="home-nav">
      <Link className="home-brand" href="/" aria-label="Quickline Homes home">
        <span className="home-brand-mark">QH</span>
        <span>Quickline<small>HOMES</small></span>
      </Link>
      <nav className="home-nav-links" aria-label="Main navigation">
        <Link href="/login">Login</Link>
        <div className="home-services-nav">
          <button
            type="button"
            className="home-services-toggle"
            aria-expanded={servicesOpen}
            aria-controls="home-services-menu"
            onClick={() => setServicesOpen((open) => !open)}
          >
            <span className="home-menu-icon" aria-hidden="true"><i /><i /><i /></span>
            Services
          </button>
          {servicesOpen && (
            <div className="home-services-menu" id="home-services-menu">
              <Link href="/services" onClick={() => setServicesOpen(false)}>All services</Link>
              {SERVICES.map((service) => (
                service.subServices ? (
                  <div className="home-service-submenu" key={service.slug}>
                    <Link
                      className="home-service-parent-link"
                      href={`/services/${service.slug}`}
                      onClick={() => setServicesOpen(false)}
                    >
                      {service.name}<span aria-hidden="true">›</span>
                    </Link>
                    <div className="home-service-submenu-items">
                      {service.subServices.map((subService) => (
                        <Link
                          href={`/services/${subService.slug}`}
                          key={subService.slug}
                          onClick={() => setServicesOpen(false)}
                        >
                          {subService.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/services/${service.slug}`}
                    key={service.slug}
                    onClick={() => setServicesOpen(false)}
                  >
                    {service.name}
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
