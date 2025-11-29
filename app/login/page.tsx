"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8600/api/v1/accounts/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const raw = await res.text();
      if (!res.ok) {
        setError(`Error ${res.status}: ${raw}`);
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError("Network error: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={container}>
        <h1 style={title}>Check your email</h1>
        <p style={text}>
          We sent a 6-digit code to <b>{email}</b>
        </p>

        <a
          href={`/login/code?email=${encodeURIComponent(email)}`}
          style={linkButton}
        >
          Enter code →
        </a>
      </div>
    );
  }

  return (
    <div style={container}>
      <h1 style={title}>Sign in</h1>

      <form onSubmit={sendCode} style={form}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <button type="submit" disabled={loading} style={button}>
          {loading ? "Sending..." : "Send code"}
        </button>
      </form>

      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

/* Styles */

const container = {
  maxWidth: 380,
  margin: "80px auto",
  padding: 32,
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  fontFamily: "system-ui, sans-serif",
} as const;

const title = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 20,
  textAlign: "center",
  color: "#c00" 
} as const;

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
} as const;

const input = {
  padding: 14,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 16,
  color: "#c00" 
} as const;

const button = {
  padding: "14px 16px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  textAlign: "center",
  cursor: "pointer",
} as const;

const linkButton = {
  ...button,
  display: "block",
  marginTop: 10,
  textDecoration: "none",
} as const;

const text = {
  textAlign: "center",
  marginBottom: 24,
  color: "#555",
} as const;

const errorStyle = {
  marginTop: 20,
  color: "#c00",
  fontWeight: 600,
} as const;
