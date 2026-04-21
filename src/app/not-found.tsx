import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ color: "var(--color-text-primary)" }}
    >
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          color: "var(--color-text-secondary)",
        }}
      >
        <Compass size={26} />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Page not found</h1>
      <p
        className="mb-8 max-w-md text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
          }}
        >
          Go home
        </Link>
        <Link
          href="/audit"
          className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Audit a contract
        </Link>
      </div>
    </main>
  );
}
