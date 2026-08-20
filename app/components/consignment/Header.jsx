/* eslint-disable react/prop-types */
import { ArrowLeft } from 'lucide-react';
import '../../styles/consignment-header.css';

export default function Header({ eyebrow, title, onBack = null, action = null }) {
  return (
    <div className="consignment-header">
      <div className="consignment-header-row">
        <div className="consignment-header-main">
          {onBack && (
            <button type="button" className="consignment-back" onClick={onBack} aria-label="Back">
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
