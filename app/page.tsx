type Person = {
  name: string;
  entered_at: string;
};

const API_URL = "https://widc-api.20age1million.com/get-people";

async function fetchPeople(): Promise<Person[]> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as Person[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function Home() {
  const people = await fetchPeople();
  const updatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f2e9ff_0%,_#fdf6e9_35%,_#f6f8ff_70%,_#ffffff_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-black">Who Is In DC</h1>
          <p className="text-sm text-black/60">Updated {updatedAt}</p>
        </header>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="grid gap-4">
            {people.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-center text-black/60">
                No one is currently marked as inside.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                <div className="grid grid-cols-2 border-b border-black/10 bg-black/5 px-5 py-3 text-sm font-semibold text-black/70">
                  <span>Name</span>
                  <span>Entered</span>
                </div>
                <div className="divide-y divide-black/5">
                  {people.map((person) => (
                    <div
                      key={`${person.name}-${person.entered_at}`}
                      className="grid grid-cols-2 px-5 py-4 text-base text-black"
                    >
                      <span>{person.name}</span>
                      <span className="text-black/60">
                        {formatTime(person.entered_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
