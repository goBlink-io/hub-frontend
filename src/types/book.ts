/* ─────────────────────────────────────────────────────────
   BlinkBook Types — ported from blinkbook/src/types/database.ts
   All table prefixes remain bb_ for compatibility.
   ───────────────────────────────────────────────────────── */

export interface TiptapDoc {
  type: "doc";
  content: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface SpaceTheme {
  preset?: string;
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  border?: string;
}

export interface BBSpace {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  theme: SpaceTheme;
  logo_url: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_verified_at: string | null;
  is_published: boolean;
  brand_logo_url: string | null;
  brand_primary_color: string;
  brand_accent_color: string;
  brand_font: string;
  brand_hide_powered_by: boolean;
  review_reminder_enabled: boolean;
  review_reminder_days: number;
  llms_txt_enabled: boolean;
  is_gated: boolean;
  monetization_enabled: boolean;
  payout_wallet: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  favicon_url: string | null;
  social_twitter: string | null;
  created_at: string;
  updated_at: string;
}

export interface BBPage {
  id: string;
  space_id: string;
  title: string;
  slug: string;
  content: TiptapDoc;
  parent_id: string | null;
  position: number;
  is_published: boolean;
  is_gated: boolean;
  is_premium: boolean;
  last_reviewed_at: string | null;
  review_exempt: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  noindex: boolean;
  created_at: string;
  updated_at: string;
}

export interface BBSubscription {
  id: string;
  user_id: string;
  plan: "free" | "pro" | "team";
  status: "active" | "canceled" | "past_due" | "trialing";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  goblink_payment_id: string | null;
  payment_method: "stripe" | "crypto" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface BBTeamMember {
  id: string;
  space_id: string;
  user_id: string | null;
  email: string | null;
  role: "admin" | "editor" | "viewer";
  status: "pending" | "accepted";
  invite_token: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface BBFeedback {
  id: string;
  space_id: string;
  page_id: string;
  helpful: boolean;
  comment: string | null;
  user_fingerprint: string | null;
  created_at: string;
}

export interface BBVersion {
  id: string;
  space_id: string;
  label: string;
  is_current: boolean;
  created_at: string;
}

export interface BBVersionPage {
  id: string;
  version_id: string;
  page_id: string | null;
  title: string;
  slug: string;
  content: TiptapDoc;
  parent_id: string | null;
  position: number;
  created_at: string;
}

export interface BBPageFeedbackSummary {
  page_id: string;
  helpful_count: number;
  not_helpful_count: number;
  total: number;
  helpful_pct: number;
}

export interface BBAccessRule {
  id: string;
  space_id: string;
  page_id: string | null;
  chain: string;
  contract_address: string;
  token_type: string;
  min_amount: number;
  token_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BBPaidContent {
  id: string;
  space_id: string;
  page_id: string | null;
  price_usd: number;
  accepted_tokens: string[];
  is_active: boolean;
  created_at: string;
}

export interface BBPurchase {
  id: string;
  paid_content_id: string;
  buyer_wallet: string;
  buyer_chain: string;
  tx_hash: string;
  amount_usd: number;
  created_at: string;
}

export interface BBBrokenLink {
  id: string;
  space_id: string;
  page_id: string;
  url: string;
  link_text: string | null;
  status_code: number | null;
  error: string | null;
  last_checked_at: string;
  is_broken: boolean;
}

export interface BBReviewLog {
  id: string;
  page_id: string;
  space_id: string;
  sent_at: string;
  sent_to: string;
}
