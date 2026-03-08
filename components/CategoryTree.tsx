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
    <div>
      <button
        type="button"
        onClick={() => onSelectCategory(node)}
        className={
          isRoot
            ? `text-sm font-semibold tracking-tight transition ${isActive ? "text-pink-300" : "text-zinc-100"}`
            : `flex items-start gap-2 text-xs transition duration-200 ${
                isActive ? "text-pink-200" : "text-zinc-200/90 hover:text-zinc-100"
              }`
        }
        style={{ marginLeft: level * INDENT_PX }}
      >
        {isRoot ? null : <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40" />}
        <span className="leading-snug">{node.name}</span>
      </button>
      {node.children.length > 0 ? (
        <div className="mt-2 space-y-2">
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
