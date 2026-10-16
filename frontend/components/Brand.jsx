
import Link from "next/link";

export default function Brand({ compact = false }) {
  return (
    <Link
      href="/"
      className={`brand${compact ? " brand-compact" : ""}`}
      aria-label="Quickline Homes"
    >
      <span className="logo" aria-hidden="true">
        Q<span>H</span>
      </span>

      {!compact && (
        <span className="brand-text">
          <strong>quickline</strong>
          <small>HOMES</small>
        </span>
      )}
    </Link>
  );
}
