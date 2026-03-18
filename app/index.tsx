import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

function resolveStaticAssetUri(asset: unknown) {
  if (typeof asset === 'string') {
    return asset;
  }

  if (asset && typeof asset === 'object') {
    if ('uri' in asset && typeof asset.uri === 'string') {
      return asset.uri;
    }

    if ('default' in asset && typeof asset.default === 'string') {
      return asset.default;
    }

    if (
      'default' in asset &&
      asset.default &&
      typeof asset.default === 'object' &&
      'uri' in asset.default &&
      typeof asset.default.uri === 'string'
    ) {
      return asset.default.uri;
    }
  }

  return '';
}

const logoIconUri = resolveStaticAssetUri(
  require('../assets/images/ownly-meta-icon-transparent-1024.png')
);
const mockupUri = resolveStaticAssetUri(require('../assets/images/icon.png'));

const featureCards = [
  {
    title: 'Task management',
    description:
      'Plan projects, organize lists, and keep priorities moving with one clean system for work and life.',
    accent: '#4F7CFF',
  },
  {
    title: 'Weight tracking',
    description:
      'Capture daily progress, spot trends over time, and stay consistent with goals you can actually follow.',
    accent: '#7A6CFF',
  },
  {
    title: 'Exercise logging',
    description:
      'Track workouts, movement, and routines in a way that fits your day instead of interrupting it.',
    accent: '#20A4A5',
  },
  {
    title: 'Diet tracking',
    description:
      'Keep meals, nutrition, and healthy habits in one place so your decisions stay simple and repeatable.',
    accent: '#FF9B5D',
  },
  {
    title: 'Daily dashboard',
    description:
      'See the full picture at a glance: tasks, health signals, routines, and momentum for the day ahead.',
    accent: '#F35B7A',
  },
  {
    title: 'Cross-platform sync',
    description:
      'Move between web, Mac, and iPhone with the same account and the same up-to-date information.',
    accent: '#1F7AA8',
  },
];

const journeyCards = [
  {
    eyebrow: 'Ownly for life management',
    title: 'A calmer command center for your entire personal system.',
    description:
      'Ownly brings tasks, weight, exercise, diet, and routines together so you can manage life in one premium, focused app instead of five disconnected tools.',
  },
  {
    eyebrow: 'Built for everyday clarity',
    title: 'Structured enough for progress, simple enough to use daily.',
    description:
      'From a quick to-do to long-term health tracking, Ownly keeps the essentials visible, reduces friction, and helps you build better momentum.',
  },
];

const platformCards = [
  {
    title: 'Web',
    subtitle: 'Fast access from anywhere',
    description: 'Open your workspace instantly, review the dashboard, and keep life in motion from any browser.',
  },
  {
    title: 'Mac',
    subtitle: 'Focused desktop workflow',
    description: 'Use Ownly as a dedicated desktop app with room for planning, tracking, and deeper daily review.',
  },
  {
    title: 'iPhone',
    subtitle: 'Pocket check-ins',
    description: 'Capture tasks, workouts, meals, and habits in the moment so your system stays current all day.',
  },
];

function QRCodePlaceholder() {
  const cells = Array.from({ length: 81 }, (_, index) => index);

  return (
    <div className="qr-shell">
      <div className="qr-grid" aria-hidden="true">
        {cells.map((cell) => {
          const row = Math.floor(cell / 9);
          const column = cell % 9;
          const filled =
            (row < 2 && column < 2) ||
            (row < 2 && column > 5) ||
            (row > 5 && column < 2) ||
            ((row + column) % 2 === 0 && row > 1 && row < 7 && column > 1 && column < 7) ||
            (row === 4 && column >= 2 && column <= 6) ||
            (column === 4 && row >= 2 && row <= 6);

          return <span key={cell} className={filled ? 'qr-cell filled' : 'qr-cell'} />;
        })}
      </div>
      <span className="qr-label">iOS QR</span>
    </div>
  );
}

