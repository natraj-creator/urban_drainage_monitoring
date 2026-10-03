import StatusBadge from './StatusBadge';

export default function NodeCard({ node, onSelect, selected }) {
  const level = Number(node.latest_level);
  const hasLevel = Number.isFinite(level);
  const levelClass = node.status === 'CRITICAL' || node.status === 'POSSIBLE_BLOCKAGE'
    ? 'danger'
    : node.status === 'HIGH_RISK'
      ? 'high'
      : node.status === 'WARNING'
        ? 'warning'
        : 'normal';
  const battery = Math.max(0, Math.min(100, Number(node.battery_pct) || 0));

  return (
    <button
      type="button"
      className={`node-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-label={`${node.name}, ${hasLevel ? `${level}% water level` : 'no water level data'}, ${node.status}`}
    >
      <div className="node-card-header">
        <span className="node-symbol" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 20V8l8-4 8 4v12H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M8 20v-5h8v5M8 10h.01M16 10h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <StatusBadge status={node.status} />
      </div>
      <div className="node-name-row">
        <div>
          <h3>{node.name}</h3>
          <p className="node-location">{node.location || `Sensor ${node.id}`}</p>
        </div>
        <span className="card-chevron" aria-hidden="true">↗</span>
      </div>
      <div className="level-reading">
        <strong className={`level-value level-${levelClass}`}>{hasLevel ? level.toFixed(1) : '—'}<span>{hasLevel ? '%' : ''}</span></strong>
        <span className="level-caption">Water level</span>
      </div>
      <div
        className={`level-meter meter-${levelClass}`}
        role="meter"
        aria-label="Water level"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={hasLevel ? Math.max(0, Math.min(100, level)) : 0}
      >
        <span className="meter-warning-marker" />
        <span className="meter-danger-marker" />
        <span className="level-fill" style={{ width: `${hasLevel ? Math.max(0, Math.min(100, level)) : 0}%` }} />
      </div>
      <div className="meter-labels"><span>0%</span><span>60% warning</span><span>80% high risk</span><span>100%</span></div>
      <div className="node-card-footer">
        <span className="battery-reading"><span aria-hidden="true">▰</span> Battery <b>{battery.toFixed(0)}%</b></span>
        <span className="last-seen">{node.last_seen ? new Date(node.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No signal'}</span>
      </div>
    </button>
  );
}
