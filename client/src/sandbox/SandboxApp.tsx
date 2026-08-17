import { ThemeSwitcher } from './ThemeSwitcher';
import { LobbySandbox } from './LobbySandbox';
import { PokerSandbox } from './PokerSandbox';
import { RetroSandbox } from './RetroSandbox';
import { ComponentGallery } from './ComponentGallery';

export function SandboxApp() {
  return (
    <div className="sandbox-app">
      <header className="sandbox-header">
        <div>
          <h1>🎨 Grooming Kit — UI Sandbox</h1>
          <a className="back-link" href="/">
            ← Back to app
          </a>
        </div>
        <ThemeSwitcher />
      </header>

      <p>
        Live, fully interactive sandboxes of the real components (no server connection needed) — pick a
        theme above and try voting, revealing, and adding retro cards below. Whatever theme you land on
        persists to the real app too.
      </p>

      <section className="sandbox-section">
        <h2>Lobby</h2>
        <LobbySandbox />
      </section>

      <section className="sandbox-section">
        <h2>Scrum Poker</h2>
        <PokerSandbox />
      </section>

      <section className="sandbox-section">
        <h2>Sprint Retro</h2>
        <RetroSandbox />
      </section>

      <section className="sandbox-section">
        <h2>Component gallery</h2>
        <ComponentGallery />
      </section>
    </div>
  );
}
