import { useState } from 'react';
import { resolveAlert } from '../api';

const ALERT_LABELS = {
  WARNING: 'Warning',
  HIGH_RISK: 'High risk',
  CRITICAL: 'Critical',
  POSSIBLE_BLOCKAGE: 'Possible blockage',
};

export default function AlertsFeed({ alerts, onResolved }) {
  const [resolving, setResolving] = useState(null);
  const [error, setError] = useState('');

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    setError('');
    try {
      await resolveAlert(alertId);
      await onResolved();
    } catch (requestError) {
      console.error('Failed to resolve alert', requestError);
      setError('Could not resolve this alert. Please try again.');
    } finally {
      setResolving(null);
    }
  };

  return (
    <section className="panel alerts-panel" aria-labelledby="alerts-title">
      <div className="alerts-heading">
        <div>
          <p className="eyebrow">NEEDS YOUR ATTENTION</p>
          <h2 id="alerts-title">Active alerts</h2>
        </div>
        <span className={`alert-count${alerts.length ? ' alert-count-active' : ''}`}>{alerts.length}</span>
      </div>
      {error && <p className="alert-action-error" role="alert">{error}</p>}
      {alerts.length === 0 ? (
        <div className="no-alerts">
          <span className="all-clear-icon" aria-hidden="true">✓</span>
          <strong>All clear</strong>
          <p>No active water-level alerts right now.</p>
        </div>
      ) : (
        <ul className="alerts-list">
          {alerts.map((alert) => {
            const alertClass = alert.level === 'WARNING'
              ? 'warning'
              : ['CRITICAL', 'POSSIBLE_BLOCKAGE'].includes(alert.level)
                ? 'critical'
                : 'high';
            return (
              <li key={alert.id} className={`alert-item alert-item-${alertClass}`}>
                <span className="alert-icon" aria-hidden="true">
                  {alertClass === 'warning' ? '!' : '▲'}
                </span>
                <div className="alert-content">
                  <div className="alert-title-row">
                    <strong>{alert.node_id}</strong>
                    <span className={`alert-label alert-label-${alertClass}`}>
                      {ALERT_LABELS[alert.level] || alert.level}
                    </span>
                  </div>
                  <p>{alert.message}</p>
                  <time dateTime={alert.timestamp}>
                    {new Date(alert.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <button
                  type="button"
                  className="resolve-button"
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolving !== null}
                  aria-label={`Resolve alert for ${alert.node_id}`}
                >
                  {resolving === alert.id ? 'Saving…' : 'Resolve'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
