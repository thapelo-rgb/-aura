// Single source of truth for AURA's DOM tree. app.js injects this into <body>,
// so the Perchance page and the APK shell render the exact same UI.

const ICON_APPS = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="6" r="2.1"></circle><circle cx="12" cy="6" r="2.1"></circle><circle cx="18" cy="6" r="2.1"></circle><circle cx="6" cy="12" r="2.1"></circle><circle cx="12" cy="12" r="2.1"></circle><circle cx="18" cy="12" r="2.1"></circle><circle cx="6" cy="18" r="2.1"></circle><circle cx="12" cy="18" r="2.1"></circle><circle cx="18" cy="18" r="2.1"></circle></svg>';
const ICON_WALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3.4"></rect><circle cx="8.6" cy="9.4" r="1.7" fill="currentColor" stroke="none"></circle><path d="M3.6 17.4l4.9-5 3.4 3.4 3.1-2.9 5.4 5.2"></path></svg>';

export const MARKUP = `
<div id="stage">
  <div id="device">
    <div id="screen">

      <canvas id="bgCanvas"></canvas>
      <div id="bgImage"><div id="bgImageInner"></div></div>
      <div id="bgScrim"></div>
      <div id="vignette"></div>
      <canvas id="fxCanvas"></canvas>
      <div id="grain"></div>

      <div id="statusbar">
        <span id="sbTime">--:--</span>
        <span class="status-right">
          <span class="sb-mode" id="sbMode">FULL</span>
          <span id="sbBattery">--%</span>
        </span>
      </div>

      <main id="views">
        <section class="view is-active" id="view-home" data-view="home">
          <header class="topbar">
            <div class="brand"><span class="dot-mark"></span>AURA</div>
            <span class="sb-mode top-mode" id="topMode">FULL</span>
            <button class="icon-btn" id="settingsBtn" aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3.2"></circle>
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"></path>
              </svg>
            </button>
          </header>
          <div id="widgetLayer"></div>
          <div class="hint" id="homeHint">long-press to arrange &middot; swipe up for apps</div>
          <div id="homeSwipe" aria-hidden="true"></div>
          <div id="dock">
            <button class="dock-btn" data-dock="apps" style="--c:#9fb4ff" aria-label="All apps">${ICON_APPS}</button>
            <button class="dock-btn" data-dock="wallpaper" style="--c:#7cf0d0" aria-label="Wallpaper">${ICON_WALL}</button>
            <button class="dock-btn" data-dock="widgets" style="--c:#7c9cff" aria-label="Widgets">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="2"></rect><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"></rect><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"></rect><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"></rect></svg>
            </button>
            <button class="dock-btn" data-dock="motion" style="--c:#8ce0c8" aria-label="Motion">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12c2 0 2.2-5 4.2-5s2.1 10 4.1 10 2.3-7 4.3-7 2.2 2 4.4 2"></path></svg>
            </button>
            <button class="dock-btn" data-dock="theme" style="--c:#ffc978" aria-label="Theme">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><circle cx="9" cy="9.5" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="15" cy="9.5" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="9.5" cy="15" r="1.4" fill="currentColor" stroke="none"></circle></svg>
            </button>
          </div>
        </section>

        <section class="view" id="view-apps" data-view="apps">
          <header class="topbar">
            <h2>All apps</h2>
            <span class="count" id="appCount"></span>
          </header>
          <div class="scroll">
            <div class="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.4 15.4L21 21"></path></svg>
              <input id="appSearch" type="search" placeholder="Search apps" autocomplete="off" spellcheck="false" />
            </div>
            <div class="app-grid" id="appGrid"></div>
            <p class="lede" id="appEmpty" hidden></p>
          </div>
        </section>

        <section class="view" id="view-wallpaper" data-view="wallpaper">
          <header class="topbar">
            <h2>Wallpaper</h2>
            <span class="count" id="wpCount"></span>
          </header>
          <div class="scroll">
            <div id="wpCurrent"></div>

            <div class="seg" id="wpSeg">
              <button class="seg-btn is-active" data-src="builtin">Built-in</button>
              <button class="seg-btn" data-src="mine">My photos</button>
              <button class="seg-btn" data-src="link">Link</button>
            </div>

            <div class="wp-pane" id="wpPaneBuiltin">
              <div class="section-head"><h3>Animated styles</h3></div>
              <div class="catalog" id="wpStyles"></div>
              <div class="section-head">
                <h3>Wallpaper pack</h3>
                <span class="count" id="wpPackCount"></span>
              </div>
              <div class="chips" id="wpFilter"></div>
              <div class="wp-grid" id="wpPack"></div>
              <div class="wp-more"><button class="ghost-btn" id="wpMoreBtn">show more</button></div>
            </div>

            <div class="wp-pane" id="wpPaneMine" hidden>
              <p class="lede">Your own pictures. They stay on this phone — nothing is uploaded.</p>
              <div class="wp-actions">
                <button class="primary-btn" id="wpAddBtn">add from gallery</button>
                <button class="ghost-btn" id="wpFileBtn">choose a file</button>
              </div>
              <div class="wp-grid" id="wpMineGrid"></div>
              <p class="lede" id="wpMineEmpty" hidden>No photos yet. Add a few and they show up here.</p>
            </div>

            <div class="wp-pane" id="wpPaneLink" hidden>
              <p class="lede">Paste an image address. In Pinterest, long-press a pin and copy the image link.</p>
              <div class="wp-link">
                <input id="wpUrlInput" type="url" inputmode="url" placeholder="https://..." autocomplete="off" spellcheck="false" />
                <button class="primary-btn" id="wpUrlBtn">use</button>
              </div>
              <div class="wp-note" id="wpUrlNote"></div>
            </div>

            <div class="section-head"><h3>Look</h3></div>
            <div class="controls" id="wpControls"></div>

            <div class="section-head" id="wpHomeHead" hidden><h3>Home screen</h3></div>
            <div class="rows" id="wpHomeRow" hidden></div>
          </div>
        </section>

        <section class="view" id="view-widgets" data-view="widgets">
          <header class="topbar"><h2>Widgets</h2><span class="count" id="widgetCount">0</span></header>
          <div class="scroll">
            <p class="lede">Floating glass cards. Tap to add, then drag them anywhere on Home.</p>
            <div class="catalog" id="widgetCatalog"></div>
            <div class="section-head"><h3>On your home</h3><button class="ghost-btn" id="clearWidgetsBtn">clear all</button></div>
            <div class="rows" id="widgetActive"></div>
          </div>
        </section>

        <section class="view" id="view-effects" data-view="effects">
          <header class="topbar"><h2>Effects</h2></header>
          <div class="scroll">
            <p class="lede">Little effects that make the screen feel alive.</p>
            <div class="rows" id="effectRows"></div>
            <div class="controls" id="effectControls"></div>
          </div>
        </section>

        <section class="view" id="view-motion" data-view="motion">
          <header class="topbar"><h2>Motion</h2></header>
          <div class="scroll">
            <p class="lede">How widgets arrive on screen. Pick a preset or build your own keyframes.</p>
            <div class="catalog" id="animPresets"></div>
            <div class="section-head"><h3>Custom keyframes</h3><button class="primary-btn" id="animPlayBtn">play</button></div>
            <div class="studio" id="keyframeStudio"></div>
          </div>
        </section>

        <section class="view" id="view-theme" data-view="theme">
          <header class="topbar"><h2>Theme</h2></header>
          <div class="scroll">
            <p class="lede">One look, everywhere. Presets first, then fine-tune.</p>
            <div class="catalog" id="themePresets"></div>
            <div class="section-head"><h3>Wallpaper</h3><button class="ghost-btn" id="themeWallpaperBtn">open</button></div>
            <div class="catalog" id="bgStyles"></div>
            <div class="section-head"><h3>Fine-tune</h3></div>
            <div class="controls" id="themeControls"></div>
            <div class="share-row">
              <button class="ghost-btn" id="exportBtn">export</button>
              <button class="ghost-btn" id="importBtn">import</button>
              <button class="ghost-btn" id="shareLinkBtn">share link</button>
            </div>
          </div>
        </section>
      </main>

      <nav id="nav">
        <button class="nav-btn is-active" data-view="home">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path></svg>
          <span>Home</span>
        </button>
        <button class="nav-btn" data-view="wallpaper">
          ${ICON_WALL}
          <span>Wall</span>
        </button>
        <button class="nav-btn" data-view="widgets">
          <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.5" height="7.5" rx="2"></rect><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"></rect><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"></rect><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"></rect></svg>
          <span>Widgets</span>
        </button>
        <button class="nav-btn" data-view="effects">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 2l1.8 5.2L18 9l-5.2 1.8L11 16l-1.8-5.2L4 9l5.2-1.8z"></path><circle cx="18.5" cy="17.5" r="2.2"></circle></svg>
          <span>Effects</span>
        </button>
        <button class="nav-btn" data-view="motion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12c2 0 2.2-5 4.2-5s2.1 10 4.1 10 2.3-7 4.3-7 2.2 2 4.4 2"></path></svg>
          <span>Motion</span>
        </button>
        <button class="nav-btn" data-view="theme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><circle cx="9" cy="9.5" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="15" cy="9.5" r="1.4" fill="currentColor" stroke="none"></circle><circle cx="9.5" cy="15" r="1.4" fill="currentColor" stroke="none"></circle></svg>
          <span>Theme</span>
        </button>
      </nav>

      <div id="sheetBackdrop" hidden></div>
      <div id="sheet" hidden>
        <header class="sheet-head">
          <h2>Settings</h2>
          <button class="icon-btn" id="sheetClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
          </button>
        </header>
        <div class="scroll">
          <div class="section-head"><h3>Device compatibility</h3></div>
          <div id="compatPanel"></div>
          <div class="section-head"><h3>Motion mode</h3></div>
          <p class="lede">If the full experience isn't available, AURA falls back gracefully.</p>
          <div class="rows" id="modeRows"></div>
          <div id="sheetHomeBlock" hidden>
            <div class="section-head"><h3>Home screen</h3></div>
            <div class="rows" id="sheetHomeRow"></div>
          </div>
          <div class="section-head"><h3>About</h3></div>
          <div id="aboutPanel" class="about"></div>
          <button class="danger-btn" id="resetBtn">reset everything</button>
        </div>
      </div>

      <div id="toast" hidden></div>
    </div>
  </div>
</div>
`;
