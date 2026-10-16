
import Link from "next/link";
import Brand from "./Brand";

export default function Footer() {
  return (
    <footer className="footer" id="site-footer">
      <div className="footer-brand">
        <Brand />
        <p>
          Your Property. Our Priority.
          <br />
          Your Peace of Mind.
        </p>

        <div className="socials">

            <a href="https://wa.me/254706127044" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <img src="https://cdn.simpleicons.org/whatsapp" width="24" height="24" alt="WhatsApp" style={{ filter: "invert(1)" }} />
             </a>
             <a href="https://www.facebook.com/quicklineafrica" target="_blank" rel="noreferrer" aria-label="Facebook">
                <img src="https://cdn.simpleicons.org/facebook" width="24" height="24" alt="Facebook" style={{ filter: "invert(1)" }} />
             </a>
            <a href="https://www.instagram.com/quicklineafrica" target="_blank" rel="noreferrer" aria-label="Instagram">
                <img src="https://cdn.simpleicons.org/instagram" width="24" height="24" alt="Instagram" style={{ filter: "invert(1)" }} />
            </a>
            <a href="https://www.tiktok.com/@quicklinemanagementafrica" target="_blank" rel="noreferrer" aria-label="TikTok">
                <img src="https://cdn.simpleicons.org/tiktok" width="24" height="24" alt="TikTok" style={{ filter: "invert(1)" }} />
            </a>
            <a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X">
                <img src="https://cdn.simpleicons.org/x" width="24" height="24" alt="X" style={{ filter: "invert(1)" }} />
            </a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <img src="https://cdn.simpleicons.org/linkedin" width="24" height="24" alt="LinkedIn" style={{ filter: "invert(1)" }} />
            </a>
        </div>
      </div>

      <div className="footer-links">
        <h3>Explore</h3>
        <Link href="/">Home</Link>
        <Link href="/marketplace">Find Properties</Link>
        <Link href="/properties">Manage Properties</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/login">Login / Register</Link>
      </div>

      <div className="footer-links">
        <h3>Management</h3>
        <Link href="/tenants">Tenants</Link>
        <Link href="/maintenance">Maintenance</Link>
        <Link href="/payments">Pay Rent</Link>
        <Link href="/login?mode=register">Create Account</Link>
      </div>

      <div className="footer-links" id="footer-contact">
        <h3>Contact Us</h3>
        <a href="tel:+254706127044">+254-706-127-044</a>
        <a href="mailto:Quicklinemanagementafrica@gmail.com">
          Quicklinemanagementafrica@gmail.com
        </a>
        <Link href="/#services">Our Services</Link>
        <Link href="/#contact">Contact Section</Link>
      </div>

      <div className="copyright">
        <span>
          © {new Date().getFullYear()} Quickline Homes. All rights reserved.
        </span>
        <span>Quickline Management Africa</span>
      </div>
    </footer>
  );
}
