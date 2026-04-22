"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

type InviteStatus = "loading" | "accepting" | "accepted" | "error";

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function acceptInvite() {
      try {
        const res = await fetch(`/api/book/invitations/${token}`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setStatus("accepted");
          setTimeout(() => router.push(`/book/${data.space_id}`), 2000);
        } else {
          const err = await res.json();
          setError(err.error || "Invalid or expired invitation");
          setStatus("error");
        }
      } catch {
        setError("Something went wrong");
        setStatus("error");
      }
    }
    acceptInvite();
  }, [token, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="w-full max-w-md p-8 text-center"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-2xl)",
        }}
      >
        {status === "loading" || status === "accepting" ? (
          <>
            <Loader2 size={40} className="mx-auto mb-4 animate-spin" style={{ color: "var(--color-primary)" }} />
            <p style={{ color: "var(--color-text-secondary)" }}>Accepting invitation...</p>
          </>
        ) : status === "accepted" ? (
          <>
            <CheckCircle size={40} className="mx-auto mb-4" style={{ color: "var(--color-success)" }} />
            <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Invitation Accepted
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }}>Redirecting to site...</p>
          </>
        ) : (
          <>
            <XCircle size={40} className="mx-auto mb-4" style={{ color: "var(--color-error)" }} />
            <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Invalid Invitation
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }}>{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
