"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CodePage() {
    const params = useSearchParams();
    const email = params.get("email") ?? "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_BUZZCUT_SEASON_API;
            const res = await fetch(`${API_URL}/accounts/authenticate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });

            const raw = await res.text();
            let json: any = null;

            try {
                json = JSON.parse(raw);
            } catch {
                setError(raw);
                return;
            }

            if (!res.ok) {
                setError(JSON.stringify(json, null, 2));
                return;
            }

            localStorage.setItem("accessToken", json.accessToken);

            window.location.href = "/";
        } catch (err: any) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={container}>
            <h1 style={title}>Enter code</h1>
            <p style={subtitle}>
                Code was sent to <b>{email}</b>
            </p>

            <form onSubmit={submit} style={form}>
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => {
                        const v = e.target.value.replace(/\D+/g, "");
                        setCode(v);
                    }}
                    autoFocus
                    style={codeInput}
                />

                <button style={button} disabled={loading || code.length !== 6}>
                    {loading ? "Checking..." : "Confirm"}
                </button>
            </form>

            {error && <pre style={errorStyle}>{error}</pre>}
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
    marginBottom: 10,
    textAlign: "center",
    color: "#c00"
} as const;

const subtitle = {
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
} as const;

const form = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
} as const;

const codeInput = {
    padding: 14,
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 20,
    letterSpacing: "4px",
    textAlign: "center" as const,
    color: "#c00"
} as const;

const button = {
    padding: "14px 16px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
} as const;

const errorStyle = {
    marginTop: 20,
    color: "#c00",
    fontWeight: 600,
    whiteSpace: "pre-wrap",
} as const;
