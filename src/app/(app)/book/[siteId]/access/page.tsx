import type { Metadata } from "next";
import { AccessRulesClient } from "./client";

export const metadata: Metadata = { title: "BlinkBook — Access" };

export default async function AccessPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return <AccessRulesClient siteId={siteId} />;
}
