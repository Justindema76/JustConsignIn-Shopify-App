/* eslint-disable react/prop-types */

import { Monitor, Moon, Sun } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router';
import Header from '../components/consignment/Header';
import '../styles/consignment-global.css';
import '../styles/consignment-forms.css';

const THEME_OPTIONS = [
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
  },
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
  },
];

export default function SettingsRoute() {
  const navigate = useNavigate();
  const { theme, setTheme } = useOutletContext();

  return (
    <div className="consignment">
      <Header
        eyebrow="Preferences"
        title="Settings"
        onBack={() => navigate('/app')}
      />

      <div className="consignment-body">
        <div className="consignment-settings-shell">
          <section className="consignment-form-section">
            <div className="consignment-form-section-head">
              <span
                className="consignment-form-section-marker"
                aria-hidden="true"
              />

              <div>
                <h2>Appearance</h2>
                <p>Choose how JustConsignIn looks on this device.</p>
              </div>
            </div>

            <div className="consignment-form-section-body">
              <div
                className="consignment-theme-options"
                role="group"
                aria-label="Colour theme"
              >
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = theme === option.value;

                  return (
                    <button
                      type="button"
                      className={`consignment-theme-option${selected ? ' active' : ''}`}
                      aria-pressed={selected}
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <p className="consignment-theme-current">
                System follows this device's light or dark appearance setting.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
