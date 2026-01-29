import type { CategoryNode } from "@/lib/types";

type CategoryTreeProps = {
  categories: CategoryNode[];
};

export function CategoryTree({ categories }: CategoryTreeProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((node, index) => (
        <div
          key={node.id}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-violet-300/40 hover:shadow-[0_18px_36px_rgba(124,58,237,0.18)]"
          data-active={index === 0}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold tracking-tight text-zinc-100">{node.name}</div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              Catalog
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {node.children.length > 0 ? (
              node.children.map((child) => (
                <span
                  key={child.id}
                  className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-zinc-200/90 transition duration-200 group-hover:border-violet-300/30 group-hover:text-zinc-100"
                >
                  {child.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-400">No subcategories yet</span>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent opacity-0 transition duration-200 group-hover:opacity-100 data-[active=true]:opacity-100" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-400/10 blur-2xl opacity-0 transition duration-200 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
}
