import { ThemeSwitcher } from './ThemeSwitcher';
import { LobbyPreview } from './LobbyPreview';
import { PokerPreview } from './PokerPreview';
import { RetroPreview } from './RetroPreview';
import { ComponentGallery } from './ComponentGallery';

export function PreviewApp() {
  return (
    <div className="preview-app">
      <header className="preview-header">
        <div>
          <h1>🎨 Grooming Kit — UI Preview</h1>
          <a className="back-link" href="/">
            ← Back to app
          </a>
        </div>
        <ThemeSwitcher />
      </header>

      <p>
        Live, fully interactive previews of the real components (no server connection needed) — pick a
        theme above and try voting, revealing, and adding retro cards below. Whatever theme you land on
        persists to the real app too.
      </p>

      <section className="preview-section">
        <h2>Lobby</h2>
        <LobbyPreview />
      </section>

      <section className="preview-section">
        <h2>Scrum Poker</h2>
        <PokerPreview />
      </section>

      <section className="preview-section">
        <h2>Sprint Retro</h2>
        <RetroPreview />
      </section>

      <section className="preview-section">
        <h2>Component gallery</h2>
        <ComponentGallery />
      </section>
    </div>
  );
}
