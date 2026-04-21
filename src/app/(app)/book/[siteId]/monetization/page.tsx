import type { Metadata } from "next";
import { MonetizationClient } from "./client";

export const metadata: Metadata = { title: "BlinkBook — Monetization" };

export default async function MonetizationPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return <MonetizationClient siteId={siteId} />;
}
