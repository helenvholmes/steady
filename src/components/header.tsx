import Link from "next/link";

export function Header({ title, back, action }: { title: string; back?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {back && (
        <Link href={back} className="-ml-2 px-2 py-2 text-accent" aria-label="Back">
          ‹
        </Link>
      )}
      <h1 className="h1 flex-1">{title}</h1>
      {action}
    </header>
  );
}
