// 0KAY dark mode — theme engine.
//
// Deliberately dependency-free (no `import`/`export`, wrapped in an IIFE) so it
// can be loaded three ways and still work:
//   1. `<script type="module" src="/api/plugins/darkmode/ui/theme.js">` from the
//      WebUI boot hook — must NOT touch `vue`, it may run before the host bridge
//      (`window.__0KAY_VUE__`) exists;
//   2. the appearance page (`index.js`) which imports it for the side effect;
//   3. a classic `<script>` tag, if a host prefers that.
// Re-running is harmless — the install path is idempotent.

;(function () {
  var STORE_KEY = '0kay_theme_mode'
  var STYLE_ID = '0kay-darkmode-style'
  var MODES = ['auto', 'light', 'dark']

  var DARK_CSS = `
/* ============ 0KAY dark theme (plugin: darkmode) ============ */

html[data-theme="dark"]{color-scheme:dark}
html[data-theme="light"]{color-scheme:light}

/* --- MD3 dark tokens (derived from the refined #4d5d91 primary) --- */
html[data-theme="dark"]{
  --md-primary:#b3c0ea;
  --md-on-primary:#1a2138;
  --md-primary-container:#2c3760;
  --md-on-primary-container:#dde3fa;
  --md-primary-fixed:#dde3fa;
  --md-secondary:#bcc7dc;
  --md-on-secondary:#18202f;
  --md-secondary-container:#333c52;
  --md-on-secondary-container:#d9e2f5;
  --md-tertiary:#d3a8cc;
  --md-on-tertiary:#331a2c;
  --md-tertiary-container:#4a2f45;
  --md-on-tertiary-container:#f5dcef;
  --md-error:#ffb4ab;
  --md-on-error:#680004;
  --md-error-container:#93010a;
  --md-on-error-container:#ffdad6;
  --md-surface:#14161d;
  --md-surface-dim:#14161d;
  --md-surface-bright:#363b47;
  --md-surface-container-lowest:#0e1015;
  --md-surface-container-low:#1a1d25;
  --md-surface-container:#1e212a;
  --md-surface-container-high:#282c36;
  --md-surface-container-highest:#333843;
  --md-on-surface:#e3e6ee;
  --md-on-surface-variant:#c0c6d4;
  --md-outline:#8b91a1;
  --md-outline-variant:#43485a;
  --md-inverse-surface:#e3e6ee;
  --md-inverse-on-surface:#1e212a;
  --md-inverse-primary:#4d5d91;
  --md-success:#7fd7a0;
  --md-success-container:#1e4d34;
  --md-on-success-container:#c8f5d9;
  --md-warning:#ffb960;
  --md-warning-container:#5c3c00;
  --md-on-warning-container:#ffe0b3;
  --md-scrim:rgba(0,0,0,.62);

  /* legacy aliases still referenced by host components */
  --brand-hover:#c3cdec;
  --brand-active:#d5dcf6;
  --neutral-gray-50:#c2c7d4;
  --neutral-gray-60:#a5abb9;
  --neutral-gray-70:#e3e6ee;
  --neutral-gray-80:#eef1f7;
  --neutral-gray-90:#f5f7fb;
  --neutral-gray-100:#ffffff;

  /* elevation: purple-tinted light shadows read as nothing on dark */
  --shadow-1:0 2px 8px rgba(0,0,0,.45);
  --shadow-2:0 6px 22px rgba(0,0,0,.50);
  --shadow-3:0 14px 44px rgba(0,0,0,.55);
  --shadow-4:0 22px 60px rgba(0,0,0,.60);
  --shadow-8:0 8px 12px 6px rgba(0,0,0,.50),0 4px 4px rgba(0,0,0,.60);
  --shadow-16:0 12px 17px 8px rgba(0,0,0,.50),0 6px 6px rgba(0,0,0,.60);
}

/* --- Hard-coded light greys in theme.css (refined + expressive layers) --- */
html[data-theme="dark"] #app .nav-rail{background:var(--md-surface-container)}
html[data-theme="dark"] #app .sessions{background:var(--md-surface-container)}
html[data-theme="dark"] #app .host-panel,
html[data-theme="dark"] #app .character-profile{background:var(--md-surface-container)}
html[data-theme="dark"] #app .usage-ring b{background:var(--md-surface-container)}
html[data-theme="dark"] #app :is(.modal-backdrop,.directory-backdrop){background:rgba(0,0,0,.62)}
html[data-theme="dark"] #app .composer{box-shadow:0 4px 20px rgba(0,0,0,.45)}
html[data-theme="dark"] #app select:not([multiple]){
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='m6 9 6 6 6-6' stroke='%23c0c6d4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

/* --- settings.css: OS media query must not fight an explicit choice --- */
html[data-theme="dark"] .provider-logo{background:var(--md-surface-container-high)}
html[data-theme="light"] .provider-logo{background:#ffffff}
html[data-theme="light"] .error-message,
html[data-theme="light"] .danger-box{color:#410e0b}

/* --- Fixed text colors baked into AboutPanel / UsagePage / SetupWizard --- */
html[data-theme="dark"] .status-hero.ok,
html[data-theme="dark"] .apply-banner.done,
html[data-theme="dark"] .tile.good,
html[data-theme="dark"] .status-chip.ok,
html[data-theme="dark"] .step.done .step-ind,
html[data-theme="dark"] .banner.ok{color:var(--md-on-success-container,#c8f5d9)}
html[data-theme="dark"] .apply-banner.failed,
html[data-theme="dark"] .banner.err,
html[data-theme="dark"] .stage-status.warn{color:var(--md-on-error-container,#ffdad6)}
html[data-theme="dark"] .status-hero.warn,
html[data-theme="dark"] .status-chip.warn{
  background:var(--md-warning-container,#5c3c00);
  color:var(--md-on-warning-container,#ffe0b3);
}

/* --- Live2D stage backdrop --- */
html[data-theme="dark"] .stage-viewport{
  background:
    radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--mood,#6750A4) 26%,transparent),transparent 55%),
    radial-gradient(circle at 70% 80%,color-mix(in srgb,var(--mood,#6750A4) 14%,transparent),transparent 50%),
    linear-gradient(180deg,#1c1f2b 0%,#14161d 55%,#2c376033 100%);
}

/* --- Mood / energy colors are inline styles from stores/life.ts; lift them --- */
html[data-theme="dark"] .mood-icon,
html[data-theme="dark"] .mood-label,
html[data-theme="dark"] .emotion{filter:brightness(1.5) saturate(.85)}
html[data-theme="dark"] .energy-fill,
html[data-theme="dark"] .emotion-fill{filter:brightness(1.25) saturate(.9)}
`

  function media() {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null
  }

  function systemDark() {
    var m = media()
    return !!(m && m.matches)
  }

  function readMode() {
    try {
      var v = localStorage.getItem(STORE_KEY)
      if (v && MODES.indexOf(v) >= 0) return v
    } catch (e) { /* private mode / storage disabled */ }
    return 'auto'
  }

  function writeMode(mode) {
    try { localStorage.setItem(STORE_KEY, mode) } catch (e) { /* ignore */ }
  }

  /** Resolve "auto" against the OS preference. */
  function resolve(mode) {
    return mode === 'auto' ? (systemDark() ? 'dark' : 'light') : mode
  }

  /** Install the sheet once; it only activates under [data-theme="dark"]. */
  function ensureSheet() {
    if (typeof document === 'undefined') return
    var el = document.getElementById(STYLE_ID)
    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ID
      document.head.appendChild(el)
    }
    if (el.textContent !== DARK_CSS) el.textContent = DARK_CSS
  }

  function apply(mode) {
    if (typeof document === 'undefined') return resolve(mode)
    ensureSheet()
    var next = resolve(mode)
    var root = document.documentElement
    if (root.dataset.theme !== next) root.dataset.theme = next
    return next
  }

  var listening = false
  function listen() {
    if (listening) return
    var m = media()
    if (!m) return
    listening = true
    var onChange = function () { if (readMode() === 'auto') apply('auto') }
    if (typeof m.addEventListener === 'function') m.addEventListener('change', onChange)
    else if (typeof m.addListener === 'function') m.addListener(onChange)
  }

  /** Idempotent: apply the saved mode and follow the OS when mode is "auto". */
  function install() {
    apply(readMode())
    listen()
  }

  var api = {
    getMode: readMode,
    resolved: function () { return resolve(readMode()) },
    setMode: function (mode) {
      var m = MODES.indexOf(mode) >= 0 ? mode : 'auto'
      writeMode(m)
      return apply(m)
    },
    toggle: function () {
      return api.setMode(resolve(readMode()) === 'dark' ? 'light' : 'dark')
    },
    apply: apply,
    install: install,
  }

  if (typeof window !== 'undefined') {
    window.__0KAY_THEME__ = api
    install()
  }
})()
