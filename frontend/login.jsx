import React, { useState } from "react";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");

    console.log("Login successful:", form);
    alert("Login successful");
    window.location.href = "/";
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>Quickline Management Africa</div>

        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Login to your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.primaryButton}>
            Login
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => (window.location.href = "/register.html")}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;