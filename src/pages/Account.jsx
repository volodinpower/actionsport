import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmEmail,
  updateProfile,
  fetchAddresses,
  createAddress,
  updateAddress as apiUpdateAddress,
  deleteAddress as apiDeleteAddress,
} from "../api";
import { useAuth } from "../components/AuthProvider";
import Header from "../components/Header";
import Footer from "../components/Footer";

const DEFAULT_PHONE_PLACEHOLDER = "+374 XX XXX XXX";
function normalizePhone(value = "") {
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^\+/, "")}`;
}

export default function AccountPage() {
  const { user, loading, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", surname: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = params.get("token") || "";
  const [verifyState, setVerifyState] = useState("idle"); // idle | pending | success | error
  const [verifyMessage, setVerifyMessage] = useState("");
  const emptyAddress = useMemo(
    () => ({
      label: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "Armenia",
      is_default: false,
    }),
    [],
  );
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingProfile, setEditingProfile] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sortAddresses = useCallback(
    (list) => [...list].sort((a, b) => Number(b.is_default) - Number(a.is_default) || new Date(a.created_at || 0) - new Date(b.created_at || 0)),
    [],
  );

  useEffect(() => {
    if (user?.is_superuser) {
      navigate("/admin", { replace: true });
    }
  }, [user?.is_superuser, navigate]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        surname: user.surname || "",
        phone: user.phone || "",
      });
      const hasProfile = Boolean((user.name || "").trim() && (user.surname || "").trim() && (user.phone || "").trim());
      setEditingProfile(!hasProfile);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAddresses();
        if (!cancelled) {
          setAddresses(sortAddresses(list));
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sortAddresses]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setVerifyState("pending");
    setVerifyMessage("");
    (async () => {
      try {
        await confirmEmail(token);
        if (cancelled) return;
        setVerifyState("success");
        setVerifyMessage("Email confirmed. Complete your profile to finish registration.");
        await refresh();
      } catch (err) {
        if (cancelled) return;
        setVerifyState("error");
        setVerifyMessage(err?.message || "Failed to verify e-mail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  const isVerified = useMemo(() => Boolean(user?.is_verified), [user]);
  const profileComplete = useMemo(
    () => Boolean((user?.name || "").trim() && (user?.surname || "").trim() && (user?.phone || "").trim()),
    [user],
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfile(form);
      setMessage("Profile saved");
      await refresh();
      if ((form.name || "").trim() && (form.surname || "").trim() && (form.phone || "").trim()) {
        setEditingProfile(false);
      }
    } catch (err) {
      setError(err?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddressSubmit(e) {
    e.preventDefault();
    if (!user) return;
    if (!addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.country.trim()) {
      setAddressError("Please fill in the required address fields");
      return;
    }
    setAddressSaving(true);
    setAddressError("");
    try {
      if (editingAddressId) {
        const updated = await apiUpdateAddress(editingAddressId, addressForm);
        setAddresses((prev) => {
          const replaced = prev.map((addr) => (addr.id === updated.id ? updated : addr));
          const normalized = updated.is_default
            ? replaced.map((addr) => (addr.id === updated.id ? addr : { ...addr, is_default: false }))
            : replaced;
          return sortAddresses(normalized);
        });
      } else {
        const created = await createAddress(addressForm);
        setAddresses((prev) => {
          const normalizedPrev = created.is_default
            ? prev.map((addr) => ({ ...addr, is_default: false }))
            : prev;
          return sortAddresses([...normalizedPrev, created]);
        });
      }
      setAddressForm({ ...emptyAddress });
      setShowAddressForm(false);
      setEditingAddressId(null);
    } catch (err) {
      setAddressError(err?.message || "Could not save address");
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleSetDefault(id) {
    try {
      const updated = await apiUpdateAddress(id, { is_default: true });
      setAddresses((prev) => sortAddresses(prev.map((addr) => (addr.id === updated.id ? updated : { ...addr, is_default: false }))));
      if (editingAddressId === id) {
        setAddressForm((prev) => ({ ...prev, is_default: true }));
      }
    } catch (err) {
      setAddressError(err?.message || "Could not update address");
    }
  }

  async function handleDeleteAddress(id) {
    if (!window.confirm("Delete this address?")) return;
    try {
      await apiDeleteAddress(id);
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
      if (editingAddressId === id) {
        setEditingAddressId(null);
        setAddressForm({ ...emptyAddress });
        setShowAddressForm(false);
      }
    } catch (err) {
      setAddressError(err?.message || "Could not delete address");
    }
  }

  if (loading) {
    return <div className="auth-page"><div className="auth-card">Loading…</div></div>;
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6fb", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 12px 32px rgba(15,30,65,0.08)" }}>
          <h2>Account</h2>
          <p style={{ marginBottom: 16 }}>Sign in to continue.</p>
          <button className="auth-button" onClick={() => navigate("/auth")}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header isHome={false} />
      <main
        style={{
          flex: 1,
          width: "100%",
          padding: "32px 24px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 20,
            padding: "32px 40px 48px",
            boxShadow: "0 16px 45px rgba(21,35,67,0.08)",
          }}
        >
          <h2>Account</h2>
        <p className="auth-subtitle">Email: {user.email}</p>
        {isVerified ? (
          <div style={{ background: "#e8f9ed", color: "#0b874b", padding: "10px 14px", borderRadius: 10, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>✔</span>
            <span>Account verified.</span>
          </div>
        ) : (
          <>
            <div className="auth-error" style={{ background: "#fff6e6", color: "#7a4b00", marginBottom: 12 }}>
              Account is not verified yet. Please request a verification link below.
            {verifyMessage && <div style={{ marginTop: 6 }}>{verifyMessage}</div>}
              {verifyState === "pending" && <div style={{ marginTop: 6 }}>Verifying…</div>}
            </div>
            <div style={{ marginBottom: 36 }}>
              <h3 style={{ marginBottom: 8 }}>Verify your e-mail</h3>
              <p style={{ color: "#666" }}>
                Need a new confirmation link? Request it here.
              </p>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => navigate("/verify/request")}
                  style={{ minWidth: 160 }}
                >
                  Request verification link
                </button>
              </div>
            </div>
          </>
        )}
        {message && <div style={{ color: "#0b874b", marginBottom: 10 }}>{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        {profileComplete && !editingProfile ? (
          <div className="profile-summary">
            <div className="profile-summary-controls">
              <button
                type="button"
                className="address-icon-btn address-icon-btn-edit"
                title="Edit profile"
                onClick={() => {
                  setEditingProfile(true);
                  setForm({
                    name: user.name || "",
                    surname: user.surname || "",
                  phone: user.phone || "",
                });
                }}
              >
                ✎
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "#222" }}>
              <div><strong>First name:</strong> {user.name}</div>
              <div><strong>Last name:</strong> {user.surname}</div>
              <div><strong>Phone:</strong> {user.phone}</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              First name
              <input
                name="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Aram"
                required
              />
            </label>
            <label>
              Last name
              <input
                name="surname"
                value={form.surname}
                onChange={(e) => setForm((prev) => ({ ...prev, surname: e.target.value }))}
                placeholder="e.g. Hakobyan"
                required
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: normalizePhone(e.target.value) }))
                }
                placeholder={DEFAULT_PHONE_PLACEHOLDER}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="auth-button" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              {profileComplete && (
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setEditingProfile(false);
                    setForm({
                      name: user.name || "",
                      surname: user.surname || "",
                      phone: user.phone ? formatArmenianPhone(user.phone) : "",
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <div style={{ marginTop: 30 }}>
          <h3>Shipping addresses</h3>
          {addressError && <div className="auth-error">{addressError}</div>}
          {addresses.length === 0 && <p style={{ color: "#666" }}>You have no saved addresses yet.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="address-card"
                style={{
                  border: "1px solid #e2e2e2",
                  borderRadius: 10,
                  padding: 12,
                  background: addr.is_default ? "#f0f7ff" : "#fff",
                  position: "relative",
                }}
              >
                <div className="address-card-controls">
                  <button
                    type="button"
                    className="address-icon-btn address-icon-btn-edit"
                    title="Edit address"
                    onClick={() => {
                      const { id: _id, created_at, user_id, ...rest } = addr;
                      setAddressForm({
                        label: rest.label || "",
                        line1: rest.line1 || "",
                        line2: rest.line2 || "",
                        city: rest.city || "",
                        region: rest.region || "",
                        postal_code: rest.postal_code || "",
                        country: rest.country || "Armenia",
                        is_default: Boolean(rest.is_default),
                      });
                      setEditingAddressId(addr.id);
                      setShowAddressForm(true);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="address-icon-btn address-icon-btn-delete"
                    title="Delete address"
                    onClick={() => handleDeleteAddress(addr.id)}
                  >
                    ×
                  </button>
                </div>
                <div style={{ fontWeight: 600 }}>
                  {addr.label || "Address"} {addr.is_default && <span style={{ color: "#0b874b", fontSize: 12 }}>default</span>}
                </div>
                <div style={{ fontSize: 14, color: "#333" }}>
                  {addr.country}
                  {addr.city ? `, ${addr.city}` : ""}
                  {addr.region ? `, ${addr.region}` : ""}
                  {addr.postal_code ? `, ${addr.postal_code}` : ""}
                </div>
                <div style={{ fontSize: 14, color: "#333" }}>
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {!addr.is_default && (
                    <button type="button" className="auth-link-button" onClick={() => handleSetDefault(addr.id)}>
                      Make default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            {!showAddressForm && (
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setAddressForm({ ...emptyAddress });
                  setEditingAddressId(null);
                  setShowAddressForm(true);
                }}
              >
                + Add new address
              </button>
            )}
            {showAddressForm && (
              <form onSubmit={handleAddressSubmit} className="auth-form">
                <label>
                  Label (e.g. Home)
                  <input
                    name="label"
                    value={addressForm.label}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                  />
                </label>
                <label>
                  Country *
                  <input
                    name="country"
                    value={addressForm.country}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, country: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  City *
                  <input
                    name="city"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Province / region
                  <input
                    name="region"
                    value={addressForm.region}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, region: e.target.value }))}
                  />
                </label>
                <label>
                  ZIP / Postal code (e.g. 0010)
                  <input
                    name="postal_code"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                  />
                </label>
                <label>
                  Address line 1 *
                  <input
                    name="line1"
                    value={addressForm.line1}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, line1: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Address line 2
                  <input
                    name="line2"
                    value={addressForm.line2}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, line2: e.target.value }))}
                  />
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  />
                  Make default address
                </label>
                <div className="form-actions">
                  <button type="submit" className="auth-button" disabled={addressSaving}>
                    {addressSaving ? "Saving…" : editingAddressId ? "Update address" : "Save address"}
                  </button>
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() => {
                      setShowAddressForm(false);
                      setAddressForm({ ...emptyAddress });
                      setEditingAddressId(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h3 style={{ marginBottom: 8 }}>Favorites</h3>
          <p style={{ color: "#666" }}>
            View and manage your favorite products on the dedicated page.
          </p>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="auth-button"
              onClick={() => navigate("/favorites")}
              style={{ minWidth: 160 }}
            >
              Go to favorites
            </button>
          </div>
        </div>
        <div className="auth-links" style={{ marginTop: 40 }}>
          <button className="auth-switch" onClick={() => setShowLogoutConfirm(true)}>Log out</button>
        </div>
        {showLogoutConfirm && (
          <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
              <h3 style={{ marginBottom: 12 }}>Sign out?</h3>
              <p style={{ color: "#555", marginBottom: 20 }}>Do you really want to log out of your account?</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  className="auth-link-button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ minWidth: 120 }}
                >
                  Cancel
                </button>
                <button
                  className="auth-button"
                  onClick={logout}
                  style={{ minWidth: 120 }}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
