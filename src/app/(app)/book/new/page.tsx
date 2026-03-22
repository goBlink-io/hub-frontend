"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createStarterTemplate } from "@/lib/book/starter-template";

const themePresets = [
  { id: "midnight", name: "Midnight", colors: { primary: "#2563eb", secondary: "#7c3aed", bg: "#09090b" } },
  { id: "ocean", name: "Ocean", colors: { primary: "#0891b2", secondary: "#06b6d4", bg: "#0c1222" } },
  { id: "forest", name: "Forest", colors: { primary: "#16a34a", secondary: "#22c55e", bg: "#0a0f0d" } },
  { id: "sunset", name: "Sunset", colors: { primary: "#f97316", secondary: "#ef4444", bg: "#0c0a09" } },
  { id: "lavender", name: "Lavender", colors: { primary: "#8b5cf6", secondary: "#a78bfa", bg: "#0f0b1e" } },
  { id: "arctic", name: "Arctic", colors: { primary: "#3b82f6", secondary: "#60a5fa", bg: "#ffffff" } },
];

const spaceSchema = z.object({
  name: z.string().min(1, "Site name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
});

type SpaceForm = z.infer<typeof spaceSchema>;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63);
}

function pageSlugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "introduction";
}

export default function NewSpacePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState("midnight");
  const [firstPageTitle, setFirstPageTitle] = useState("Introduction");
  const [creating, setCreating] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdSpaceId, setCreatedSpaceId] = useState("");
  const [createdPageId, setCreatedPageId] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<SpaceForm>({
    resolver: zodResolver(spaceSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    const currentSlug = watch("slug");
    if (!currentSlug || currentSlug === slugify(nameValue)) {
      setValue("slug", slugify(name));
    }
  };

  const goToStep2 = async () => {
    const valid = await trigger(["name", "slug"]);
    if (valid) setStep(2);
  };

  const createSpace = async (data: SpaceForm) => {
    setCreating(true);
    setServerError("");

    try {
      const res = await fetch("/api/book/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          theme: { preset: selectedTheme },
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(body.error || "Failed to create space");
        setCreating(false);
        return;
      }

      const { id: spaceId } = await res.json();

      const pageTitle = firstPageTitle.trim() || "Introduction";
      const pageRes = await fetch(`/api/book/spaces/${spaceId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageTitle,
          slug: pageSlugify(pageTitle),
          content: createStarterTemplate(data.name),
        }),
      });

      if (!pageRes.ok) {
        setCreatedSpaceId(spaceId);
        setCreatedPageId("");
        setStep(4);
        setCreating(false);
        return;
      }

      const { id: pageId } = await pageRes.json();
      setCreatedSpaceId(spaceId);
      setCreatedPageId(pageId);
      setStep(4);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/book"
        className="mb-8 inline-flex items-center gap-2 text-sm transition"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center text-sm font-medium transition-all"
              style={{
                borderRadius: "var(--radius-full)",
                backgroundColor: s < step ? "var(--color-primary)" : "var(--color-bg-secondary)",
                color: s <= step ? "white" : "var(--color-text-tertiary)",
                border: s === step ? "2px solid var(--color-primary)" : "none",
              }}
            >
              {s < step ? <Check size={16} /> : s}
            </div>
            {s < 4 && (
              <div
                className="h-0.5 w-10 transition-colors"
                style={{ backgroundColor: s < step ? "var(--color-primary)" : "var(--color-border)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Name & Slug */}
      {step === 1 && (
        <div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Name your site
          </h1>
          <p className="mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Choose a name and URL for your documentation site.
          </p>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Site name
              </label>
              <input
                {...register("name")}
                onChange={handleNameChange}
                className="w-full px-4 py-3 text-lg outline-none transition"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="My Awesome Docs"
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-sm" style={{ color: "var(--color-error)" }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                URL slug
              </label>
              <div className="flex items-center">
                <input
                  {...register("slug")}
                  className="flex-1 px-4 py-3 outline-none transition"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg) 0 0 var(--radius-lg)",
                    color: "var(--color-text-primary)",
                  }}
                  placeholder="my-awesome-docs"
                />
                <div
                  className="whitespace-nowrap px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-border)",
                    borderLeft: "none",
                    borderRadius: "0 var(--radius-lg) var(--radius-lg) 0",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  .blinkbook.goblink.io
                </div>
              </div>
              {errors.slug && (
                <p className="mt-1 text-sm" style={{ color: "var(--color-error)" }}>
                  {errors.slug.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Description <span style={{ color: "var(--color-text-tertiary)" }}>(optional)</span>
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full resize-none px-4 py-3 outline-none transition"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="What is this documentation about?"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={goToStep2}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition"
                style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Theme */}
      {step === 2 && (
        <div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Choose a theme
          </h1>
          <p className="mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Pick a color scheme for your docs site. You can change this later.
          </p>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themePresets.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className="relative p-4 text-left transition"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: `1px solid ${selectedTheme === theme.id ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-xl)",
                  boxShadow: selectedTheme === theme.id ? "0 0 0 2px rgba(37,99,235,0.2)" : "none",
                }}
              >
                <p className="mb-3 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {theme.name}
                </p>
                <div className="flex gap-1.5">
                  {Object.values(theme.colors).map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6"
                      style={{
                        backgroundColor: color,
                        borderRadius: "var(--radius-full)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                  ))}
                </div>
                {selectedTheme === theme.id && (
                  <div
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 transition"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition"
              style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: First Page */}
      {step === 3 && (
        <div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Create your first page
          </h1>
          <p className="mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Every great docs site starts with a first page.
          </p>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Page title
              </label>
              <input
                type="text"
                value={firstPageTitle}
                onChange={(e) => setFirstPageTitle(e.target.value)}
                className="w-full px-4 py-3 text-lg outline-none transition"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="Introduction"
                autoFocus
              />
            </div>
          </div>

          {serverError && (
            <div
              className="mt-6 px-4 py-3 text-sm"
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-error)",
              }}
            >
              {serverError}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2.5 transition"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleSubmit(createSpace)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
            >
              {creating && <Loader2 size={16} className="animate-spin" />}
              Create Space
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="py-8 text-center">
          <div
            className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center"
            style={{
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(34,197,94,0.1)",
              border: "2px solid var(--color-success)",
            }}
          >
            <Check size={36} style={{ color: "var(--color-success)" }} />
          </div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Your docs site is ready!
          </h1>
          <p className="mx-auto mb-8 max-w-md" style={{ color: "var(--color-text-secondary)" }}>
            Your space has been created with your first page. Start writing content or preview your site.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (createdPageId) {
                  router.push(`/book/${createdSpaceId}/editor/${createdPageId}`);
                } else {
                  router.push(`/book/${createdSpaceId}`);
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white transition"
              style={{ backgroundColor: "var(--color-primary)", borderRadius: "var(--radius-lg)" }}
            >
              Start Writing
              <ArrowRight size={16} />
            </button>
            <Link
              href={`/sites/${slugValue}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-text-primary)",
              }}
            >
              View Site
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
