import { adminSupabase } from "@/lib/server/db";

// NOTE: bcryptjs is a peer dependency for API key validation.
// For Hub internal routes, use Supabase auth instead.
// This module is only needed if the Hub exposes the public merchant API (v1/).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcryptCompare = async (plain: string, hash: string): Promise<boolean> => {
  try {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(plain, hash);
  } catch {
    console.error("[api-auth] bcryptjs not installed — API key validation unavailable");
    return false;
  }
};

const bcryptHash = async (plain: string, rounds: number): Promise<string> => {
  try {
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(plain, rounds);
  } catch {
    throw new Error("bcryptjs not installed — cannot generate API keys");
  }
};

/**
 * Extract the real client IP from request headers.
 */
export function getClientIp(requestIp: string | null | undefined): string | undefined {
  if (!requestIp) return undefined;
  if (!requestIp.includes(",")) return requestIp.trim();
  const parts = requestIp.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1];
}

export interface ApiKeyValidation {
  merchantId: string;
  isTest: boolean;
  keyId: string;
}

export async function validateApiKey(
  authHeader: string | null,
  requestIp?: string | null
): Promise<ApiKeyValidation | { forbidden: true } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith("gb_live_") && !apiKey.startsWith("gb_test_")) {
    return null;
  }

  const prefix = apiKey.slice(0, apiKey.indexOf("_", 3) + 1 + 8);
  const { data: keys, error } = await adminSupabase
    .from("api_keys")
    .select("id, merchant_id, key_hash, is_test, allowed_ips, merchants!inner(suspended_at)")
    .eq("key_prefix", prefix);

  if (error || !keys || keys.length === 0) {
    return null;
  }

  for (const key of keys) {
    const matches = await bcryptCompare(apiKey, key.key_hash);
    if (matches) {
      const merchant = key.merchants as unknown as { suspended_at: string | null };
      if (merchant?.suspended_at) {
        return { forbidden: true };
      }

      const allowedIps: string[] = key.allowed_ips ?? [];
      if (allowedIps.length > 0) {
        const ip = getClientIp(requestIp);
        if (!ip || !allowedIps.includes(ip)) {
          return { forbidden: true };
        }
      }

      await adminSupabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id);

      return {
        merchantId: key.merchant_id,
        isTest: key.is_test,
        keyId: key.id,
      };
    }
  }

  return null;
}

export function isApiForbidden(
  result: ApiKeyValidation | { forbidden: true } | null
): result is { forbidden: true } {
  return result !== null && "forbidden" in result;
}

export async function generateApiKey(
  merchantId: string,
  isTest: boolean,
  label: string = "Default"
): Promise<{ apiKey: string; keyId: string }> {
  const prefix = isTest ? "gb_test_" : "gb_live_";
  const randomPart = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const apiKey = `${prefix}${randomPart}`;

  const keyHash = await bcryptHash(apiKey, 10);
  const keyPrefix = apiKey.slice(0, prefix.length + 8);

  const { data, error } = await adminSupabase
    .from("api_keys")
    .insert({
      merchant_id: merchantId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label,
      is_test: isTest,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return { apiKey, keyId: data.id };
}
