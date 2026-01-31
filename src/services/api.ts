// Em dev usa proxy local, em prod usa URL direta
const API_BASE_URL = "/api";
const WORKSPACE_API_BASE_URL = "/workspace-api"; // chat.talkbi.com.br
const API_TOKEN =
  "7alngqv54T3KuKO7S189VkrkM3xI2nd7uPeUoqITO03gKj96Oo4lJ8NJrOAT";

async function fetchApi<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log("🔗 Chamando API:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  console.log("📡 Response status:", response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error("❌ Erro API:", text);
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Função para chamar APIs de workspace (chat.talkbi.com.br)
async function fetchWorkspaceApi<T>(
  endpoint: string,
  workspaceId: string,
  flowNs?: string,
): Promise<T> {
  const url = `${WORKSPACE_API_BASE_URL}${endpoint}`;
  console.log("🔗 Chamando Workspace API:", url);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    "X-Client-Workspace-Id": workspaceId,
  };

  if (flowNs) {
    headers["X-Client-Flow-Ns"] = flowNs;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  console.log("📡 Workspace API Response status:", response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error("❌ Erro Workspace API:", text);
    throw new Error(`Workspace API Error: ${response.status}`);
  }

  return response.json();
}

// Tipos baseados na documentação real da API
export interface WorkspaceData {
  id: number;
  name: string;
  plan: string;
  bot_user_used: number;
  bot_user_limit: number;
  bot_used: number;
  bot_limit: number;
  member_used: number;
  member_limit: number;
  is_paused: number;
  auto_renew: number;
  billing_start_at: string;
  billing_end_at: string;
  addon_bot: number;
  addon_bot_user: number;
  addon_member: number;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  points: number;
}

export interface WorkspaceResponse {
  data: WorkspaceData;
  status: string;
}

export interface Bot {
  flow_ns: string;
  name: string;
  type: string;
}

export interface BotListResponse {
  data: Bot[];
}

export interface Member {
  id: number;
  name: string;
  email: string;
  image: string;
  role: string;
  is_online: boolean;
}

export interface MemberListResponse {
  data: Member[];
}

export interface OmniChannel {
  channel: string;
  is_linked: boolean;
  linked_name: string;
}

export interface OmniChannelResponse {
  data: OmniChannel[];
  status: string;
}

export interface FacebookChannel {
  id: string;
  page_id: string;
  page_name: string;
  flow_ns: string;
  flow_type: string;
  flow_name: string;
  status: string;
}

export interface InstagramChannel {
  id: string;
  instagram_id: string;
  instagram_name: string;
  instagram_user_name: string;
  flow_ns: string;
  flow_type: string;
  flow_name: string;
  status: string;
}

export interface WhatsAppCloudChannel {
  id: string;
  phone_number: string;
  business_name: string;
  flow_ns: string;
  flow_type: string;
  flow_name: string;
}

export interface TelegramChannel {
  id: string;
  telegram_id: string;
  telegram_name: string;
  flow_ns: string;
  flow_type: string;
  flow_name: string;
  status: string;
}

export interface ChannelResponse<T> {
  data: T[];
}

// API Functions
export async function getWorkspaceDetails(
  workspaceId: string,
): Promise<WorkspaceResponse> {
  return fetchApi<WorkspaceResponse>(`/partner/workspace/${workspaceId}`);
}

export async function getWorkspaceBots(
  workspaceId: string,
): Promise<BotListResponse> {
  return fetchApi<BotListResponse>(
    `/partner/workspace/${workspaceId}/list-flows`,
  );
}

export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<MemberListResponse> {
  return fetchApi<MemberListResponse>(
    `/partner/workspace/${workspaceId}/members`,
  );
}

export async function getOmniChannels(
  workspaceId: string,
): Promise<OmniChannelResponse> {
  return fetchApi<OmniChannelResponse>(
    `/partner/workspace/${workspaceId}/get-omni-bot-linked-channels`,
  );
}

export async function getFacebookChannels(
  workspaceId: string,
): Promise<ChannelResponse<FacebookChannel>> {
  return fetchApi<ChannelResponse<FacebookChannel>>(
    `/partner/workspace/${workspaceId}/list-channels/facebook`,
  );
}

export async function getInstagramChannels(
  workspaceId: string,
): Promise<ChannelResponse<InstagramChannel>> {
  return fetchApi<ChannelResponse<InstagramChannel>>(
    `/partner/workspace/${workspaceId}/list-channels/instagram`,
  );
}

export async function getWhatsAppCloudChannels(
  workspaceId: string,
): Promise<ChannelResponse<WhatsAppCloudChannel>> {
  return fetchApi<ChannelResponse<WhatsAppCloudChannel>>(
    `/partner/workspace/${workspaceId}/list-channels/whatsapp-cloud`,
  );
}

export async function getTelegramChannels(
  workspaceId: string,
): Promise<ChannelResponse<TelegramChannel>> {
  return fetchApi<ChannelResponse<TelegramChannel>>(
    `/partner/workspace/${workspaceId}/list-channels/telegram`,
  );
}

// Buscar contagem de todos os canais
export async function getAllChannelsCounts(workspaceId: string) {
  const results = await Promise.allSettled([
    getOmniChannels(workspaceId),
    getFacebookChannels(workspaceId),
    getInstagramChannels(workspaceId),
    getWhatsAppCloudChannels(workspaceId),
    getTelegramChannels(workspaceId),
  ]);

  return {
    omni:
      results[0].status === "fulfilled"
        ? results[0].value.data.filter((c) => c.is_linked).length
        : 0,
    facebook:
      results[1].status === "fulfilled" ? results[1].value.data.length : 0,
    instagram:
      results[2].status === "fulfilled" ? results[2].value.data.length : 0,
    whatsappCloud:
      results[3].status === "fulfilled" ? results[3].value.data.length : 0,
    telegram:
      results[4].status === "fulfilled" ? results[4].value.data.length : 0,
  };
}

// ============ FLOW SUMMARY (Analytics) ============

export type SummaryRange =
  | "yesterday"
  | "last_7_days"
  | "last_week"
  | "last_30_days"
  | "last_month"
  | "last_3_months";

export interface FlowSummary {
  flow_ns: string;
  summary_date: string;
  total_bot_users: number;
  day_active_bot_users: number;
  day_new_bot_users: number;
  day_total_messages: number;
  day_in_messages: number;
  day_out_messages: number;
  day_agent_messages: number;
  day_note_messages: number;
  day_assigned: number;
  day_done: number;
  day_email_sent: number;
  day_email_open: number;
  avg_agent_response_time: number;
  avg_resolve_time: number;
}

export interface FlowSummaryResponse {
  data: FlowSummary[];
}

export interface FlowAgentSummary {
  flow_ns: string;
  summary_date: string;
  agent_id: number;
  day_reply_bot_users: number;
  day_agent_messages: number;
  day_note_messages: number;
  day_assigned: number;
  day_done: number;
  avg_agent_response_time: number;
  avg_resolve_time: number;
}

export interface FlowAgentSummaryResponse {
  data: FlowAgentSummary[];
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  image: string;
  role: string;
  is_online: boolean;
}

export interface TeamMembersResponse {
  data: TeamMember[];
}

// Get flow summary with analytics
export async function getFlowSummary(
  workspaceId: string,
  range: SummaryRange = "last_30_days",
  flowNs?: string,
): Promise<FlowSummaryResponse> {
  const endpoint = `/flow-summary?range=${range}${flowNs ? `&flow_ns=${flowNs}` : ""}`;
  return fetchWorkspaceApi<FlowSummaryResponse>(endpoint, workspaceId, flowNs);
}

// Get flow agent summary
export async function getFlowAgentSummary(
  workspaceId: string,
  range: SummaryRange = "last_30_days",
  flowNs?: string,
): Promise<FlowAgentSummaryResponse> {
  const endpoint = `/flow-agent-summary?range=${range}${flowNs ? `&flow_ns=${flowNs}` : ""}`;
  return fetchWorkspaceApi<FlowAgentSummaryResponse>(
    endpoint,
    workspaceId,
    flowNs,
  );
}

// Get team members
export async function getTeamMembers(
  workspaceId: string,
  limit: number = 100,
  page: number = 1,
): Promise<TeamMembersResponse> {
  const endpoint = `/team-members?limit=${limit}&page=${page}`;
  return fetchWorkspaceApi<TeamMembersResponse>(endpoint, workspaceId);
}

// Aggregate flow summary data
export function aggregateFlowSummary(summaries: FlowSummary[]) {
  return summaries.reduce(
    (acc, curr) => ({
      totalBotUsers: acc.totalBotUsers + curr.total_bot_users,
      activeBotUsers: acc.activeBotUsers + curr.day_active_bot_users,
      newBotUsers: acc.newBotUsers + curr.day_new_bot_users,
      totalMessages: acc.totalMessages + curr.day_total_messages,
      inMessages: acc.inMessages + curr.day_in_messages,
      outMessages: acc.outMessages + curr.day_out_messages,
      agentMessages: acc.agentMessages + curr.day_agent_messages,
      assigned: acc.assigned + curr.day_assigned,
      done: acc.done + curr.day_done,
      avgResponseTime: curr.avg_agent_response_time || acc.avgResponseTime,
      avgResolveTime: curr.avg_resolve_time || acc.avgResolveTime,
    }),
    {
      totalBotUsers: 0,
      activeBotUsers: 0,
      newBotUsers: 0,
      totalMessages: 0,
      inMessages: 0,
      outMessages: 0,
      agentMessages: 0,
      assigned: 0,
      done: 0,
      avgResponseTime: 0,
      avgResolveTime: 0,
    },
  );
}
