/* eslint-disable react/prop-types */

import { X } from 'lucide-react';
import ManualSaleStatus from '../../components/consignment/ManualSaleStatus';
import '../../styles/mark-sold-modal.css';

export default function MarkSoldModal({
  item,
  onUpdateStatus,
  money,
  onCancel,
}) {
  if (!item) return null;

  return (
    <div
      className="mark-sold-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div
        className="mark-sold-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-sold-title"
      >
        <header className="mark-sold-header">
          <div className="mark-sold-heading">
            <h2 id="mark-sold-title">
              Mark item sold
            </h2>

            <p>
              {item.description ||
                item.type ||
                'Consignment item'}

              {item.itemNumber
                ? ` · ${item.itemNumber}`
                : ''}
            </p>
          </div>

          <button
            type="button"
            className="mark-sold-close"
            onClick={() => onCancel?.()}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mark-sold-body">

          <ManualSaleStatus
            item={item}
            onUpdateStatus={onUpdateStatus}
            money={money}
          />

        </div>
      </div>
    </div>
  );
}