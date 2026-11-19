import { ButtonLink } from "@/components/ui/button";

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
        <ButtonLink
          key={p.id}
          href={`${basePath}?property=${p.id}`}
          variant={activeId === p.id ? "primary" : "secondary"}
          size="sm"
          aria-current={activeId === p.id ? "true" : undefined}
        >
          {p.name}
        </ButtonLink>
      ))}
    </nav>
  );
}
