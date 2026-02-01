import { useEffect, useState } from 'react';
import {
  getWorkspaceDetails,
  getWorkspaceBots,
  getAllChannelsCounts,
  getFlowSummary,
  getFlowAgentSummary,
  getTeamMembers,
  type WorkspaceResponse,
  type BotListResponse,
  type FlowSummary,
  type TeamMember,
  type SummaryRange,
} from '../services/api';
import {
  FaWhatsapp,
  FaFacebookMessenger,
  FaInstagram,
  FaTelegram,
  FaRobot,
  FaUsers,
  FaComments,
  FaBook,
  FaPlayCircle,
  FaHeadset,
  FaLightbulb,
  FaGlobe,
  FaUserPlus,
  FaEnvelope,
  FaClock,
  FaUserTie,
  FaChartLine,
  FaMailBulk,
  FaEye,
  FaStickyNote
} from 'react-icons/fa';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import './Dashboard.css';

interface ChannelCounts {
  omni: number;
  facebook: number;
  instagram: number;
  whatsappCloud: number;
  telegram: number;
}

interface AggregatedStats {
  totalBotUsers: number;
  activeBotUsers: number;
  newBotUsers: number;
  totalMessages: number;
  inMessages: number;
  outMessages: number;
  agentMessages: number;
  noteMessages: number;
  assigned: number;
  done: number;
  emailSent: number;
  emailOpen: number;
  avgResponseTime: number;
  avgResolveTime: number;
}

interface AgentPerformance {
  agentId: number;
  agentName: string;
  agentImage: string;
  agentEmail: string;
  agentRole: string;
  isOnline: boolean;
  repliedUsers: number;
  messages: number;
  notes: number;
  assigned: number;
  done: number;
  avgResponseTime: number;
  avgResolveTime: number;
}

// Interface para dados agregados por bot
interface BotAggregated {
  flowNs: string;
  name: string;
  totalBotUsers: number;  // Último valor (acumulado)
  activeBotUsers: number; // Soma do período
  newBotUsers: number;    // Soma do período
  totalMessages: number;  // Soma do período
  ticketsResolved: number; // Soma do período
}

interface DashboardProps {
  workspaceId: string;
  userId: string;
}

