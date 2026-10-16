
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import LandlordPropertyPost from "../../components/LandlordPropertyPost";
import PaymentHistory from "../../components/PaymentHistory";

export default function Payments() {
  const [activeTab, setActiveTab] = useState("rent");
  const [userRole, setUserRole] = useState("");
  const [reference, setReference] = useState("");
  const [charge, setCharge] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("quickline_user") || "{}");
      setUserRole(user.role || "");
    } catch {
      setError("Saved account information is invalid. Please log in again.");
    }
  }, []);

  // Find the charge associated with the landlord's reference.
  async function findCharge(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCharge(null);

    if (!reference.trim()) {
      setError("Enter your rent or charge reference number.");
      return;
    }

    if (!localStorage.getItem("quickline_token")) {
      setError("Please log in before looking up your rent or charge.");
      return;
    }

    setLookupBusy(true);

    try {
      /*
       * This endpoint must exist in the backend.
       * If your backend uses another route, update this path to match it.
       */
      const response = await api(
        `/charge/reference/${encodeURIComponent(reference.trim())}`
      );

      const data = response.data || response;
      const foundCharge = data.charge || data.item || data;

      if (!foundCharge || foundCharge.id == null) {
        throw new Error("No charge was returned for this reference.");
      }

      setCharge(foundCharge);

      const balance =
        foundCharge.balance ??
        foundCharge.amount_due ??
        (Number(foundCharge.amount || 0) -
          Number(foundCharge.amount_paid || 0));

      setAmount(String(Math.max(0, Number(balance) || 0)));
      setNotice("Charge found. Confirm the amount before paying.");
    } catch (err) {
      setError(
        err.message ||
          "Unable to find this reference. Check the reference and try again."
      );
    } finally {
      setLookupBusy(false);
    }
  }

  // Request an M-Pesa STK Push for a charge.
  async function sendMpesaPrompt(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!charge || charge.id == null) {
      setError("Find a valid rent or charge reference first.");
      return;
    }

    if (!localStorage.getItem("quickline_token")) {
      setError("Please log in before initiating a payment.");
      return;
    }

    const numericAmount = Number(amount);
    const normalizedPhone = phoneNumber.trim().replace(/[\s-]/g, "");

    if (!/^(\+?254|0)[17]\d{8}$/.test(normalizedPhone)) {
      setError(
        "Enter a valid Kenyan mobile number, for example 0712345678 or 254712345678."
      );
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid payment amount greater than zero.");
      return;
    }

    setBusy(true);

    try {
      const response = await api("/mpesa/stkpush", {
        method: "POST",
        body: JSON.stringify({
          chargeId: Number(charge.id),
          phoneNumber: normalizedPhone,
          amount: numericAmount,
        }),
      });

      setNotice(
        response.message ||
          "Your payment request was submitted. Check your phone for an M-Pesa prompt."
      );
    } catch (err) {
      setError(err.message || "Unable to initiate the M-Pesa payment.");
    } finally {
      setBusy(false);
    }
  }

  const money = (value) =>
    Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <main className="payment-page">
      <header className="payment-hero">
        <div>
          <span className="payment-eyebrow">QUICKLINE HOMES / FINANCE</span>
          <h1>Pay rent</h1>
          <p>
            Pay with an M-Pesa prompt on your phone, or pay your landlord's
            Paybill or Till.
          </p>
        </div>
      </header>

      <nav className="payment-nav" aria-label="Main navigation">
        <Link href="/" className="payment-brand">
          <span className="payment-logo">QH</span>
          <span>
            <strong>Quickline</strong>
            <small>Homes</small>
          </span>
        </Link>

        <div className="payment-nav-links">
          <Link href="/">Home</Link>
          <Link href="/marketplace">Properties</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Log in</Link>
        </div>
      </nav>

      <section className="payment-main">
        <div className="payment-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "rent"}
            className={activeTab === "rent" ? "active" : ""}
            onClick={() => {
              setActiveTab("rent");
              setError("");
              setNotice("");
            }}
          >
            My rent or charge
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "quickline"}
            className={activeTab === "quickline" ? "active" : ""}
            onClick={() => {
              setActiveTab("quickline");
              setError("");
              setNotice("");
            }}
          >
            Pay Quickline Homes
          </button>

          {userRole === "landlord" && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "property"}
              className={activeTab === "property" ? "active" : ""}
              onClick={() => {
                setActiveTab("property");
                setError("");
                setNotice("");
              }}
            >
              Post a property
            </button>
          )}

          {["landlord", "tenant", "admin"].includes(userRole) && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              className={activeTab === "history" ? "active" : ""}
              onClick={() => {
                setActiveTab("history");
                setError("");
                setNotice("");
              }}
            >
              Payment history
            </button>
          )}
        </div>

        {error && (
          <div className="payment-alert error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="payment-alert success" role="status">
            {notice}
          </div>
        )}

        {activeTab === "rent" ? (
          <>
            <section className="payment-card reference-card">
              <h2>Find your rent or charge</h2>
              <p>
                Enter the reference number supplied by your landlord to
                retrieve the charge details.
              </p>

              <form onSubmit={findCharge}>
                <label htmlFor="reference">Reference number</label>

                <div className="reference-search">
                  <input
                    id="reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="e.g. RENT-001"
                    autoComplete="off"
                    required
                  />

                  <button
                    type="submit"
                    className="payment-button find-button"
                    disabled={lookupBusy}
                  >
                    {lookupBusy ? "Finding..." : "Find"}
                  </button>
                </div>
              </form>
            </section>

            {charge && (
              <section className="payment-card charge-summary">
                <h2>Charge details</h2>

                <dl>
                  <div>
                    <dt>Reference</dt>
                    <dd>{charge.reference_number || reference}</dd>
                  </div>

                  <div>
                    <dt>Description</dt>
                    <dd>{charge.description || "Rent or property charge"}</dd>
                  </div>

                  <div>
                    <dt>Amount due</dt>
                    <dd>
                      KSh{" "}
                      {money(
                        charge.balance ??
                          charge.amount_due ??
                          Number(charge.amount || 0) -
                            Number(charge.amount_paid || 0)
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Status</dt>
                    <dd>{charge.status || "Pending confirmation"}</dd>
                  </div>
                </dl>
              </section>
            )}

            <div className="payment-method-grid">
              <section className="payment-card">
                <span className="method-number">OPTION 1</span>
                <h2>M-Pesa prompt</h2>
                <p>
                  We will request a payment on your phone. Approve the
                  transaction using your M-Pesa PIN.
                </p>

                <form onSubmit={sendMpesaPrompt}>
                  <div className="payment-field">
                    <label htmlFor="phoneNumber">M-Pesa phone number</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) =>
                        setPhoneNumber(event.target.value)
                      }
                      placeholder="0712345678"
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div className="payment-field">
                    <label htmlFor="amount">Amount (KSh)</label>
                    <input
                      id="amount"
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="Enter amount"
                      required
                    />
                  </div>

                  <div className="payment-tip">
                    Only approve an M-Pesa prompt that you initiated and
                    whose amount you have verified.
                  </div>

                  <button
                    type="submit"
                    className="payment-button full-button"
                    disabled={busy || !charge}
                  >
                    {busy ? "Sending request..." : "Send M-Pesa prompt"}
                  </button>

                  {!charge && (
                    <small className="payment-hint">
                      Find your rent or charge reference first.
                    </small>
                  )}
                </form>
              </section>

              <section className="payment-card direct-payment">
                <span className="method-number">OPTION 2</span>
                <h2>Pay your landlord directly</h2>
                <p>
                  Use your landlord's confirmed payment details. The
                  landlord should provide the correct Paybill or Till number.
                </p>

                <h3>Pay by Paybill</h3>
                <ol>
                  <li>Open M-Pesa on your phone.</li>
                  <li>Choose Lipa na M-Pesa.</li>
                  <li>Select Paybill.</li>
                  <li>Enter your landlord's business number.</li>
                  <li>Enter the account or house reference supplied by your landlord.</li>
                  <li>Enter the amount and confirm the displayed details.</li>
                </ol>

                <h3>Pay by Till (Buy Goods)</h3>
                <ol>
                  <li>Open M-Pesa on your phone.</li>
                  <li>Choose Lipa na M-Pesa.</li>
                  <li>Select Buy Goods and Services.</li>
                  <li>Enter your landlord's Till number.</li>
                  <li>Enter the amount and confirm the transaction.</li>
                </ol>

                <div className="payment-tip">
                  Do not use a sample or unverified business number. Keep
                  your M-Pesa confirmation message as proof of payment.
                </div>
              </section>
            </div>
          </>
        ) : activeTab === "quickline" ? (
          <section className="payment-card quickline-payment">
            <h2>Pay Quickline Homes</h2>
            <p>
              Use this section only for a verified fee or charge payable
              directly to Quickline Homes.
            </p>

            <p>
              <strong>Before paying:</strong> obtain the official business
              number, amount and account reference from Quickline Homes.
              Do not assume your landlord's payment details belong to
              Quickline Homes.
            </p>

            <Link href="/login" className="payment-button">
              Log in to view your account
            </Link>
          </section>
        ) : activeTab === "property" && userRole === "landlord" ? (
          <LandlordPropertyPost />
        ) : activeTab === "history" && ["landlord", "tenant", "admin"].includes(userRole) ? (
          <PaymentHistory />
        ) : (
          <section className="payment-card quickline-payment">
            <h2>Sign in to continue</h2>
            <p>Log in with your Quickline Homes account to access this section.</p>
            <Link href="/login" className="payment-button">Log in</Link>
          </section>
        )}
      </section>

      <div className="payment-slogan">
        Your Property. Our Priority. Your Peace of Mind.
      </div>

      <footer className="payment-footer">
        <div className="payment-footer-main">
          <div>
            <Link href="/" className="payment-footer-brand">
              <span className="payment-logo">QH</span>
              <span>
                <strong>Quickline Homes</strong>
                <small>Your Property. Your Peace of Mind.</small>
              </span>
            </Link>
            <p>Property management made more organized.</p>
          </div>


          <div>
            <h3>Account</h3>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/landlord">Landlord portal</Link>
            <Link href="/maintenance">Maintenance</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>

        <div className="payment-copyright">
          © {new Date().getFullYear()} Quickline Homes. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
