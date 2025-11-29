"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("You are not logged in");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(
          "http://localhost:8600/api/v1/product-feed?page=1&size=10",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const text = await res.text();
        let body;

        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }

        if (!res.ok) {
          setError(`API error ${res.status}: ${JSON.stringify(body)}`);
          return;
        }

        setData(body);
      } catch (err: any) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Loading…</h1>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "red" }}>Error</h1>
        <pre>{error}</pre>
      </main>
    );
  }

  const body = data;

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Product Feed
      </h1>

      <p
        style={{
          textAlign: "center",
          marginBottom: 40,
          opacity: 0.7,
        }}
      >
        Page: {body.page}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 24,
        }}
      >
        {body.items.map((item: any) => (
          <div
            key={item.id}
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 180,
                  background: "#eee",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
            )}

            <h2
              style={{
                fontSize: 20,
                marginBottom: 8,
                fontWeight: 600,
                color: "#FF0000",
              }}
            >
              {item.name}
            </h2>

            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                marginBottom: 12,
                color: "#FF0000",
              }}
            >
              {item.priceSubunits} {item.currency}
            </div>

            <a
              href="#"
              style={{
                marginTop: "auto",
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                borderRadius: 8,
                textAlign: "center",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.2s",
                display: "block",
              }}
            >
              View product
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
