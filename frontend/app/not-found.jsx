import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f7f7fb",
        color: "#19184f",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section>
        <p style={{ color: "#e52d3d", fontWeight: 700 }}>404</p>
        <h1>Page not found</h1>
        <p>The page may have moved or the address may be incorrect.</p>
        <Link href="/" style={{ color: "#171653", fontWeight: 700 }}>
          Return to Quickline Homes
        </Link>
      </section>
    </main>
  );
}
