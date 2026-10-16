"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f7f7fb",
          color: "#19184f",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "32px",
            border: "1px solid #e9e9f0",
            borderRadius: "16px",
            background: "#fff",
          }}
        >
          <p style={{ color: "#e52d3d", fontWeight: 700 }}>QUICKLINE HOMES</p>
          <h1>The app could not start</h1>
          <p role="alert">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 18px",
              border: 0,
              borderRadius: "8px",
              background: "#171653",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ color: "#77798a", fontSize: "12px" }}>
              Error reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