function DevicePreview() {
  return (
    <div className="hero-mockup">
      <div className="mockup-shell">
        <div className="mockup-sidebar">
          <div className="mockup-logo-wrap">
            <img alt="Ownly icon" className="mockup-logo" src={mockupUri} />
            <div>
              <p className="mockup-label">Ownly</p>
              <p className="mockup-subtle">Life management</p>
            </div>
          </div>
          <div className="mockup-nav-list">
            {['Dashboard', 'Tasks', 'Weight', 'Exercise', 'Diet'].map((item, index) => (
              <div key={item} className={`mockup-nav-item ${index === 0 ? 'active' : ''}`}>
                <span className="mockup-dot" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="mockup-main">
          <div className="mockup-topbar">
            <div>
              <p className="mockup-overline">Today</p>
              <h3 className="mockup-title">A clear daily dashboard</h3>
            </div>
            <div className="mockup-pill">Synced</div>
          </div>
          <div className="mockup-stats">
            <div className="mockup-stat-card">
              <span className="mockup-stat-label">Tasks due</span>
              <strong>7</strong>
            </div>
            <div className="mockup-stat-card">
              <span className="mockup-stat-label">Weight trend</span>
              <strong>↘ Stable</strong>
            </div>
            <div className="mockup-stat-card">
              <span className="mockup-stat-label">Exercise</span>
              <strong>45 min</strong>
            </div>
          </div>
          <div className="mockup-panels">
            <div className="mockup-panel">
              <div className="panel-header">
                <span>Today&apos;s priorities</span>
                <span>3 left</span>
              </div>
              {['Review weekly goals', 'Log workout', 'Prepare dinner plan'].map((item) => (
                <div key={item} className="task-row">
                  <span className="task-check" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mockup-panel soft">
              <div className="panel-header">
                <span>Routines</span>
                <span>82%</span>
              </div>
              <div className="progress-row">
                <span>Morning reset</span>
                <div className="progress-track">
                  <div className="progress-fill w-82" />
                </div>
              </div>
              <div className="progress-row">
                <span>Nutrition target</span>
                <div className="progress-track">
                  <div className="progress-fill w-64" />
                </div>
              </div>
              <div className="progress-row">
                <span>Movement goal</span>
                <div className="progress-track">
                  <div className="progress-fill w-48" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mobile-preview">
        <div className="phone-bezel">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-card">
              <p className="phone-small">Dashboard</p>
              <h4>Everything in one place.</h4>
            </div>
            <div className="phone-stack">
              <div className="phone-item">
                <span>Tasks</span>
                <strong>5</strong>
              </div>
              <div className="phone-item">
                <span>Weight</span>
                <strong>148.6</strong>
              </div>
              <div className="phone-item">
                <span>Exercise</span>
                <strong>Done</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnlyLandingPage() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Your OWN Workspace';
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Your OWN Workspace' }} />
      <style>{`
        :root {
          --bg: #f7f8fc;
          --surface: rgba(255, 255, 255, 0.9);
          --surface-strong: #ffffff;
          --text: #182033;
          --muted: #5f6b85;
          --line: rgba(24, 32, 51, 0.08);
          --blue: #4f7cff;
          --blue-dark: #2346d0;
          --navy: #1d2842;
          --shadow: 0 30px 70px rgba(24, 32, 51, 0.12);
          --shadow-soft: 0 16px 40px rgba(24, 32, 51, 0.08);
          --radius-xl: 32px;
          --radius-lg: 24px;
          --radius-md: 18px;
          --max: 1180px;
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: radial-gradient(circle at top, #ffffff 0%, var(--bg) 60%, #eef2fb 100%); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        a { color: inherit; text-decoration: none; }
        .landing-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 15%, rgba(79, 124, 255, 0.12), transparent 32%),
            radial-gradient(circle at 85% 10%, rgba(32, 164, 165, 0.12), transparent 28%),
            linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(247,248,252,0.97) 55%, #f4f6fb 100%);
        }
        .section-shell { width: min(var(--max), calc(100% - 40px)); margin: 0 auto; }
        .top-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(20px);
          background: rgba(247, 248, 252, 0.82);
          border-bottom: 1px solid rgba(24, 32, 51, 0.05);
        }
        .top-nav-inner {
          width: min(var(--max), calc(100% - 32px));
          margin: 0 auto;
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .brand, .footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }
        .brand-icon {
          width: 50px;
          height: 50px;
          object-fit: contain;
          border-radius: 18px;
          filter: drop-shadow(0 16px 26px rgba(79, 124, 255, 0.18));
        }
        .brand-wordmark {
          font-size: 32px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.18em;
          color: var(--navy);
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          color: var(--muted);
          font-size: 15px;
          font-weight: 600;
        }
        .nav-links a:hover, .footer-links a:hover, .footer-meta a:hover { color: var(--blue-dark); }
        .nav-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 20px;
          border-radius: 999px;
          background: var(--navy);
          color: #fff;
          font-weight: 700;
          box-shadow: 0 16px 24px rgba(29, 40, 66, 0.18);
        }
        .hero {
          padding: 42px 0 48px;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 36px;
          align-items: center;
        }
        .hero-copy { padding: 34px 0; }
        .hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(79, 124, 255, 0.11);
          color: var(--blue-dark);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }
        .hero-title {
          margin: 18px 0 18px;
          font-size: clamp(3rem, 7vw, 5.3rem);
          line-height: 0.98;
          letter-spacing: -0.045em;
          font-weight: 900;
          color: var(--navy);
          max-width: 11ch;
        }
        .hero-text {
          max-width: 600px;
          font-size: 18px;
          line-height: 1.75;
          color: var(--muted);
          margin: 0;
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin: 26px 0 28px;
        }
        .button-primary, .button-secondary, .download-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 56px;
          padding: 0 22px;
          border-radius: 18px;
          font-weight: 700;
          font-size: 16px;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .button-primary:hover, .button-secondary:hover, .download-button:hover, .nav-login:hover { transform: translateY(-1px); }
        .button-primary {
          background: linear-gradient(135deg, var(--blue) 0%, #7a98ff 100%);
          color: #fff;
          box-shadow: 0 24px 40px rgba(79, 124, 255, 0.25);
        }
        .button-secondary {
          border: 1px solid rgba(24, 32, 51, 0.1);
          background: rgba(255, 255, 255, 0.74);
          color: var(--navy);
          box-shadow: var(--shadow-soft);
        }
        .hero-proof {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: var(--muted);
          font-size: 14px;
        }
        .hero-proof span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(24, 32, 51, 0.06);
        }
        .hero-mockup {
          position: relative;
          padding: 10px 0 10px 18px;
        }
        .mockup-shell {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          min-height: 530px;
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 30px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .mockup-sidebar {
          padding: 26px 22px;
          background: linear-gradient(180deg, rgba(29, 40, 66, 0.98) 0%, rgba(42, 55, 84, 0.95) 100%);
          color: rgba(255,255,255,0.84);
        }
        .mockup-logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .mockup-logo {
          width: 52px;
          height: 52px;
          object-fit: contain;
          border-radius: 16px;
        }
        .mockup-label { margin: 0 0 4px; color: #fff; font-size: 18px; font-weight: 800; }
        .mockup-subtle, .mockup-overline, .mockup-stat-label, .phone-small { margin: 0; color: rgba(24, 32, 51, 0.55); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .mockup-subtle { color: rgba(255,255,255,0.58); }
        .mockup-nav-list { display: grid; gap: 10px; }
        .mockup-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 13px;
          border-radius: 16px;
          font-weight: 600;
          color: rgba(255,255,255,0.78);
        }
        .mockup-nav-item.active {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }
        .mockup-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.9;
        }
        .mockup-main {
          padding: 28px;
          background:
            radial-gradient(circle at top left, rgba(79, 124, 255, 0.12), transparent 26%),
            linear-gradient(180deg, #fbfcff 0%, #f6f8fd 100%);
        }
        .mockup-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }
        .mockup-title { margin: 8px 0 0; font-size: 34px; line-height: 1.1; color: var(--navy); }
        .mockup-pill {
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(32,164,165,0.12);
          color: #127378;
          font-weight: 700;
        }
        .mockup-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }
        .mockup-stat-card, .mockup-panel, .platform-card, .journey-card, .feature-card, .download-card, .contact-card {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(24,32,51,0.07);
          border-radius: 22px;
          box-shadow: var(--shadow-soft);
        }
        .mockup-stat-card {
          padding: 18px;
          display: grid;
          gap: 10px;
        }
        .mockup-stat-card strong { font-size: 24px; color: var(--navy); }
        .mockup-panels {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 16px;
        }
        .mockup-panel { padding: 20px; }
        .mockup-panel.soft { background: linear-gradient(180deg, rgba(244,247,255,0.98), rgba(255,255,255,0.9)); }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 16px;
        }
        .task-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid rgba(24,32,51,0.07);
          color: var(--muted);
          font-weight: 600;
        }
        .task-check {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 2px solid rgba(79,124,255,0.42);
          background: linear-gradient(135deg, rgba(79,124,255,0.16), rgba(122,152,255,0.22));
        }
        .progress-row {
          display: grid;
          gap: 10px;
          padding: 12px 0;
          color: var(--muted);
          font-weight: 600;
        }
        .progress-track {
          width: 100%;
          height: 10px;
          border-radius: 999px;
          background: rgba(24,32,51,0.08);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--blue) 0%, #7a98ff 100%);
        }
        .w-82 { width: 82%; }
        .w-64 { width: 64%; }
        .w-48 { width: 48%; }
        .mobile-preview {
          position: absolute;
          right: -18px;
          bottom: -28px;
        }
        .phone-bezel {
          width: 220px;
          padding: 10px;
          background: #1d2842;
          border-radius: 34px;
          box-shadow: 0 30px 60px rgba(24, 32, 51, 0.22);
        }
        .phone-notch {
          width: 40%;
          height: 22px;
          border-radius: 0 0 18px 18px;
          background: #1d2842;
          margin: 0 auto -16px;
          position: relative;
          z-index: 2;
        }
        .phone-screen {
          min-height: 376px;
          border-radius: 26px;
          padding: 20px;
          background: linear-gradient(180deg, #fefefe 0%, #eff3fe 100%);
        }
        .phone-card {
          padding: 18px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(79,124,255,0.16), rgba(122,152,255,0.28));
          margin-bottom: 14px;
        }
        .phone-card h4 { margin: 10px 0 0; font-size: 24px; line-height: 1.1; color: var(--navy); }
        .phone-stack { display: grid; gap: 10px; }
        .phone-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(24,32,51,0.06);
          font-weight: 700;
          color: var(--navy);
        }
        .section {
          padding: 46px 0;
        }
        .section-heading {
          max-width: 760px;
          margin: 0 auto 22px;
          text-align: center;
        }
        .section-kicker {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(29, 40, 66, 0.06);
          color: var(--blue-dark);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .section-heading h2 {
          margin: 0 0 14px;
          font-size: clamp(2rem, 5vw, 3.5rem);
          line-height: 1.08;
          letter-spacing: -0.04em;
          color: var(--navy);
        }
        .section-heading p {
          margin: 0 auto;
          max-width: 760px;
          color: var(--muted);
          font-size: 18px;
          line-height: 1.75;
        }
        .journey-grid, .feature-grid, .platform-grid, .download-grid, .footer-grid {
          display: grid;
          gap: 18px;
        }
        .journey-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .journey-card, .download-card, .contact-card { padding: 28px; }
        .journey-card .eyebrow {
          margin: 0 0 12px;
          color: var(--blue-dark);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .journey-card h3, .download-card h3, .contact-card h3 {
          margin: 0 0 12px;
          font-size: 28px;
          line-height: 1.15;
          color: var(--navy);
          letter-spacing: -0.03em;
        }
        .journey-card p, .download-card p, .contact-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.8;
          font-size: 16px;
        }
        .feature-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .feature-card {
          padding: 24px;
          min-height: 240px;
        }
        .feature-accent {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          margin-bottom: 22px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.35);
        }
        .feature-card h3 {
          margin: 0 0 12px;
          font-size: 22px;
          color: var(--navy);
          letter-spacing: -0.02em;
        }
        .feature-card p {
          margin: 0;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.75;
        }
        .platform-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .platform-card {
          padding: 24px;
          min-height: 220px;
          display: grid;
          gap: 14px;
        }
        .platform-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .platform-icon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(79,124,255,0.12), rgba(32,164,165,0.18));
          color: var(--blue-dark);
          font-weight: 900;
        }
        .platform-card h3 {
          margin: 0;
          font-size: 24px;
          color: var(--navy);
        }
        .platform-card strong {
          color: var(--navy);
          font-size: 15px;
        }
        .platform-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.75;
        }
        .download-grid {
          grid-template-columns: 1.1fr 0.9fr;
          align-items: stretch;
        }
        .download-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 24px;
        }
        .download-button {
          border: 1px solid rgba(24,32,51,0.08);
          background: #fff;
          color: var(--navy);
          box-shadow: var(--shadow-soft);
        }
        .download-button.primary {
          background: linear-gradient(135deg, var(--navy) 0%, #30405f 100%);
          color: #fff;
          border-color: transparent;
        }
        .download-button.muted {
          opacity: 0.78;
        }
        .download-side {
          display: grid;
          gap: 18px;
        }
        .qr-shell {
          width: 180px;
          padding: 18px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,255,0.96));
          border: 1px solid rgba(24,32,51,0.08);
          box-shadow: var(--shadow-soft);
          display: grid;
          gap: 14px;
          place-items: center;
        }
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 4px;
          width: 100%;
          aspect-ratio: 1 / 1;
        }
        .qr-cell {
          border-radius: 3px;
          background: rgba(24, 32, 51, 0.08);
        }
        .qr-cell.filled {
          background: var(--navy);
        }
        .qr-label {
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }
        .download-note {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
        }
        .download-note strong {
          font-size: 18px;
          color: var(--navy);
        }
        .download-note p {
          margin: 0;
          color: var(--muted);
          line-height: 1.75;
        }
        .site-footer {
          padding: 34px 0 48px;
        }
        .footer-grid {
          grid-template-columns: 1.1fr 0.8fr 0.8fr;
          align-items: start;
        }
        .footer-brand .brand-wordmark { font-size: 28px; }
        .footer-brand-copy {
          margin-top: 14px;
          max-width: 360px;
          color: var(--muted);
          line-height: 1.75;
        }
        .footer-links h4, .footer-meta h4 {
          margin: 0 0 14px;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        .footer-links, .footer-meta {
          display: grid;
          gap: 12px;
          color: var(--navy);
          font-weight: 600;
        }
        .footer-meta p {
          margin: 0;
          color: var(--muted);
          line-height: 1.75;
        }
        @media (max-width: 1080px) {
          .hero-grid, .download-grid, .footer-grid, .journey-grid, .feature-grid, .platform-grid, .mockup-panels, .mockup-stats {
            grid-template-columns: 1fr;
          }
          .hero-copy { padding-bottom: 0; }
          .hero-mockup { padding-left: 0; }
          .mobile-preview { position: relative; right: 0; bottom: 0; margin-top: 18px; display: flex; justify-content: center; }
          .mockup-shell { grid-template-columns: 1fr; min-height: auto; }
          .mockup-sidebar { border-bottom: 1px solid rgba(255,255,255,0.08); }
        }
        @media (max-width: 820px) {
          .top-nav-inner {
            min-height: 72px;
            flex-wrap: wrap;
            justify-content: center;
            padding: 12px 0;
          }
          .nav-links {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            gap: 18px;
            order: 3;
            font-size: 14px;
          }
          .brand-wordmark, .footer-brand .brand-wordmark { font-size: 26px; letter-spacing: 0.14em; }
          .section-shell { width: min(var(--max), calc(100% - 24px)); }
          .hero { padding-top: 28px; }
          .hero-title { max-width: none; }
          .download-actions, .hero-actions { flex-direction: column; align-items: stretch; }
          .button-primary, .button-secondary, .download-button, .nav-login { width: 100%; }
          .qr-shell { width: 100%; max-width: 220px; }
        }
      `}</style>
      <div className="landing-page">
        <header className="top-nav">
          <div className="top-nav-inner">
            <a className="brand" href="/">
              <img alt="Ownly" className="brand-icon" src={logoIconUri} />
              <span className="brand-wordmark">OWNLY</span>
            </a>
            <nav className="nav-links">
              <a href="#product">Product</a>
              <a href="#features">Features</a>
              <a href="#platforms">Platforms</a>
              <a href="#download">Download</a>
              <a href="#contact">Contact</a>
            </nav>
            <a className="nav-login" href="/login">
              Log In
            </a>
          </div>
        </header>

        <main>
          <section className="hero">
            <div className="section-shell hero-grid">
              <div className="hero-copy">
                <span className="hero-kicker">Personal life management, rethought</span>
                <h1 className="hero-title">Run your life from one calm, focused dashboard.</h1>
                <p className="hero-text">
                  Ownly is your premium personal management app for tasks, weight, exercise, diet,
                  and routines — designed to make daily planning feel clear, elegant, and actually
                  sustainable.
                </p>
                <div className="hero-actions">
                  <a className="button-primary" href="/login">
                    Open the web app
                  </a>
                  <a className="button-secondary" href="/download/ownly.dmg">
                    Download for Mac
                  </a>
                </div>
                <div className="hero-proof">
                  <span>Tasks + wellness in one place</span>
                  <span>Web, Mac, and iPhone access</span>
                  <span>Built for a cleaner daily rhythm</span>
                </div>
              </div>
              <DevicePreview />
            </div>
          </section>

          <section className="section" id="product">
            <div className="section-shell">
              <div className="section-heading">
                <span className="section-kicker">Why Ownly</span>
                <h2>Your personal operating system for getting life together.</h2>
                <p>
                  Ownly combines planning and self-tracking in one refined experience, so your to-do
                  list, routines, health progress, and daily focus stop living in separate apps.
                </p>
              </div>
              <div className="journey-grid">
                {journeyCards.map((card) => (
                  <article key={card.title} className="journey-card">
                    <p className="eyebrow">{card.eyebrow}</p>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section" id="features">
            <div className="section-shell">
              <div className="section-heading">
                <span className="section-kicker">Features</span>
                <h2>Everything you need for a more intentional daily system.</h2>
                <p>
                  Organize priorities, log your health progress, and keep your daily rhythm visible
                  with thoughtful tools designed to work together.
                </p>
              </div>
              <div className="feature-grid">
                {featureCards.map((feature) => (
                  <article key={feature.title} className="feature-card">
                    <div className="feature-accent" style={{ background: `linear-gradient(135deg, ${feature.accent}22, ${feature.accent}66)` }} />
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section" id="platforms">
            <div className="section-shell">
              <div className="section-heading">
                <span className="section-kicker">Cross-platform</span>
                <h2>Pick up where you left off on web, Mac, and iPhone.</h2>
                <p>
                  Ownly is designed for the way real life moves: browser planning at your desk, deep
                  focus on Mac, and quick updates from your phone throughout the day.
                </p>
              </div>
              <div className="platform-grid">
                {platformCards.map((platform) => (
                  <article key={platform.title} className="platform-card">
                    <div className="platform-top">
                      <div>
                        <h3>{platform.title}</h3>
                        <strong>{platform.subtitle}</strong>
                      </div>
                      <div className="platform-icon">{platform.title.slice(0, 1)}</div>
                    </div>
                    <p>{platform.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section" id="download">
            <div className="section-shell download-grid">
              <article className="download-card">
                <span className="section-kicker">Download Ownly</span>
                <h3>Start on the web, then add the devices you use every day.</h3>
                <p>
                  Sign in on the web, download the Mac app, and keep iPhone access one scan away.
                  Placeholder links are ready for your live downloads and store listings.
                </p>
                <div className="download-actions">
                  <a className="download-button primary" href="/download/ownly.dmg">
                    Download DMG for Mac
                  </a>
                  <a className="download-button" href="#">
                    Mac App Store
                  </a>
                  <a className="download-button" href="#">
                    iOS App Store
                  </a>
                </div>
              </article>

              <div className="download-side">
                <article className="contact-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    <QRCodePlaceholder />
                    <div className="download-note">
                      <strong>Scan for iPhone download</strong>
                      <p>
                        Replace this placeholder QR block with your live App Store QR once the iOS
                        listing is ready.
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </main>

        <footer className="site-footer" id="contact">
          <div className="section-shell footer-grid">
            <div>
              <div className="footer-brand">
                <img alt="Ownly" className="brand-icon" src={logoIconUri} />
                <span className="brand-wordmark">OWNLY</span>
              </div>
              <p className="footer-brand-copy">
                Ownly helps you manage tasks, health, routines, and daily momentum in one premium
                personal workspace.
              </p>
            </div>
            <div className="footer-links">
              <h4>Product</h4>
              <a href="/login">Log In</a>
              <a href="/download/ownly.dmg">Download DMG</a>
              <a href="#features">Features</a>
              <a href="#platforms">Platforms</a>
            </div>
            <div className="footer-meta">
              <h4>Contact</h4>
              <a href="mailto:shphfranksun@gmail.com">shphfranksun@gmail.com</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/data-deletion">Data deletion</a>
              <p>Ownly.cloud — a cleaner home for your daily life system.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default function IndexScreen() {
  if (Platform.OS !== 'web') {
    return <Redirect href="/login" />;
  }

  return <OwnlyLandingPage />;
}
