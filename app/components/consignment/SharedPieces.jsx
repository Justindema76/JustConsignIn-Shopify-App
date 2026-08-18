import { ArrowLeft } from 'lucide-react';

// Extracted verbatim from consignment_intake.jsx — behavior unchanged.
// More pieces move here as each additional page gets broken out.

export function Header({ eyebrow, title, onBack = null, action = null }) {
  return (
    <div className="consignment-header">
      <div className="consignment-header-row">
        <div className="consignment-header-main">
          {onBack && (
            <button className="consignment-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            {eyebrow && <p className="consignment-eyebrow">{eyebrow}</p>}
            <h1 className="consignment-title">{title}</h1>
          </div>
        </div>
        {action && <div className="consignment-header-action">{action}</div>}
      </div>
    </div>
  );
}

export function MetricCard({ icon: Icon, label, value, note, onClick }) {
  return (
    <button type="button" className="consignment-metric" onClick={onClick} aria-label={`Open ${label}`}>
      <div className="consignment-metric-icon"><Icon size={18} /></div>
      <div className="consignment-metric-label">{label}</div>
      <div className="consignment-metric-value">{value}</div>
      {note && <div className="consignment-metric-note">{note}</div>}
    </button>
  );
}
