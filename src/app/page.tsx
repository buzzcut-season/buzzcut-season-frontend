import { api } from "@/lib/api/client";

export default async function HomePage() {
  const data = await api.get<{ message: string }>("/ping");

  return (
    <main>
      <h1>Next.js Frontend</h1>
      <p>Backend says: {data.message}</p>
    </main>
  );
}
