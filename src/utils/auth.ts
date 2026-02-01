export interface AuthParams {
  workspace_id: string;
  user_id: string;
}

/**
 * Pega os parâmetros de autenticação da URL
 */
export function getAuthParams(): AuthParams | null {
  const params = new URLSearchParams(window.location.search);

  const workspace_id = params.get("workspace_id");
  const user_id = params.get("user_id");

  if (!workspace_id || !user_id) {
    return null;
  }

  return { workspace_id, user_id };
}

/**
 * Função simples para obter dados de autenticação
 * Agora aceita apenas workspace_id e user_id
 */
export function authenticate(): {
  isValid: boolean;
  userId: string | null;
  workspaceId: string | null;
} {
  const params = getAuthParams();

  if (!params) {
    return { isValid: false, userId: null, workspaceId: null };
  }

  return {
    isValid: true,
    userId: params.user_id,
    workspaceId: params.workspace_id,
  };
}
