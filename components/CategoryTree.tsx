import type { CategoryNode } from "@/lib/types";

type CategoryTreeProps = {
  categories: CategoryNode[];
  selectedSlug?: string | null;
  onSelectCategory: (node: CategoryNode) => void;
};

const INDENT_PX = 14;

function CategoryTreeNode({
  node,
  level,
  selectedSlug,
  onSelectCategory,
}: {
  node: CategoryNode;
  level: number;
  selectedSlug?: string | null;
  onSelectCategory: (node: CategoryNode) => void;
}) {
  const isRoot = level === 0;
  const isActive = selectedSlug === node.slug;
  return (
    <div className={isRoot ? "rounded-xl border border-white/10 bg-white/[0.035] p-3" : ""}>
      <button
        type="button"
        onClick={() => onSelectCategory(node)}
        className={
          isRoot
            ? `inline-flex text-sm font-semibold tracking-tight transition sm:text-base ${
                isActive ? "text-pink-300" : "text-zinc-100 hover:text-pink-200"
              }`
            : `flex items-start gap-2 rounded-md px-2 py-1 text-[11px] transition duration-200 ${
                isActive
                  ? "bg-pink-500/10 text-pink-200"
                  : "text-zinc-200/90 hover:bg-white/5 hover:text-zinc-100"
              }`
        }
        style={{ marginLeft: level * INDENT_PX }}
      >
        {isRoot ? null : <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40" />}
        <span className="leading-snug">{node.name}</span>
      </button>
      {node.children.length > 0 ? (
        <div className={isRoot ? "mt-3 space-y-1.5 border-t border-white/10 pt-3" : "mt-1.5 space-y-1.5"}>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedSlug={selectedSlug}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CategoryTree({ categories, selectedSlug, onSelectCategory }: CategoryTreeProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((node) => (
        <CategoryTreeNode
          key={node.id}
          node={node}
          level={0}
          selectedSlug={selectedSlug}
          onSelectCategory={onSelectCategory}
        />
      ))}
    </div>
  );
}
