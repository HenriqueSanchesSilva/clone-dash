const PRIVATE_KEY = "cb442e17769a4d07d6953090";

export interface AuthParams {
  workspace_id: string;
  user_id: string;
  timestamp: string;
  signature: string;
}

/**
 * Pega os parâmetros de autenticação da URL
 */
export function getAuthParams(): AuthParams | null {
  const params = new URLSearchParams(window.location.search);

  const workspace_id = params.get("workspace_id");
  const user_id = params.get("user_id");
  const timestamp = params.get("timestamp");
  const signature = params.get("signature");

  if (!workspace_id || !user_id || !timestamp || !signature) {
    return null;
  }

  return { workspace_id, user_id, timestamp, signature };
}

/**
 * Valida a assinatura HMAC-SHA256
 */
export async function validateSignature(params: AuthParams): Promise<{ isValid: boolean; expectedSignature: string }> {
  const data = JSON.stringify({
    workspace_id: params.workspace_id,
    user_id: params.user_id,
    timestamp: params.timestamp,
  });

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(PRIVATE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data),
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { 
    isValid: params.signature === expectedSignature,
    expectedSignature 
  };
}

/**
 * Hook simples para autenticação
 */
export async function authenticate(): Promise<{
  isValid: boolean;
  userId: string | null;
  workspaceId: string | null;
  expectedSignature: string | null;
}> {
  const params = getAuthParams();

  if (!params) {
    return { isValid: false, userId: null, workspaceId: null, expectedSignature: null };
  }

  const { isValid, expectedSignature } = await validateSignature(params);

  return {
    isValid,
    userId: isValid ? params.user_id : null,
    workspaceId: isValid ? params.workspace_id : null,
    expectedSignature,
  };
}
