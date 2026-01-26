import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({ title, backHref, backLabel = "Back" }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <h1 className="text-3xl font-bold">{title}</h1>
    </div>
  );
}
