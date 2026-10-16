"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("Application route error:", error);
  }, [error]);

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
      <section
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
        <h1>Something went wrong</h1>
        <p role="alert">
          {error.message || "The page could not be loaded. Please try again."}
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
      </section>
    </main>
  );
}
