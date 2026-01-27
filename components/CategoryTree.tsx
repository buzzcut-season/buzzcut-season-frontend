import type { CategoryNode } from "@/lib/types";

type CategoryTreeProps = {
  categories: CategoryNode[];
};

const INDENT_PX = 16;

function CategoryTreeNode({ node, level }: { node: CategoryNode; level: number }) {
  return (
    <div>
      <div className="flex items-start gap-2" style={{ marginLeft: level * INDENT_PX }}>
        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/60" />
        <span className="text-sm">{node.name}</span>
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
