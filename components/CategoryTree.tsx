import type { CategoryNode } from "@/lib/types";

type CategoryTreeProps = {
  categories: CategoryNode[];
};

const INDENT_PX = 14;

function CategoryTreeNode({ node, level }: { node: CategoryNode; level: number }) {
  const isRoot = level === 0;
  return (
    <div>
      <div
        className={isRoot ? "text-sm font-semibold" : "flex items-start gap-2 text-xs text-zinc-200/90"}
        style={{ marginLeft: level * INDENT_PX }}
      >
        {isRoot ? null : <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/50" />}
        <span>{node.name}</span>
      </div>
      {node.children.length > 0 ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <CategoryTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CategoryTree({ categories }: CategoryTreeProps) {
  return (
    <div className="space-y-2">
      {categories.map((node) => (
        <CategoryTreeNode key={node.id} node={node} level={0} />
      ))}
    </div>
  );
}
