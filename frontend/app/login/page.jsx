
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "../../components/Brand";
import { api } from "../../lib/api";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "tenant",

  // Tenant details
  houseName: "",
  houseNumber: "",
  landlordReference: "",

  // Landlord payment details
  accountType: "paybill",
  businessNumber: "",
  accountNumber: "",
  accountName: "",
};

export default function Login() {
  return (
    <Suspense
      fallback={
        <main className="auth" aria-busy="true">
          <p role="status">Loading sign-in...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedMode = params.get("mode");

    if (requestedMode === "register" || requestedMode === "login") {
      setMode(requestedMode);
    }
  }, [params]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    if (mode === "register") {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();

      if (!firstName || !lastName || !email) {
        setError("First name, last name and email are required.");
        return;
      }

      if (password.length < 8) {
        setError("Your password must contain at least 8 characters.");
        return;
      }

      if (password !== form.confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }

      if (form.role === "tenant") {
        if (!form.houseName.trim() || !form.houseNumber.trim()) {
          setError("Enter your house/property name and house or unit number.");
          return;
        }
      }

      if (form.role === "landlord" && form.businessNumber.trim()) {
        if (!form.accountName.trim()) {
          setError("Enter the account name for your Paybill or Till.");
          return;
        }
      }
    }

    setBusy(true);

    try {
      if (mode === "login") {
        const response = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        const data = response.data || response;
        const user = data.user || response.user || {};
        const authToken =
          data.token ||
          data.accessToken ||
          response.token ||
          response.accessToken;

        if (!authToken) {
          throw new Error(
            "The server did not return an authentication token. Check the login controller response."
          );
        }

        localStorage.setItem("quickline_token", authToken);
        localStorage.setItem("quickline_user", JSON.stringify(user));

        router.push(user.role === "marketer" ? "/marketer/dashboard" : "/dashboard");

        return;
      }

      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const phone = form.phone.trim();
      const businessNumber = form.businessNumber.trim();

      const payload = {
        firstName,
        lastName,
        first_name: firstName,
        last_name: lastName,
        firstname: firstName,
        lastname: lastName,
        email,
        password,
        phone,
        phoneNumber: phone,
        role: form.role,

        // Tenant information
        houseName: form.houseName.trim(),
        house_name: form.houseName.trim(),
        propertyName: form.houseName.trim(),
        houseNumber: form.houseNumber.trim(),
        house_number: form.houseNumber.trim(),
        unitNumber: form.houseNumber.trim(),
        landlordReference: form.landlordReference.trim(),
        landlord_reference: form.landlordReference.trim(),

        // Landlord payment information
        accountType: form.accountType,
        businessNumber,
        paybillNumber:
          form.accountType === "paybill" ? businessNumber : "",
        tillNumber: form.accountType === "till" ? businessNumber : "",
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
      };

      const response = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = response.data || response;
      const authToken =
        data.token ||
        data.accessToken ||
        response.token ||
        response.accessToken;

      if (authToken) {
        localStorage.setItem("quickline_token", authToken);
        localStorage.setItem(
          "quickline_user",
          JSON.stringify(data.user || response.user || {})
        );

        router.push("/dashboard");
        return;
      }

      setNotice(
        response.message ||
          "Registration request completed. Please log in with your new credentials."
      );
      setMode("login");
      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
    } catch (err) {
      setError(err.message || "Unable to complete your request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <aside className="auth-side">
        <Brand />

        <div className="auth-promo">
          <span className="eyebrow">WELCOME TO QUICKLINE HOMES</span>

          <h1>
            Your property.
            <br />
            <em>Our priority.</em>
          </h1>

          <p>
            Property discovery, tenant care, payments and maintenance
            in one organized workspace.
          </p>

          <div className="auth-benefits">
            <span>✓ Easier property management</span>
            <span>✓ Clear rent payment details</span>
            <span>✓ One place to stay organized</span>
          </div>
        </div>

        <small>Your Property. Our Priority. Your Peace of Mind.</small>
      </aside>

      <section className="auth-content">
        <Link className="back-home" href="/">
          ← Back to Home
        </Link>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">QUICKLINE HOMES</span>

            <h2>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p>
              {mode === "login"
                ? "Sign in to continue to your workspace."
                : "Join Quickline Homes as a tenant or landlord."}
            </p>
          </div>

          <div className="auth-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Log in
            </button>

            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="form-message error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="form-message success" role="status">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <label className="form-label">I am registering as</label>

                <div className="role-switch">
                  <button
                    type="button"
                    className={form.role === "tenant" ? "selected" : ""}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        role: "tenant",
                      }))
                    }
                  >
                    I am a tenant
                  </button>

                  <button
                    type="button"
                    className={form.role === "landlord" ? "selected" : ""}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        role: "landlord",
                      }))
                    }
                  >
                    I am a landlord
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="firstName">First name *</label>
                    <input
                      id="firstName"
                      name="firstName"
                      value={form.firstName}
                      onChange={updateField}
                      autoComplete="given-name"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="lastName">Last name *</label>
                    <input
                      id="lastName"
                      name="lastName"
                      value={form.lastName}
                      onChange={updateField}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-field">
              <label htmlFor="email">Email address *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            {mode === "register" && (
              <div className="form-field">
                <label htmlFor="phone">Phone number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                  autoComplete="tel"
                  placeholder="e.g. 0712345678"
                  required
                />
              </div>
            )}

            {mode === "register" && form.role === "tenant" && (
              <>
                <div className="form-field">
                  <label htmlFor="houseName">House/property name *</label>
                  <input
                    id="houseName"
                    name="houseName"
                    value={form.houseName}
                    onChange={updateField}
                    placeholder="e.g. Sunrise Apartments"
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="houseNumber">House/unit number *</label>
                    <input
                      id="houseNumber"
                      name="houseNumber"
                      value={form.houseNumber}
                      onChange={updateField}
                      placeholder="e.g. Block A, Room 12"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="landlordReference">
                      Landlord reference
                    </label>
                    <input
                      id="landlordReference"
                      name="landlordReference"
                      value={form.landlordReference}
                      onChange={updateField}
                      placeholder="If provided"
                    />
                  </div>
                </div>

                <p className="field-help">
                  Enter your actual house details so your landlord can
                  identify your tenancy. Your landlord may need to confirm
                  your unit before your account is linked.
                </p>
              </>
            )}

            {mode === "register" && form.role === "landlord" && (
              <div className="landlord-fields">
                <h3>Where should tenants pay you?</h3>
                <p>
                  You can add payment account details now or configure them
                  later in your landlord workspace.
                </p>

                <div className="form-field">
                  <label htmlFor="accountType">Payment method</label>
                  <select
                    id="accountType"
                    name="accountType"
                    value={form.accountType}
                    onChange={updateField}
                  >
                    <option value="paybill">Paybill</option>
                    <option value="till">Till (Buy Goods)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="businessNumber">
                    {form.accountType === "paybill"
                      ? "Paybill business number"
                      : "Till number"}
                  </label>
                  <input
                    id="businessNumber"
                    name="businessNumber"
                    value={form.businessNumber}
                    onChange={updateField}
                    placeholder="Enter business number"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="accountNumber">
                    Account number / house reference
                  </label>
                  <input
                    id="accountNumber"
                    name="accountNumber"
                    value={form.accountNumber}
                    onChange={updateField}
                    placeholder="Optional account reference"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="accountName">Account name</label>
                  <input
                    id="accountName"
                    name="accountName"
                    value={form.accountName}
                    onChange={updateField}
                    placeholder="e.g. Sunrise Rentals"
                  />
                </div>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "register" ? 8 : undefined}
                required
              />
              {mode === "register" && (
                <small className="field-help">
                  Use at least 8 characters.
                </small>
              )}
            </div>

            {mode === "register" && (
              <div className="form-field">
                <label htmlFor="confirmPassword">
                  Confirm password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            )}

            <button
              className="btn auth-submit"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          <p className="auth-bottom">
            {mode === "login" ? "New to Quickline Homes?" : "Already registered?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() =>
                changeMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
