import Link from "next/link";

export function PropertyPicker({
  properties,
  basePath,
  activeId,
}: {
  properties: { id: string; name: string }[];
  basePath: string;
  activeId?: string;
}) {
  if (properties.length <= 1) return null;
  return (
    <nav aria-label="Select property" className="flex flex-wrap gap-2">
      {properties.map((p) => (
        <Link
          key={p.id}
          href={`${basePath}?property=${p.id}`}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            activeId === p.id
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-300"
          }`}
        >
          {p.name}
        </Link>
      ))}
    </nav>
  );
}
