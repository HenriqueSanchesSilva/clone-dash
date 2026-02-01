import { useEffect, useState } from 'react';
import { getAllPartnerWorkspaces, type PartnerWorkspace } from '../services/api';
import {
  FaBuilding,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaPauseCircle,
  FaCrown,
  FaGem,
  FaRocket,
  FaStar,
  FaUsers,
  FaRobot,
  FaChartLine,
  FaSync,
  FaSearch,
  FaExternalLinkAlt
} from 'react-icons/fa';
import './AdminDashboard.css';

interface PlanCount {
  plan: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<PartnerWorkspace[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Métricas calculadas
  const [totalWorkspaces, setTotalWorkspaces] = useState(0);
  const [planCounts, setPlanCounts] = useState<PlanCount[]>([]);
  const [overLimitWorkspaces, setOverLimitWorkspaces] = useState<PartnerWorkspace[]>([]);
  const [nearLimitWorkspaces, setNearLimitWorkspaces] = useState<PartnerWorkspace[]>([]);
  const [pausedWorkspaces, setPausedWorkspaces] = useState<PartnerWorkspace[]>([]);

  // Estados de busca
  const [searchOverLimit, setSearchOverLimit] = useState('');
  const [searchNearLimit, setSearchNearLimit] = useState('');
  const [searchPaused, setSearchPaused] = useState('');
  const [searchAll, setSearchAll] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const allWorkspaces = await getAllPartnerWorkspaces();
      setWorkspaces(allWorkspaces);
      setLastUpdate(new Date());

      // Calcular métricas
      calculateMetrics(allWorkspaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function calculateMetrics(data: PartnerWorkspace[]) {
    // Total
    setTotalWorkspaces(data.length);

    // Por plano
    const planMap = new Map<string, number>();
    data.forEach(ws => {
      const plan = ws.plan || 'unknown';
      planMap.set(plan, (planMap.get(plan) || 0) + 1);
    });

    const planIcons: Record<string, { icon: React.ReactNode; color: string }> = {
      free: { icon: <FaStar />, color: '#94a3b8' },
      starter: { icon: <FaRocket />, color: '#3b82f6' },
      business: { icon: <FaGem />, color: '#8b5cf6' },
      business_lite: { icon: <FaGem />, color: '#7c3aed' },
      pro: { icon: <FaCrown />, color: '#f59e0b' },
      enterprise: { icon: <FaCrown />, color: '#ef4444' },
      unknown: { icon: <FaBuilding />, color: '#64748b' }
    };

    const counts: PlanCount[] = Array.from(planMap.entries())
      .map(([plan, count]) => ({
        plan,
        count,
        icon: planIcons[plan]?.icon || planIcons.unknown.icon,
        color: planIcons[plan]?.color || planIcons.unknown.color
      }))
      .sort((a, b) => b.count - a.count);

    setPlanCounts(counts);

    // Workspaces que estouraram o limite (100% ou mais) - excluindo free
    const overLimit = data.filter(ws =>
      ws.bot_user_limit > 0 &&
      ws.bot_user_used >= ws.bot_user_limit &&
      ws.plan?.toLowerCase() !== 'free'
    ).sort((a, b) => {
      const aPercent = (a.bot_user_used / a.bot_user_limit) * 100;
      const bPercent = (b.bot_user_used / b.bot_user_limit) * 100;
      return bPercent - aPercent;
    });
    setOverLimitWorkspaces(overLimit);

    // Workspaces perto do limite (80% - 99%)
    const nearLimit = data.filter(ws => {
      if (ws.bot_user_limit <= 0) return false;
      const percent = (ws.bot_user_used / ws.bot_user_limit) * 100;
      return percent >= 80 && percent < 100;
    }).sort((a, b) => {
      const aPercent = (a.bot_user_used / a.bot_user_limit) * 100;
      const bPercent = (b.bot_user_used / b.bot_user_limit) * 100;
      return bPercent - aPercent;
    });
    setNearLimitWorkspaces(nearLimit);

    // Workspaces pausados (exceto free)
    const paused = data.filter(ws => ws.is_paused === 1 && ws.plan?.toLowerCase() !== 'free');
    setPausedWorkspaces(paused);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatDate(dateString: string | null) {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  }

  function getUsagePercent(used: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.round((used / limit) * 100);
  }

  function getUsageColor(percent: number): string {
    if (percent >= 100) return '#ef4444';
    if (percent >= 80) return '#f59e0b';
    if (percent >= 50) return '#3b82f6';
    return '#22c55e';
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Carregando workspaces...</p>
        <span className="loading-hint">Buscando todas as páginas da API...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <FaExclamationCircle className="error-icon" />
        <h2>Erro ao carregar</h2>
        <p>{error}</p>
        <button onClick={loadData}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1>🔐 Painel Admin</h1>
            <span className="header-subtitle">Gestão de Licenças TalkBI</span>
          </div>
          <div className="header-actions">
            {lastUpdate && (
              <span className="last-update">
                Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button className="refresh-btn" onClick={loadData} disabled={loading}>
              <FaSync className={loading ? 'spinning' : ''} />
              Atualizar
            </button>
            <a
              href="https://chat.talkbi.com.br/settings/accounts/94199#/partner/workspaces"
              className="manage-btn"
            >
              <FaExternalLinkAlt />
              Ir para gestão de workspaces
            </a>
          </div>
        </div>
      </header>

      <main className="admin-content">
        {/* Cards de Métricas */}
        <section className="metrics-section">
          <h2 className="section-title">
            <FaChartLine /> Visão Geral
          </h2>

          <div className="metrics-grid">
            {/* Total Workspaces */}
            <div className="metric-card total">
              <div className="metric-icon">
                <FaBuilding />
              </div>
              <div className="metric-info">
                <span className="metric-value">{totalWorkspaces}</span>
                <span className="metric-label">Total de Workspaces</span>
              </div>
            </div>

            {/* Por Plano */}
            {planCounts.map(plan => (
              <div key={plan.plan} className="metric-card plan">
                <div className="metric-icon" style={{ color: plan.color, backgroundColor: `${plan.color}15` }}>
                  {plan.icon}
                </div>
                <div className="metric-info">
                  <span className="metric-value">{plan.count}</span>
                  <span className="metric-label" style={{ textTransform: 'capitalize' }}>
                    {plan.plan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Alertas */}
        <section className="alerts-section">
          <div className="alerts-grid">
            {/* Estouraram Limite */}
            <div className="alert-card danger">
              <div className="alert-header">
                <FaExclamationCircle className="alert-icon" />
                <h3>Limite Estourado</h3>
                <span className="alert-count">{overLimitWorkspaces.length}</span>
              </div>
              <p className="alert-description">
                Workspaces com uso ≥ 100% do limite de usuários (exceto free)
              </p>

              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar workspace..."
                  value={searchOverLimit}
                  onChange={(e) => setSearchOverLimit(e.target.value)}
                />
              </div>

              {overLimitWorkspaces.length > 0 ? (
                <div className="alert-list">
                  {overLimitWorkspaces
                    .filter(ws =>
                      ws.name.toLowerCase().includes(searchOverLimit.toLowerCase()) ||
                      ws.owner_name?.toLowerCase().includes(searchOverLimit.toLowerCase()) ||
                      ws.owner_email?.toLowerCase().includes(searchOverLimit.toLowerCase())
                    )
                    .map(ws => (
                      <div key={ws.id} className="workspace-item">
                        <div className="workspace-main">
                          <span className="workspace-name">{ws.name}</span>
                          <span className={`plan-badge ${ws.plan}`}>{ws.plan}</span>
                        </div>
                        <div className="workspace-details">
                          <span className="owner">{ws.owner_name}</span>
                          <span className="usage danger">
                            <FaUsers /> {ws.bot_user_used.toLocaleString()} / {ws.bot_user_limit.toLocaleString()}
                            <span className="percent">({getUsagePercent(ws.bot_user_used, ws.bot_user_limit)}%)</span>
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill danger"
                            style={{ width: `${Math.min(getUsagePercent(ws.bot_user_used, ws.bot_user_limit), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>✅ Nenhum workspace estourado</span>
                </div>
              )}
            </div>

            {/* Perto do Limite */}
            <div className="alert-card warning">
              <div className="alert-header">
                <FaExclamationTriangle className="alert-icon" />
                <h3>Perto do Limite</h3>
                <span className="alert-count">{nearLimitWorkspaces.length}</span>
              </div>
              <p className="alert-description">
                Workspaces com uso entre 80% e 99% do limite
              </p>

              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar workspace..."
                  value={searchNearLimit}
                  onChange={(e) => setSearchNearLimit(e.target.value)}
                />
              </div>

              {nearLimitWorkspaces.length > 0 ? (
                <div className="alert-list">
                  {nearLimitWorkspaces
                    .filter(ws =>
                      ws.name.toLowerCase().includes(searchNearLimit.toLowerCase()) ||
                      ws.owner_name?.toLowerCase().includes(searchNearLimit.toLowerCase()) ||
                      ws.owner_email?.toLowerCase().includes(searchNearLimit.toLowerCase())
                    )
                    .map(ws => (
                      <div key={ws.id} className="workspace-item">
                        <div className="workspace-main">
                          <span className="workspace-name">{ws.name}</span>
                          <span className={`plan-badge ${ws.plan}`}>{ws.plan}</span>
                        </div>
                        <div className="workspace-details">
                          <span className="owner">{ws.owner_name}</span>
                          <span className="usage warning">
                            <FaUsers /> {ws.bot_user_used.toLocaleString()} / {ws.bot_user_limit.toLocaleString()}
                            <span className="percent">({getUsagePercent(ws.bot_user_used, ws.bot_user_limit)}%)</span>
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill warning"
                            style={{ width: `${getUsagePercent(ws.bot_user_used, ws.bot_user_limit)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>✅ Nenhum workspace perto do limite</span>
                </div>
              )}
            </div>

            {/* Pausados */}
            <div className="alert-card paused">
              <div className="alert-header">
                <FaPauseCircle className="alert-icon" />
                <h3>Pausados</h3>
                <span className="alert-count">{pausedWorkspaces.length}</span>
              </div>
              <p className="alert-description">
                Workspaces com operação pausada
              </p>

              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar workspace..."
                  value={searchPaused}
                  onChange={(e) => setSearchPaused(e.target.value)}
                />
              </div>

              {pausedWorkspaces.length > 0 ? (
                <div className="alert-list">
                  {pausedWorkspaces
                    .filter(ws =>
                      ws.name.toLowerCase().includes(searchPaused.toLowerCase()) ||
                      ws.owner_name?.toLowerCase().includes(searchPaused.toLowerCase()) ||
                      ws.owner_email?.toLowerCase().includes(searchPaused.toLowerCase())
                    )
                    .map(ws => (
                      <div key={ws.id} className="workspace-item">
                        <div className="workspace-main">
                          <span className="workspace-name">{ws.name}</span>
                          <span className={`plan-badge ${ws.plan}`}>{ws.plan}</span>
                        </div>
                        <div className="workspace-details">
                          <span className="owner">{ws.owner_name}</span>
                          <span className="owner-email">{ws.owner_email}</span>
                        </div>
                        <div className="workspace-meta">
                          <span>Criado: {formatDate(ws.created_at)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>✅ Nenhum workspace pausado</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tabela Completa */}
        <section className="table-section">
          <div className="section-header">
            <h2 className="section-title">
              <FaBuilding /> Todos os Workspaces ({workspaces.length})
            </h2>
            <div className="search-box table-search">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por nome, owner ou email..."
                value={searchAll}
                onChange={(e) => setSearchAll(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="workspaces-table">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Plano</th>
                  <th>Owner</th>
                  <th>Usuários</th>
                  <th>Bots</th>
                  <th>Status</th>
                  <th>Criado</th>
                </tr>
              </thead>
              <tbody>
                {workspaces
                  .filter(ws =>
                    searchAll === '' ||
                    ws.name.toLowerCase().includes(searchAll.toLowerCase()) ||
                    ws.owner_name?.toLowerCase().includes(searchAll.toLowerCase()) ||
                    ws.owner_email?.toLowerCase().includes(searchAll.toLowerCase()) ||
                    ws.plan?.toLowerCase().includes(searchAll.toLowerCase())
                  )
                  .map(ws => {
                    const usagePercent = getUsagePercent(ws.bot_user_used, ws.bot_user_limit);
                    return (
                      <tr key={ws.id} className={ws.is_paused ? 'paused' : ''}>
                        <td>
                          <div className="cell-workspace">
                            <span className="ws-name">{ws.name}</span>
                            <span className="ws-id">ID: {ws.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`plan-badge ${ws.plan}`}>{ws.plan}</span>
                        </td>
                        <td>
                          <div className="cell-owner">
                            <span className="owner-name">{ws.owner_name}</span>
                            <span className="owner-email">{ws.owner_email}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-usage">
                            <span className="usage-numbers">
                              {ws.bot_user_used.toLocaleString()} / {ws.bot_user_limit.toLocaleString()}
                            </span>
                            <div className="mini-progress">
                              <div
                                className="mini-progress-fill"
                                style={{
                                  width: `${Math.min(usagePercent, 100)}%`,
                                  backgroundColor: getUsageColor(usagePercent)
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="bots-count">
                            <FaRobot /> {ws.bot_used} / {ws.bot_limit}
                          </span>
                        </td>
                        <td>
                          {ws.is_paused ? (
                            <span className="status-badge paused">
                              <FaPauseCircle /> Pausado
                            </span>
                          ) : ws.auto_renew ? (
                            <span className="status-badge active">
                              Ativo
                            </span>
                          ) : (
                            <span className="status-badge inactive">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="date">{formatDate(ws.created_at)}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