export default function Dashboard({ workspaceId }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [bots, setBots] = useState<BotListResponse | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [flowSummaries, setFlowSummaries] = useState<FlowSummary[]>([]);
  const [botsAggregated, setBotsAggregated] = useState<BotAggregated[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);
  const [selectedRange, setSelectedRange] = useState<SummaryRange>('last_30_days');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [channelCounts, setChannelCounts] = useState<ChannelCounts>({
    omni: 0,
    facebook: 0,
    instagram: 0,
    whatsappCloud: 0,
    telegram: 0,
  });

  // Carregar dados estáticos (workspace, bots, channels, team) - apenas uma vez
  useEffect(() => {
    async function loadStaticData() {
      try {
        setLoading(true);
        setError(null);

        const [workspaceData, botsData, channelsData] = await Promise.all([
          getWorkspaceDetails(workspaceId),
          getWorkspaceBots(workspaceId),
          getAllChannelsCounts(workspaceId),
        ]);

        console.log('📊 Workspace Data:', workspaceData);
        console.log('🤖 Bots Data:', botsData);
        console.log('📱 Channels Data:', channelsData);

        setWorkspace(workspaceData);
        setBots(botsData);
        setChannelCounts(channelsData);

        // Team members
        try {
          const teamData = await getTeamMembers(workspaceId);
          console.log('👥 Team Members:', teamData);
          setTeamMembers(teamData.data || []);
        } catch (teamErr) {
          console.warn('⚠️ Team Members não disponível:', teamErr);
          setTeamMembers([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadStaticData();
  }, [workspaceId]);

  // Carregar dados de analytics (dependem do período selecionado)
  useEffect(() => {
    async function loadAnalyticsData() {
      const botsList = bots?.data || [];
      if (botsList.length === 0) {
        setFlowSummaries([]);
        setBotsAggregated([]);
        setAgentPerformance([]);
        setAggregatedStats(null);
        return;
      }

      try {
        setLoadingAnalytics(true);

        // Buscar flow summary e agent summary para cada bot
        const flowPromises = botsList
          .filter(bot => bot.flow_ns)
          .map(bot =>
            getFlowSummary(workspaceId, selectedRange, bot.flow_ns)
              .catch(err => {
                console.warn(`⚠️ Flow Summary não disponível para ${bot.name}:`, err);
                return { data: [] };
              })
          );

        const agentPromises = botsList
          .filter(bot => bot.flow_ns)
          .map(bot =>
            getFlowAgentSummary(workspaceId, selectedRange, bot.flow_ns)
              .catch(err => {
                console.warn(`⚠️ Agent Summary não disponível para ${bot.name}:`, err);
                return { data: [] };
              })
          );

        const [flowResults, agentResults] = await Promise.all([
          Promise.all(flowPromises),
          Promise.all(agentPromises)
        ]);

        const allFlowSummaries = flowResults.flatMap(r => r.data || []);
        const allAgentSummaries = agentResults.flatMap(r => r.data || []);

        console.log('📈 Flow Summaries:', allFlowSummaries);
        console.log('👤 Agent Summaries:', allAgentSummaries);

        setFlowSummaries(allFlowSummaries);

        // Agregar dados por bot
        if (allFlowSummaries.length > 0) {
          const botMap = new Map<string, BotAggregated>();

          allFlowSummaries.forEach(flow => {
            const existing = botMap.get(flow.flow_ns);
            const botInfo = botsList.find(b => b.flow_ns === flow.flow_ns);

            if (existing) {
              existing.totalBotUsers = Math.max(existing.totalBotUsers, flow.total_bot_users);
              existing.activeBotUsers += flow.day_active_bot_users;
              existing.newBotUsers += flow.day_new_bot_users;
              existing.totalMessages += flow.day_total_messages;
              existing.ticketsResolved += flow.day_done;
            } else {
              botMap.set(flow.flow_ns, {
                flowNs: flow.flow_ns,
                name: botInfo?.name || `Bot ${flow.flow_ns}`,
                totalBotUsers: flow.total_bot_users,
                activeBotUsers: flow.day_active_bot_users,
                newBotUsers: flow.day_new_bot_users,
                totalMessages: flow.day_total_messages,
                ticketsResolved: flow.day_done,
              });
            }
          });

          const aggregatedBots = Array.from(botMap.values());
          console.log('🤖 Bots Agregados:', aggregatedBots);
          setBotsAggregated(aggregatedBots);

          // Agregar métricas gerais
          const aggregated = aggregatedBots.reduce(
            (acc, curr) => ({
              totalBotUsers: acc.totalBotUsers + curr.totalBotUsers,
              activeBotUsers: acc.activeBotUsers + curr.activeBotUsers,
              newBotUsers: acc.newBotUsers + curr.newBotUsers,
              totalMessages: acc.totalMessages + curr.totalMessages,
              inMessages: 0,
              outMessages: 0,
              agentMessages: 0,
              noteMessages: 0,
              assigned: 0,
              done: acc.done + curr.ticketsResolved,
              emailSent: 0,
              emailOpen: 0,
              avgResponseTime: 0,
              avgResolveTime: 0,
            }),
            {
              totalBotUsers: 0,
              activeBotUsers: 0,
              newBotUsers: 0,
              totalMessages: 0,
              inMessages: 0,
              outMessages: 0,
              agentMessages: 0,
              noteMessages: 0,
              assigned: 0,
              done: 0,
              emailSent: 0,
              emailOpen: 0,
              avgResponseTime: 0,
              avgResolveTime: 0,
            }
          );

          const detailedAggregated = allFlowSummaries.reduce(
            (acc, curr) => ({
              ...acc,
              inMessages: acc.inMessages + curr.day_in_messages,
              outMessages: acc.outMessages + curr.day_out_messages,
              agentMessages: acc.agentMessages + curr.day_agent_messages,
              noteMessages: acc.noteMessages + curr.day_note_messages,
              assigned: acc.assigned + curr.day_assigned,
              emailSent: acc.emailSent + curr.day_email_sent,
              emailOpen: acc.emailOpen + curr.day_email_open,
              avgResponseTime: curr.avg_agent_response_time || acc.avgResponseTime,
              avgResolveTime: curr.avg_resolve_time || acc.avgResolveTime,
            }),
            aggregated
          );

          setAggregatedStats(detailedAggregated);
        } else {
          setBotsAggregated([]);
          setAggregatedStats(null);
        }

        // Agregar performance por agente
        if (allAgentSummaries.length > 0) {
          const agentMap = new Map<number, AgentPerformance>();
          const sortedSummaries = [...allAgentSummaries];

          sortedSummaries.forEach(agent => {
            const existing = agentMap.get(agent.agent_id);
            const member = teamMembers.find(m => m.id === agent.agent_id);

            if (existing) {
              existing.repliedUsers += agent.day_reply_bot_users;
              existing.messages += agent.day_agent_messages;
              existing.notes += agent.day_note_messages;
              existing.assigned += agent.day_assigned;
              existing.done += agent.day_done;
              if (agent.avg_agent_response_time > 0) {
                existing.avgResponseTime = agent.avg_agent_response_time;
              }
              if (agent.avg_resolve_time > 0) {
                existing.avgResolveTime = agent.avg_resolve_time;
              }
            } else {
              agentMap.set(agent.agent_id, {
                agentId: agent.agent_id,
                agentName: member?.name || `Agente #${agent.agent_id}`,
                agentImage: member?.image || '',
                agentEmail: member?.email || '',
                agentRole: member?.role || 'agent',
                isOnline: member?.is_online || false,
                repliedUsers: agent.day_reply_bot_users,
                messages: agent.day_agent_messages,
                notes: agent.day_note_messages,
                assigned: agent.day_assigned,
                done: agent.day_done,
                avgResponseTime: agent.avg_agent_response_time || 0,
                avgResolveTime: agent.avg_resolve_time || 0,
              });
            }
          });

          const sortedAgents = Array.from(agentMap.values())
            .sort((a, b) => b.messages - a.messages);

          setAgentPerformance(sortedAgents);
        } else {
          setAgentPerformance([]);
        }
      } catch (err) {
        console.error('Erro ao carregar analytics:', err);
      } finally {
        setLoadingAnalytics(false);
      }
    }

    // Só carrega se já tiver os bots carregados
    if (bots) {
      loadAnalyticsData();
    }
  }, [workspaceId, selectedRange, bots, teamMembers]);

  // Calcula porcentagem de uso
  const calcProgress = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  // Determina classe de cor baseado na porcentagem
  const getProgressClass = (percent: number) => {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return '';
  };

  // Formata segundos para tempo legível
  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}min ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}min`;
  };

  // Range labels
  const rangeLabels: Record<SummaryRange, string> = {
    'yesterday': 'Ontem',
    'last_7_days': 'Últimos 7 dias',
    'last_week': 'Última semana',
    'last_30_days': 'Últimos 30 dias',
    'last_month': 'Último mês',
    'last_3_months': 'Últimos 3 meses',
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <div className="error-icon">⚠️</div>
        <h2>Erro ao carregar</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    );
  }

  const ws = workspace?.data;
  const botsCount = bots?.data?.length || 0;
  const membersCount = teamMembers.length;

  const botsProgress = calcProgress(ws?.bot_used || botsCount, ws?.bot_limit || 10);
  const membersProgress = calcProgress(ws?.member_used || membersCount, ws?.member_limit || 5);
  const usersProgress = calcProgress(ws?.bot_user_used || 0, ws?.bot_user_limit || 1000);

  // Dados para gráfico de evolução de mensagens por tipo (agrupado por data)
  const messagesEvolutionData = (() => {
    const dateMap = new Map<string, { date: string; recebidas: number; bot: number; agentes: number }>();

    flowSummaries.forEach(flow => {
      const date = flow.summary_date;
      const existing = dateMap.get(date);

      if (existing) {
        existing.recebidas += flow.day_in_messages;
        existing.bot += flow.day_out_messages;
        existing.agentes += flow.day_agent_messages;
      } else {
        dateMap.set(date, {
          date,
          recebidas: flow.day_in_messages,
          bot: flow.day_out_messages,
          agentes: flow.day_agent_messages,
        });
      }
    });

    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      }));
  })();

  // Dados para gráfico de evolução de usuários novos por bot
  const usersEvolutionData = (() => {
    const dateMap = new Map<string, { date: string;[key: string]: number | string }>();
    const botNames = new Set<string>();

    flowSummaries.forEach(flow => {
      const date = flow.summary_date;
      const botName = bots?.data?.find(b => b.flow_ns === flow.flow_ns)?.name || flow.flow_ns;
      botNames.add(botName);

      const existing = dateMap.get(date);

      if (existing) {
        existing[botName] = ((existing[botName] as number) || 0) + flow.day_new_bot_users;
      } else {
        const newEntry: { date: string;[key: string]: number | string } = { date };
        newEntry[botName] = flow.day_new_bot_users;
        dateMap.set(date, newEntry);
      }
    });

    return {
      data: Array.from(dateMap.values())
        .sort((a, b) => (a.date as string).localeCompare(b.date as string))
        .map(item => ({
          ...item,
          date: new Date(item.date as string).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        })),
      botNames: Array.from(botNames),
    };
  })();

  // Cores para os bots no gráfico
  const botColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="dashboard">
      {/* Main Content */}
      <main className="dashboard-content">
        {/* Stats Section */}
        <section className="stats-section">
          <h2 className="section-title">Visão Geral</h2>

          <div className="stats-grid">
            {/* Bots Card */}
            <a href={`https://chat.talkbi.com.br/settings/accounts/${workspaceId}#/flows`} target="_blank" rel="noopener noreferrer" className="stat-card clickable">
              <div className="stat-card-header">
                <div className="stat-icon bots"><FaRobot /></div>
                <span className="stat-label">Bots Ativos</span>
              </div>
              <div className="stat-value">{ws?.bot_used || botsCount}</div>
              <div className="stat-limit">de {ws?.bot_limit || 10} disponíveis</div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressClass(botsProgress)}`}
                  style={{ width: `${botsProgress}%` }}
                />
              </div>
            </a>

            {/* Members Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon members"><FaUsers /></div>
                <span className="stat-label">Membros da Equipe</span>
              </div>
              <div className="stat-value">{ws?.member_used || membersCount}</div>
              <div className="stat-limit">de {ws?.member_limit || 5} disponíveis</div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressClass(membersProgress)}`}
                  style={{ width: `${membersProgress}%` }}
                />
              </div>
            </div>

            {/* Bot Users Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon users"><FaComments /></div>
                <span className="stat-label">Total de Usuários Bot</span>
              </div>
              <div className="stat-value">{(ws?.bot_user_used || 0).toLocaleString('pt-BR')}</div>
              <div className="stat-limit">de {(ws?.bot_user_limit || 1000).toLocaleString('pt-BR')} disponíveis</div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressClass(usersProgress)}`}
                  style={{ width: `${usersProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Channels Section */}
        <section className="channels-section">
          <h2 className="section-title">Canais Conectados</h2>

          <div className="channels-grid">
            <a href={`https://chat.talkbi.com.br/settings/accounts/${workspaceId}#/omni`} target="_blank" rel="noopener noreferrer" className="channel-card">
              <div className="channel-icon omni"><FaGlobe /></div>
              <div className="channel-name">Omni</div>
              <div className="channel-count">{channelCounts.omni}</div>
              <div className="channel-label">integrados</div>
            </a>

            <a href={`https://chat.talkbi.com.br/settings/accounts/${workspaceId}#/whatsapp-cloud`} target="_blank" rel="noopener noreferrer" className="channel-card">
              <div className="channel-icon whatsapp"><FaWhatsapp /></div>
              <div className="channel-name">WhatsApp</div>
              <div className="channel-count">{channelCounts.whatsappCloud}</div>
              <div className="channel-label">bots ativos</div>
            </a>

            <a href={`https://chat.talkbi.com.br/settings/accounts/${workspaceId}#/facebook`} target="_blank" rel="noopener noreferrer" className="channel-card">
              <div className="channel-icon facebook"><FaFacebookMessenger /></div>
              <div className="channel-name">Facebook</div>
              <div className="channel-count">{channelCounts.facebook}</div>
              <div className="channel-label">bots ativos</div>
            </a>

            <a href={`https://chat.talkbi.com.br/settings/accounts/${workspaceId}#/instagram`} target="_blank" rel="noopener noreferrer" className="channel-card">
              <div className="channel-icon instagram"><FaInstagram /></div>
              <div className="channel-name">Instagram</div>
              <div className="channel-count">{channelCounts.instagram}</div>
              <div className="channel-label">bots ativos</div>
            </a>

            <a href={`https://chat.talkbi.com.br/settings/accounts/${workspaceId}#/telegram`} target="_blank" rel="noopener noreferrer" className="channel-card">
              <div className="channel-icon telegram"><FaTelegram /></div>
              <div className="channel-name">Telegram</div>
              <div className="channel-count">{channelCounts.telegram}</div>
              <div className="channel-label">bots ativos</div>
            </a>
          </div>
        </section>

        {/* Help Section */}
        <section className="help-section">
          <h2 className="section-title">Recursos</h2>

          <div className="help-grid">
            <a href="https://talkbi.com.br/ajuda" target="_blank" rel="noopener noreferrer" className="help-card">
              <div className="help-card-icon"><FaBook /></div>
              <h3>Documentação</h3>
              <p>Aprenda a usar todas as funcionalidades da plataforma</p>
            </a>

            <a href="https://www.youtube.com/@TALKBI/featured" target="_blank" rel="noopener noreferrer" className="help-card">
              <div className="help-card-icon"><FaPlayCircle /></div>
              <h3>Video Tutoriais</h3>
              <p>Assista tutoriais passo a passo</p>
            </a>

            <a href="https://discord.gg/bHRNFcRbT2" target="_blank" rel="noopener noreferrer" className="help-card">
              <div className="help-card-icon"><FaHeadset /></div>
              <h3>Suporte</h3>
              <p>Fale com nossa equipe de suporte</p>
            </a>

            <a href="https://discord.gg/PeDuMUPNnm" target="_blank" rel="noopener noreferrer" className="help-card">
              <div className="help-card-icon"><FaLightbulb /></div>
              <h3>Comunidade</h3>
              <p>Conecte-se com outros usuários</p>
            </a>
          </div>
        </section>

        {/* Analytics Section */}
        <section className={`analytics-section ${loadingAnalytics ? 'loading-analytics' : ''}`}>
          <div className="section-header">
            <h2 className="section-title">
              Analytics
              {loadingAnalytics && <span className="loading-indicator">Atualizando...</span>}
            </h2>
            <select
              className="range-select"
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as SummaryRange)}
              disabled={loadingAnalytics}
            >
              {Object.entries(rangeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Analytics Stats Cards */}
          <div className="analytics-stats-grid">
            <div className="analytics-stat-card">
              <div className="analytics-stat-icon blue"><FaUsers /></div>
              <div className="analytics-stat-content">
                <span className="analytics-stat-value">{aggregatedStats?.activeBotUsers.toLocaleString('pt-BR') || 0}</span>
                <span className="analytics-stat-label">Usuários Ativos</span>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon green"><FaUserPlus /></div>
              <div className="analytics-stat-content">
                <span className="analytics-stat-value">{aggregatedStats?.newBotUsers.toLocaleString('pt-BR') || 0}</span>
                <span className="analytics-stat-label">Novos Usuários</span>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon purple"><FaEnvelope /></div>
              <div className="analytics-stat-content">
                <span className="analytics-stat-value">{aggregatedStats?.totalMessages.toLocaleString('pt-BR') || 0}</span>
                <span className="analytics-stat-label">Total de Mensagens</span>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon orange"><FaClock /></div>
              <div className="analytics-stat-content">
                <span className="analytics-stat-value">{formatTime(aggregatedStats?.avgResponseTime || 0)}</span>
                <span className="analytics-stat-label">Tempo Médio Resposta</span>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="analytics-stat-icon teal"><FaChartLine /></div>
              <div className="analytics-stat-content">
                <span className="analytics-stat-value">{formatTime(aggregatedStats?.avgResolveTime || 0)}</span>
                <span className="analytics-stat-label">Tempo Médio Resolução</span>
              </div>
            </div>

            {(aggregatedStats?.emailSent || 0) > 0 && (
              <div className="analytics-stat-card">
                <div className="analytics-stat-icon red"><FaMailBulk /></div>
                <div className="analytics-stat-content">
                  <span className="analytics-stat-value">{aggregatedStats?.emailSent.toLocaleString('pt-BR') || 0}</span>
                  <span className="analytics-stat-label">E-mails Enviados</span>
                </div>
              </div>
            )}

            {(aggregatedStats?.emailOpen || 0) > 0 && (
              <div className="analytics-stat-card">
                <div className="analytics-stat-icon cyan"><FaEye /></div>
                <div className="analytics-stat-content">
                  <span className="analytics-stat-value">{aggregatedStats?.emailOpen.toLocaleString('pt-BR') || 0}</span>
                  <span className="analytics-stat-label">E-mails Abertos</span>
                </div>
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="charts-grid">
            {/* Messages Evolution Chart */}
            {messagesEvolutionData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">Evolução de Mensagens</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={messagesEvolutionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickMargin={5} />
                      <YAxis stroke="#64748b" fontSize={10} width={35} />
                      <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString('pt-BR') : value)} />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: '20px',
                          fontSize: '12px'
                        }}
                        iconSize={12}
                      />
                      <Line type="monotone" dataKey="recebidas" name="Recebidas" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="bot" name="Bot" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="agentes" name="Agentes" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Users Evolution Chart */}
            {usersEvolutionData.data.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">Evolução de Usuários Novos</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={usersEvolutionData.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickMargin={5} />
                      <YAxis stroke="#64748b" fontSize={10} width={35} />
                      <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString('pt-BR') : value)} />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: '20px',
                          fontSize: '11px',
                          lineHeight: '20px'
                        }}
                        iconSize={10}
                      />
                      {usersEvolutionData.botNames.map((botName, index) => (
                        <Line
                          key={botName}
                          type="monotone"
                          dataKey={botName}
                          name={botName}
                          stroke={botColors[index % botColors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Agent Performance Section */}
        {agentPerformance.length > 0 && (
          <section className="agent-performance-section">
            <h2 className="section-title">
              <FaUserTie style={{ marginRight: '0.5rem' }} />
              Performance dos Agentes
            </h2>

            <div className="agent-cards-grid">
              {agentPerformance.map((agent) => (
                <div key={agent.agentId} className="agent-card">
                  <div className="agent-card-header">
                    <div className="agent-avatar-wrapper">
                      {agent.agentImage ? (
                        <img src={agent.agentImage} alt={agent.agentName} className="agent-avatar" />
                      ) : (
                        <div className="agent-avatar-placeholder">
                          {agent.agentName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`agent-status-dot ${agent.isOnline ? 'online' : 'offline'}`} />
                    </div>
                    <div className="agent-info">
                      <div className="agent-name-row">
                        <span className="agent-name">{agent.agentName}</span>
                        <span className={`agent-role-badge ${agent.agentRole}`}>
                          {agent.agentRole === 'owner' ? 'Proprietário' :
                            agent.agentRole === 'admin' ? 'Admin' :
                              agent.agentRole === 'member' ? 'Membro' : 'Agente'}
                        </span>
                      </div>
                      {agent.agentEmail && <span className="agent-email">{agent.agentEmail}</span>}
                      <span className="agent-users">{agent.repliedUsers} usuários atendidos</span>
                    </div>
                  </div>

                  <div className="agent-stats">
                    <div className="agent-stat">
                      <span className="agent-stat-value">{agent.messages.toLocaleString('pt-BR')}</span>
                      <span className="agent-stat-label">Mensagens</span>
                    </div>
                    <div className="agent-stat">
                      <span className="agent-stat-value">{agent.done}</span>
                      <span className="agent-stat-label">Resolvidos</span>
                    </div>
                    <div className="agent-stat">
                      <span className="agent-stat-value">{formatTime(agent.avgResponseTime)}</span>
                      <span className="agent-stat-label">Tempo Resp.</span>
                    </div>
                  </div>

                  <div className="agent-tickets-summary">
                    <div className="agent-ticket-item">
                      <span className="ticket-label">Atribuídos</span>
                      <span className="ticket-value">{agent.assigned}</span>
                    </div>
                    <div className="agent-ticket-item">
                      <span className="ticket-label">Resolvidos</span>
                      <span className="ticket-value resolved">{agent.done}</span>
                    </div>
                  </div>

                  {agent.notes > 0 && (
                    <div className="agent-notes">
                      <FaStickyNote className="notes-icon" />
                      <span>{agent.notes} notas internas</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bots Detail Section */}
        {botsAggregated.length > 0 && (
          <section className="bots-detail-section">
            <h2 className="section-title">Detalhes dos Bots</h2>

            <div className="bots-table-container">
              <table className="bots-table">
                <thead>
                  <tr>
                    <th>Bot</th>
                    <th>Usuários Totais</th>
                    <th>Usuários Ativos</th>
                    <th>Novos</th>
                    <th>Mensagens</th>
                    <th>Tickets Resolvidos</th>
                  </tr>
                </thead>
                <tbody>
                  {botsAggregated.map((bot) => (
                    <tr key={bot.flowNs}>
                      <td>
                        <div className="bot-info">
                          <FaRobot className="bot-table-icon" />
                          <span>{bot.name}</span>
                        </div>
                      </td>
                      <td>{bot.totalBotUsers.toLocaleString('pt-BR')}</td>
                      <td>{bot.activeBotUsers.toLocaleString('pt-BR')}</td>
                      <td className="new-users">+{bot.newBotUsers.toLocaleString('pt-BR')}</td>
                      <td>{bot.totalMessages.toLocaleString('pt-BR')}</td>
                      <td>{bot.ticketsResolved.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
