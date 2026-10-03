import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAlerts, getNodeHistory, resolveAlert } from '../api';
import { parseBackendDate } from '../dateUtils';
import { useLiveNodes } from '../hooks/useLiveNodes';
import LevelChart from './LevelChart';

const DrainScene = lazy(() => import('./DrainScene'));

const STATUS_LABELS = {
  NORMAL: 'Normal',
  WARNING: 'Warning',
  HIGH_RISK: 'High risk',
  CRITICAL: 'Critical',
  POSSIBLE_BLOCKAGE: 'Possible blockage',
  UNKNOWN: 'Offline',
};

function formatTimeAgo(value, now) {
  if (!value) return 'No signal';
  const elapsed = Math.max(0, now - parseBackendDate(value).getTime());
  if (!Number.isFinite(elapsed)) return 'No signal';
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatTimestamp(value) {
  return parseBackendDate(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusClass(status) {
  return (status || 'UNKNOWN').toLowerCase().replaceAll('_', '-');
}

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || STATUS_LABELS.UNKNOWN;
  return (
    <span className={`status-badge status-${getStatusClass(status)}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function DataPath({ node, isFresh, dataError, level }) {
  const stages = [
    {
      label: 'Sensor',
      detail: node ? `${node.name} · ${level == null ? 'No reading' : `${level.toFixed(1)}%`}` : 'Waiting for sensor',
      state: isFresh ? 'online' : node ? 'stale' : 'waiting',
    },
    {
      label: 'LoRa link',
      detail: isFresh ? 'Packet received' : 'No recent packet',
      state: isFresh ? 'online' : node ? 'stale' : 'waiting',
    },
    {
      label: 'Gateway',
      detail: isFresh ? 'Forwarding data' : 'Waiting for packet',
      state: isFresh ? 'online' : node ? 'stale' : 'waiting',
    },
    {
      label: 'Backend API',
      detail: dataError ? 'Check API response' : node ? 'Connected' : 'Waiting for node',
      state: dataError ? 'stale' : node ? 'online' : 'waiting',
    },
    {
      label: 'Dashboard',
      detail: node ? 'Live · refreshes every 3s' : 'Waiting for data',
      state: node ? 'online' : 'waiting',
    },
  ];

  return (
    <section className="panel data-path-panel" aria-labelledby="data-path-title">
      <div className="data-path-heading">
        <div>
          <p className="eyebrow">END-TO-END FLOW</p>
          <h2 id="data-path-title">Data path</h2>
        </div>
        <span className={`data-path-summary${isFresh ? ' is-online' : ''}`}>
          <i aria-hidden="true" />{isFresh ? 'Receiving live packets' : 'Waiting for a recent packet'}
        </span>
      </div>
      <ol className="data-path-steps">
        {stages.map((stage, index) => (
          <li className="data-path-item" key={stage.label}>
            <div className={`data-path-stage data-path-${stage.state}`}>
              <span className="data-path-number">{index + 1}</span>
              <strong>{stage.label}</strong>
              <span className="data-path-detail">{stage.detail}</span>
            </div>
            {index < stages.length - 1 && (
              <span
                className={`data-path-connector${stage.state === 'online' ? ' is-active' : ''}`}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function AlertControls({
  notifications,
  isOpen,
  onToggle,
  muted,
  onToggleMute,
  onClear,
}) {
  return (
    <div className="alert-controls">
      <button
        className="alert-center-button"
        type="button"
        aria-expanded={isOpen}
        aria-controls="alert-center"
        onClick={onToggle}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Alerts
        {notifications.length > 0 && <span className="alert-count">{notifications.length}</span>}
      </button>
      {isOpen && (
        <section className="alert-center" id="alert-center" aria-label="In-app alert center">
          <div className="alert-center-heading">
            <div>
              <strong>Alert notifications</strong>
              <span>In-app previews · external messages are not sent</span>
            </div>
            <button type="button" className="alert-sound-toggle" onClick={onToggleMute}>
              Critical sound: {muted ? 'Muted' : 'On'}
            </button>
          </div>
          {notifications.length ? (
            <>
              <ol className="alert-center-list">
                {notifications.map((notification) => (
                  <li className={`alert-center-item alert-${notification.status.toLowerCase()}`} key={notification.id}>
                    <span className="alert-center-status">{STATUS_LABELS[notification.status]}</span>
                    <strong>{notification.nodeName}</strong>
                    <p>{notification.message}</p>
                    <time dateTime={notification.timestamp}>
                      {parseBackendDate(notification.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </time>
                  </li>
                ))}
              </ol>
              <button className="alert-clear-button" type="button" onClick={onClear}>Clear notifications</button>
            </>
          ) : (
            <p className="alert-center-empty">No High Risk or Critical transitions yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

export default function Dashboard() {
  const nodes = useLiveNodes(3000);
  const node = nodes[0];
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [dataError, setDataError] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [resolving, setResolving] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [alertCenterOpen, setAlertCenterOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(
    () => window.localStorage.getItem('drainage-critical-sound-muted') === 'true',
  );
  const previousStatus = useRef({ nodeId: null, status: null });
  const audioContext = useRef(null);
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem('drainage-theme') === 'dark',
  );

  const refreshAlerts = useCallback(async () => {
    try {
      setAlerts(await getAlerts(false));
    } catch (error) {
      console.error('Failed to load alerts', error);
      setDataError('Alerts could not be refreshed. Check the backend connection.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    window.localStorage.setItem('drainage-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    refreshAlerts();
    const timer = window.setInterval(refreshAlerts, 5000);
    return () => window.clearInterval(timer);
  }, [refreshAlerts]);

  useEffect(() => {
    if (!node) {
      setHistory([]);
      return undefined;
    }

    let active = true;
    const loadHistory = async () => {
      try {
        const readings = await getNodeHistory(node.id);
        if (active) {
          setHistory(readings);
          setDataError('');
        }
      } catch (error) {
        console.error('Failed to load sensor history', error);
        if (active) setDataError('Sensor readings could not be loaded. Check the backend connection.');
      }
    };

    loadHistory();
    const timer = window.setInterval(loadHistory, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [node?.id]);

  const latestReading = history[history.length - 1];
  const level = Number(latestReading?.water_level_pct ?? node?.latest_level);
  const hasLevel = Number.isFinite(level);
  const boundedLevel = hasLevel ? Math.min(100, Math.max(0, level)) : 0;
  const status = latestReading?.status || node?.status || 'UNKNOWN';
  const rainfall = latestReading?.rainfall_mm;
  const battery = latestReading?.battery_pct ?? node?.battery_pct;
  const isNodeFresh = Boolean(
    node && now - parseBackendDate(node.last_seen).getTime() <= 30_000,
  );

  const rateOfRise = useMemo(() => {
    if (history.length < 2) return null;
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const elapsedMinutes = (
      parseBackendDate(current.timestamp).getTime() - parseBackendDate(previous.timestamp).getTime()
    ) / 60000;
    if (!Number.isFinite(elapsedMinutes) || elapsedMinutes <= 0) return null;
    return (current.water_level_pct - previous.water_level_pct) / elapsedMinutes;
  }, [history]);

  const minutesToOverflow = (
    isNodeFresh
    && hasLevel
    && level < 100
    && rateOfRise != null
    && rateOfRise > 0
  )
    ? (100 - level) / rateOfRise
    : null;

  const playCriticalSound = useCallback(async () => {
    if (soundMuted) return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      console.warn('Critical alert sound is unavailable because Web Audio is not supported.');
      return;
    }

    try {
      const context = audioContext.current || new AudioContextConstructor();
      audioContext.current = context;
      if (context.state === 'suspended') await context.resume();
      [880, 660].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.22;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.19);
      });
    } catch (error) {
      console.warn('Could not play the Critical alert sound. Check browser audio permissions.', error);
    }
  }, [soundMuted]);

  useEffect(() => {
    if (!node) {
      previousStatus.current = { nodeId: null, status: null };
      return;
    }

    const previous = previousStatus.current;
    const isAlertStatus = status === 'HIGH_RISK' || status === 'CRITICAL';
    if (previous.nodeId === node.id && previous.status !== status && isAlertStatus) {
      const notification = {
        id: `${node.id}-${Date.now()}`,
        nodeName: node.name,
        status,
        level: hasLevel ? boundedLevel : null,
        timestamp: latestReading?.timestamp || node.last_seen,
        message: `${node.name}: ${STATUS_LABELS[status]}${hasLevel ? ` at ${boundedLevel.toFixed(1)}% water level` : ''}. ${status === 'CRITICAL' ? 'Immediate inspection is recommended.' : 'Increase monitoring and notify the operator.'}`,
      };
      setNotifications((current) => [notification, ...current].slice(0, 20));
      setActiveNotification(notification);
      if (status === 'CRITICAL') void playCriticalSound();
    }
    previousStatus.current = { nodeId: node.id, status };
  }, [boundedLevel, hasLevel, latestReading?.timestamp, node, playCriticalSound, status]);

  useEffect(() => {
    if (!activeNotification) return undefined;
    const timer = window.setTimeout(() => setActiveNotification(null), 10000);
    return () => window.clearTimeout(timer);
  }, [activeNotification]);

  useEffect(() => {
    window.localStorage.setItem('drainage-critical-sound-muted', String(soundMuted));
  }, [soundMuted]);

  useEffect(() => () => {
    if (audioContext.current && audioContext.current.state !== 'closed') {
      void audioContext.current.close();
    }
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (audioContext.current || !window.AudioContext) return;
      const context = new window.AudioContext();
      audioContext.current = context;
      void context.resume().catch((error) => {
        console.warn('Could not enable Critical alert sound. Check browser audio permissions.', error);
      });
    };
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const checks = useMemo(() => {
    const recentReadings = history.filter((reading) => (
      now - parseBackendDate(reading.timestamp).getTime() <= 15 * 60 * 1000
    ));
    const persistentHigh = recentReadings.length >= 3
      && recentReadings.every((reading) => reading.water_level_pct >= 80);
    const lowRainfall = rainfall == null || rainfall < 1;
    const rapidRise = rateOfRise != null && rateOfRise >= 5;
    return [
      { label: 'Warning level ≥ 60%', met: hasLevel && level >= 60 },
      { label: 'High risk level ≥ 80%', met: hasLevel && level >= 80 },
      {
        label: 'Critical: >95% or rapid rise above 80%',
        met: hasLevel && (level > 95 || (rapidRise && level > 80)),
      },
      {
        label: 'Blockage: persistent high + rain <1 mm',
        met: persistentHigh && lowRainfall,
      },
    ];
  }, [hasLevel, history, level, now, rainfall, rateOfRise]);

  const nodeAlerts = useMemo(
    () => alerts.filter((alert) => alert.node_id === node?.id),
    [alerts, node?.id],
  );

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    setResolveError('');
    try {
      await resolveAlert(alertId);
      await refreshAlerts();
    } catch (error) {
      console.error('Failed to resolve alert', error);
      setResolveError('Could not resolve this event. Please try again.');
    } finally {
      setResolving(null);
    }
  };

  const toggleTheme = () => setDarkMode((enabled) => !enabled);

  return (
    <main className="drainage-app">
      <header className="topbar">
        <a className="brand" href="#dashboard" aria-label="Drainage Monitor home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M20 4C15 11 9 17.3 9 24a11 11 0 0 0 22 0c0-6.7-6-13-11-20Z" fill="currentColor" />
              <path d="M14.5 24.5c.5 3 2.5 4.8 5.5 5.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>Drainage Monitor</strong>
            <span>Single-node live view</span>
          </span>
        </a>
        <div className="header-actions">
          <span className="live-indicator"><i aria-hidden="true" /> Live</span>
          <AlertControls
            notifications={notifications}
            isOpen={alertCenterOpen}
            onToggle={() => setAlertCenterOpen((open) => !open)}
            muted={soundMuted}
            onToggleMute={() => setSoundMuted((muted) => !muted)}
            onClear={() => setNotifications([])}
          />
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20.2 15.3A8.4 8.4 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="dashboard" id="dashboard">
        <div className="page-intro">
          <div>
            <p className="eyebrow">DRAINAGE NETWORK <span>/</span> LIVE MONITORING</p>
            <h1>Manhole overview</h1>
            <p className="page-subtitle">Real-time conditions from your connected LoRa sensor.</p>
          </div>
          <span className="updated-note"><span className="live-mini-dot" /> Updates every 3 seconds</span>
        </div>

        {dataError && <div className="data-error" role="alert">{dataError}</div>}
        {activeNotification && (
          <aside
            className={`alert-toast alert-${activeNotification.status.toLowerCase()}`}
            role={activeNotification.status === 'CRITICAL' ? 'alert' : 'status'}
            aria-live={activeNotification.status === 'CRITICAL' ? 'assertive' : 'polite'}
          >
            <div>
              <strong>{activeNotification.status === 'CRITICAL' ? 'Critical alert' : 'High Risk alert'} · {activeNotification.nodeName}</strong>
              <p>{activeNotification.message}</p>
              <span>In-app preview only. External messages are not sent.</span>
            </div>
            <button type="button" aria-label="Dismiss alert notification" onClick={() => setActiveNotification(null)}>×</button>
          </aside>
        )}

        {!node ? (
          <>
            <section className="panel empty-state">
              <span className="empty-icon" aria-hidden="true">⌁</span>
              <h2>Waiting for your sensor</h2>
              <p>Live readings will appear here as soon as the LoRa gateway connects.</p>
            </section>
            <DataPath node={node} isFresh={false} dataError={dataError} level={null} />
          </>
        ) : (
          <>
            <Suspense fallback={<section className="drain-scene-panel drain-scene-loading">Loading live 3D drain model…</section>}>
              <DrainScene
                level={boundedLevel}
                rainfall={rainfall ?? 0}
                status={status}
                isConnected={isNodeFresh}
                blockage={status === 'POSSIBLE_BLOCKAGE'}
              />
            </Suspense>
            <DataPath node={node} isFresh={isNodeFresh} dataError={dataError} level={hasLevel ? boundedLevel : null} />
            <section
              className={`hero-card status-${getStatusClass(status)}`}
              aria-labelledby="node-title"
            >
              <div className="node-heading">
                <div>
                  <p className="eyebrow">MONITORED NODE</p>
                  <h2 id="node-title">{node.name}</h2>
                  <p className="node-location">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M16 8.3c0 4.2-6 9.2-6 9.2S4 12.5 4 8.3a6 6 0 1 1 12 0Z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    {node.location || `Sensor ${node.id}`}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="hero-metrics">
                <div className="gauge-column">
                  <div
                    className="level-gauge"
                    role="img"
                    aria-label={hasLevel ? `Water level ${level.toFixed(1)} percent` : 'Waiting for a water-level reading'}
                  >
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                      <circle className="gauge-track" cx="100" cy="100" r="84" />
                      <circle
                        className="gauge-progress"
                        cx="100"
                        cy="100"
                        r="84"
                        style={{ strokeDashoffset: 527.8 * (1 - boundedLevel / 100) }}
                      />
                    </svg>
                    <div className="gauge-reading">
                      <strong>{hasLevel ? level.toFixed(1) : '—'}<span>{hasLevel ? '%' : ''}</span></strong>
                      <span>WATER LEVEL</span>
                    </div>
                  </div>
                  <p className="gauge-caption">Manhole capacity</p>
                </div>

                <div className="stats-grid" aria-label="Sensor readings">
                  <div className="stat-tile">
                    <span className="stat-icon rate-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none"><path d="M3 14.5 8 9l3 2.5 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 4.5h4v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span className="stat-label">RATE OF RISE</span>
                    <strong>{rateOfRise == null ? '—' : `${rateOfRise >= 0 ? '+' : ''}${rateOfRise.toFixed(1)}`}<small>{rateOfRise == null ? '' : '% / min'}</small></strong>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-icon battery-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M18 9v3M6 9v3m3-3v3m3-3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </span>
                    <span className="stat-label">BATTERY</span>
                    <strong>{battery == null ? '—' : `${Number(battery).toFixed(0)}%`}</strong>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-icon rain-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none"><path d="M5.2 11.3a4.2 4.2 0 0 1 .6-8.3 5.1 5.1 0 0 1 9.7 1.6 3.4 3.4 0 0 1-.3 6.7H5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m7 14-1 2m5-2-1 2m5-2-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </span>
                    <span className="stat-label">RAINFALL</span>
                    <strong>{rainfall == null ? '—' : `${Number(rainfall).toFixed(1)}`}<small>{rainfall == null ? '' : 'mm'}</small></strong>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-icon seen-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span className="stat-label">LAST SEEN</span>
                    <strong className="last-seen-value">{formatTimeAgo(node.last_seen, now)}</strong>
                  </div>
                </div>
              </div>

              <div className="risk-panel">
                <div className="risk-heading">
                  <div>
                    <p className="eyebrow">STATUS BREAKDOWN</p>
                    <h3>Risk reasoning</h3>
                  </div>
                  <span className="rule-caption">Live rule checks</span>
                </div>
                <ul className="checks-grid">
                  {checks.map((check) => (
                    <li className={`check-item${check.met ? ' check-met' : ''}`} key={check.label}>
                      <span className="check-mark" aria-hidden="true">{check.met ? '✓' : '—'}</span>
                      <span className="check-label" title={check.label}>{check.label}</span>
                      <strong>{check.met ? 'YES' : 'NO'}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="overflow-estimate" aria-live="polite" aria-labelledby="overflow-title">
              <div className="overflow-estimate-icon" aria-hidden="true">↗</div>
              <div className="overflow-estimate-copy">
                <p className="eyebrow">LINEAR ESTIMATE</p>
                <h2 id="overflow-title">Time to overflow</h2>
                <p>
                  {level >= 100
                    ? 'Water level is at capacity.'
                    : !isNodeFresh
                      ? 'Waiting for a recent sensor reading.'
                      : minutesToOverflow == null
                        ? 'No rising trend detected.'
                        : `Overflow in about ${Math.max(1, Math.ceil(minutesToOverflow))} minute${Math.ceil(minutesToOverflow) === 1 ? '' : 's'}.`}
                </p>
              </div>
              <span className={`overflow-estimate-value${minutesToOverflow != null && minutesToOverflow <= 15 ? ' is-urgent' : ''}`}>
                {level >= 100 ? 'At capacity' : minutesToOverflow == null ? '—' : `~${Math.max(1, Math.ceil(minutesToOverflow))} min`}
              </span>
              <small className="overflow-estimate-note">Assumes the current rise rate continues</small>
            </section>

            <section className={`panel chart-panel status-${getStatusClass(status)}`} aria-labelledby="trend-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">RECENT READINGS</p>
                  <h2 id="trend-title">Water level trend</h2>
                </div>
                <div className="current-reading">
                  <strong>{hasLevel ? `${level.toFixed(1)}%` : '—'}</strong>
                  <span>current level</span>
                </div>
              </div>
              <LevelChart history={history} status={status} />
              <div className="chart-legend">
                <span><i className="legend-line" /> Water level</span>
                <span><i className="legend-dash legend-warning" /> Warning 60%</span>
                <span><i className="legend-dash legend-danger" /> High risk 80%</span>
              </div>
            </section>

            <section className="panel timeline-panel" aria-labelledby="timeline-title">
              <div className="timeline-heading">
                <div>
                  <p className="eyebrow">SENSOR ACTIVITY</p>
                  <h2 id="timeline-title">Event timeline</h2>
                </div>
                <span className="event-count">{nodeAlerts.length} open</span>
              </div>
              {resolveError && <p className="alert-action-error" role="alert">{resolveError}</p>}
              {nodeAlerts.length ? (
                <ol className="timeline-list">
                  {nodeAlerts.map((alert) => (
                    <li className={`timeline-event status-${getStatusClass(alert.level)}`} key={alert.id}>
                      <span className="timeline-dot" aria-hidden="true" />
                      <div className="timeline-copy">
                        <div className="timeline-title">
                          <strong>{STATUS_LABELS[alert.level] || alert.level}</strong>
                          <span>{alert.node_id}</span>
                        </div>
                        <p>{alert.message}</p>
                        <time dateTime={alert.timestamp}>{formatTimestamp(alert.timestamp)}</time>
                      </div>
                      <button
                        className="resolve-button"
                        type="button"
                        disabled={resolving !== null}
                        onClick={() => handleResolve(alert.id)}
                      >
                        {resolving === alert.id ? 'Saving…' : 'Resolve'}
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="timeline-empty">
                  <span aria-hidden="true">✓</span>
                  <div><strong>No open events</strong><p>Status changes that need attention will appear here.</p></div>
                </div>
              )}
            </section>
          </>
        )}

        <footer className="footer-note">
          <span>Drainage Monitor <span className="footer-separator">·</span> LoRa sensor network</span>
          <span><i className="footer-dot" /> {node ? 'Gateway connected' : 'Waiting for gateway'}</span>
        </footer>
      </div>
    </main>
  );
}
