import {
  LayoutDashboard,
  Users,
  PackageSearch,
  ReceiptText,
  WalletCards,
  History,
  BarChart3,
  FileUp,
  Settings,
} from 'lucide-react';

const entries = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['consignors', 'Consignors', Users],
  ['items', 'Items', PackageSearch],
  ['sales', 'Sales', ReceiptText],
  ['payouts', 'Payouts', WalletCards],
  ['transactions', 'Transactions', History],
  ['reports', 'Reports', BarChart3],
  ['importExport', 'Import / Export', FileUp],
  ['settings', 'Settings', Settings],
];

export default function AppNavigation({ view, onNavigate }) {
  return (
    <nav className="jci-nav" aria-label="JustConsignIn application navigation">
      <button type="button" className="jci-brand" onClick={() => onNavigate('dashboard')} aria-label="Open dashboard">
        <span className="jci-logo">J</span><strong>JustConsignIn</strong>
      </button>
      <div className="jci-nav-links">
        {entries.map(([key, label, Icon]) => (
          <button key={key} type="button" className={view === key ? 'active' : ''} onClick={() => onNavigate(key)}>
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
