export default async function HomePage() {
  const url = `http://localhost:8600/api/v1/product-feed?page=1&size=10`;

  let response: Response | null = null;
  let error: any = null;
  let body: any = null;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJVU0VSIl0sInN1YiI6InN0ZXA2MTk5QGdtYWlsLmNvbSIsImlhdCI6MTc2NDQ0MTM3NiwiZXhwIjoxNzY0NDk4OTc2fQ.GQWY03LnGk2330ifq-YJWmcQldVlQD-usR3OtCgm0po",
      },
    });

    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "#c00" }}>Fetch Error</h1>
        <pre>{String(error)}</pre>
      </main>
    );
  }

  if (response && !response.ok) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "#c00" }}>API Error</h1>
        <p>Status: {response.status}</p>
        <pre>{JSON.stringify(body, null, 2)}</pre>
      </main>
    );
  }

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

      {/* GRID */}
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
                  marginBottom: 12
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

            {/* КНОПКА БЕЗ JS-хендлеров (используем CSS-ховер через inline) */}
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
              onMouseEnter={undefined}
              onMouseLeave={undefined}
            >
              View product
            </a>

            <style>{`
              a:hover {
                background: #333 !important;
              }
            `}</style>
          </div>
        ))}
      </div>
    </main>
  );
}
