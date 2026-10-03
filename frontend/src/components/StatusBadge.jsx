const STATUS_LABELS = {
  NORMAL: 'Normal',
  WARNING: 'Warning',
  HIGH_RISK: 'High risk',
  CRITICAL: 'Critical',
  POSSIBLE_BLOCKAGE: 'Possible blockage',
  UNKNOWN: 'No data',
};

export default function StatusBadge({ status }) {
  const safeStatus = STATUS_LABELS[status] ? status : 'UNKNOWN';
  return (
    <span className={`status-badge status-${safeStatus.toLowerCase().replaceAll('_', '-')}`}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABELS[safeStatus]}
    </span>
  );
}
