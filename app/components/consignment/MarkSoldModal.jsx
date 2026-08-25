/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import '../../styles/mark-sold-modal.css';

export default function MarkSoldModal({
  item,
  saving = false,
  onCancel,
  onConfirm,
}) {
  const [salePrice, setSalePrice] = useState('');
  const [dateSold, setDateSold] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item) return;
    setSalePrice(String(item.salePrice ?? item.price ?? ''));
    setDateSold(item.dateSold || new Date().toISOString().slice(0, 10));
    setError('');
  }, [item]);

  useEffect(() => {
    if (!item) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape' && !saving) {
        onCancel?.();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [item, saving, onCancel]);

  if (!item) return null;

  function submit(event) {
    event.preventDefault();

    const amount = Number(salePrice);

    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid sale price.');
      return;
    }

    if (!dateSold) {
      setError('Choose the sale date.');
      return;
    }

    setError('');
    onConfirm?.({
      salePrice: amount,
      dateSold,
    });
  }

  return (
    <div
      className="mark-sold-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onCancel?.();
        }
      }}
    >
      <form
        className="mark-sold-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-sold-title"
        onSubmit={submit}
      >
        <header className="mark-sold-header">
          <div className="mark-sold-heading">
            <h2 id="mark-sold-title">Mark item sold</h2>
            <p>
              {item.description || item.type || 'Consignment item'}
              {item.itemNumber ? ` · ${item.itemNumber}` : ''}
            </p>
          </div>

          <button
            type="button"
            className="mark-sold-close"
            onClick={() => onCancel?.()}
            disabled={saving}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mark-sold-body">
          <label className="mark-sold-field">
            <span>Sale price</span>
            <div className="mark-sold-money-input">
              <span aria-hidden="true">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
                autoFocus
                disabled={saving}
              />
            </div>
          </label>

          <label className="mark-sold-field">
            <span>Sale date</span>
            <input
              className="mark-sold-date-input"
              type="date"
              value={dateSold}
              onChange={(event) => setDateSold(event.target.value)}
              disabled={saving}
            />
          </label>

          {error && (
            <div className="mark-sold-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <footer className="mark-sold-actions">
          <button
            type="button"
            className="mark-sold-cancel"
            onClick={() => onCancel?.()}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="mark-sold-confirm"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Mark sold'}
          </button>
        </footer>
      </form>
    </div>
  );
}
