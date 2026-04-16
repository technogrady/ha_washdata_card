// WashData Card — hero-style Lovelace card for the WashData integration
// Collision guard: skip re-registration if another copy already loaded (e.g. bundled with integration)
if (!customElements.get("ha-washdata-card")) {

const CARD_TAG   = "ha-washdata-card";
const EDITOR_TAG = "ha-washdata-card-editor";

// ── State → visual mapping ───────────────────────────────────────────────────
const STATE_META = {
  running:       { r: 76,  g: 175, b: 80,  label: "Running",       active: true  },
  rinsing:       { r: 76,  g: 175, b: 80,  label: "Rinsing",       active: true  },
  spinning:      { r: 56,  g: 142, b: 60,  label: "Spinning",      active: true  },
  starting:      { r: 33,  g: 150, b: 243, label: "Starting",      active: true  },
  ending:        { r: 3,   g: 169, b: 244, label: "Ending",        active: true  },
  anti_wrinkle:  { r: 156, g: 39,  b: 176, label: "Anti-Wrinkle",  active: true  },
  paused:        { r: 255, g: 193, b: 7,   label: "Paused",        active: false },
  interrupted:   { r: 244, g: 67,  b: 54,  label: "Interrupted",   active: false },
  force_stopped: { r: 229, g: 57,  b: 53,  label: "Force Stopped", active: false },
  finished:      { r: 102, g: 187, b: 106, label: "Finished",      active: false },
  idle:          { r: 158, g: 158, b: 158, label: "Idle",          active: false },
  off:           { r: 117, g: 117, b: 117, label: "Off",           active: false },
  unknown:       { r: 117, g: 117, b: 117, label: "Unknown",       active: false },
  unavailable:   { r: 117, g: 117, b: 117, label: "Unavailable",   active: false },
};

const DEFAULT_META = { r: 33, g: 150, b: 243, label: "Active", active: true };

// SVG circle circumference for r=42
const CIRC = 2 * Math.PI * 42; // ≈ 263.89

// ── Entity-suffix auto-discovery ─────────────────────────────────────────────
const SUFFIXES = {
  program_entity: "_washer_program",
  phase_entity:   "_current_phase",
  time_entity:    "_time_remaining",
  total_entity:   "_total_duration",
  pct_entity:     "_cycle_progress",
  power_entity:   "_current_power",
  elapsed_entity: "_elapsed_time",
};

function inferEntityId(stateId, suffix) {
  if (!stateId) return "";
  if (stateId.endsWith("_washer_state")) {
    return stateId.replace("_washer_state", suffix);
  }
  return stateId + suffix;
}

// ── Main card ────────────────────────────────────────────────────────────────
class WashDataCard extends HTMLElement {
  static getStubConfig() {
    return {
      entity: "",
      title: "",
      icon: "mdi:washing-machine",
      show_progress_ring: true,
      show_metrics: true,
      spin_icon: true,
      accent_color: null,
    };
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
    this._cfg = null;
    this._hass = null;
    this._handleClick = () => {
      if (!this._cfg || !this._hass) return;
      const entityId = this._cfg.entity;
      if (!entityId) return;
      const ev = new Event("hass-more-info", { composed: true, bubbles: true });
      ev.detail = { entityId };
      this.dispatchEvent(ev);
    };
  }

  setConfig(config) {
    if (config.entity === undefined || config.entity === null)
      throw new Error("WashData Card: 'entity' is required.");
    this._cfg = { ...WashDataCard.getStubConfig(), ...config };
    if (!this._rendered) this._buildShadow();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() { return 4; }

  // Resolve a sibling entity: use explicit override if present, else auto-infer
  _resolve(key) {
    if (this._cfg[key]) return this._cfg[key];
    return inferEntityId(this._cfg.entity, SUFFIXES[key]);
  }

  _buildShadow() {
    this.shadowRoot.innerHTML = `
<style>
  :host { display: block; }

  ha-card {
    overflow: hidden;
    border-radius: 12px;
    min-height: 260px;
    padding: 0;
    cursor: pointer;
    position: relative;
    background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
    transition: box-shadow 0.3s ease;
    box-sizing: border-box;
  }
  ha-card:hover {
    box-shadow: 0 6px 28px rgba(0,0,0,0.22);
  }

  /* ── Accent bar ── */
  .accent-bar {
    height: 5px;
    width: 100%;
    transition: background 0.6s ease;
  }

  /* ── Content wrapper ── */
  .body {
    padding: 16px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Header row ── */
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-wrap {
    width: 50px;
    height: 50px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.5s ease, box-shadow 0.5s ease;
  }

  .appliance-icon {
    --mdc-icon-size: 26px;
    transition: color 0.5s ease;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .appliance-icon.spinning { animation: spin 2.4s linear infinite; }

  .header-text {
    flex: 1;
    min-width: 0;
  }

  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    line-height: 1.3;
  }

  .program-name {
    font-size: 0.82rem;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 3px;
    line-height: 1.2;
  }

  .state-chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition: background 0.5s ease, color 0.5s ease;
  }

  @keyframes pulse {
    0%   { opacity: 1; }
    50%  { opacity: 0.5; }
    100% { opacity: 1; }
  }
  .state-chip.pulsing { animation: pulse 1.8s ease-in-out infinite; }

  /* ── Middle: ring + phase ── */
  .mid-row {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .ring-wrap {
    position: relative;
    flex-shrink: 0;
    width: 104px;
    height: 104px;
  }

  .ring-wrap svg {
    display: block;
    transform: rotate(-90deg);
  }

  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .ring-pct {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
    color: var(--primary-text-color);
  }

  .ring-sublabel {
    font-size: 0.6rem;
    color: var(--secondary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 3px;
  }

  .phase-wrap {
    flex: 1;
    min-width: 0;
  }

  .phase-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--secondary-text-color);
    margin-bottom: 5px;
  }

  .phase-name {
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Metrics grid ── */
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }

  @media (max-width: 320px) {
    .metrics { grid-template-columns: repeat(2, 1fr); }
  }

  .metric {
    background: rgba(128,128,128,0.08);
    border-radius: 8px;
    padding: 8px 4px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .metric ha-icon {
    --mdc-icon-size: 15px;
    color: var(--secondary-text-color);
  }

  .metric-val {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--primary-text-color);
    line-height: 1.1;
    white-space: nowrap;
  }

  .metric-unit {
    font-size: 0.62rem;
    color: var(--secondary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: center;
  }

  .hidden { display: none !important; }
</style>

<ha-card id="card">
  <div class="accent-bar" id="accent-bar"></div>
  <div class="body">

    <!-- Header -->
    <div class="header">
      <div class="icon-wrap" id="icon-wrap">
        <ha-icon class="appliance-icon" id="appl-icon" icon="mdi:washing-machine"></ha-icon>
      </div>
      <div class="header-text">
        <div class="card-title" id="card-title">WashData</div>
        <div class="program-name" id="program-name"></div>
      </div>
      <div class="state-chip" id="state-chip">—</div>
    </div>

    <!-- Progress ring + phase -->
    <div class="mid-row" id="mid-row">
      <div class="ring-wrap">
        <svg width="104" height="104" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42"
            fill="none" stroke-width="7"
            stroke="var(--divider-color, rgba(128,128,128,0.18))"/>
          <circle id="ring-fg" cx="50" cy="50" r="42"
            fill="none" stroke-width="7" stroke-linecap="round"
            stroke-dasharray="${CIRC.toFixed(2)}"
            stroke-dashoffset="${CIRC.toFixed(2)}"
            style="transition: stroke-dashoffset 0.8s ease, stroke 0.5s ease;"/>
        </svg>
        <div class="ring-center">
          <span class="ring-pct" id="ring-pct">—</span>
          <span class="ring-sublabel">progress</span>
        </div>
      </div>

      <div class="phase-wrap">
        <div class="phase-label">Current phase</div>
        <div class="phase-name" id="phase-name">—</div>
      </div>
    </div>

    <!-- Metrics row -->
    <div class="metrics" id="metrics-grid">
      <div class="metric">
        <ha-icon icon="mdi:timer-outline"></ha-icon>
        <span class="metric-val" id="m-remaining">—</span>
        <span class="metric-unit">min left</span>
      </div>
      <div class="metric">
        <ha-icon icon="mdi:timer-play-outline"></ha-icon>
        <span class="metric-val" id="m-elapsed">—</span>
        <span class="metric-unit">elapsed</span>
      </div>
      <div class="metric">
        <ha-icon icon="mdi:clock-outline"></ha-icon>
        <span class="metric-val" id="m-total">—</span>
        <span class="metric-unit">total min</span>
      </div>
      <div class="metric">
        <ha-icon icon="mdi:lightning-bolt"></ha-icon>
        <span class="metric-val" id="m-power">—</span>
        <span class="metric-unit">watts</span>
      </div>
    </div>

  </div>
</ha-card>
`;

    this.shadowRoot.getElementById("card").addEventListener("click", this._handleClick);
    this._rendered = true;
  }

  _update() {
    if (!this._rendered || !this._hass || !this._cfg) return;

    const sr = this.shadowRoot;
    const entityId = this._cfg.entity;
    const stateObj  = this._hass.states[entityId];

    const titleEl    = sr.getElementById("card-title");
    const iconEl     = sr.getElementById("appl-icon");
    const iconWrap   = sr.getElementById("icon-wrap");
    const stateChip  = sr.getElementById("state-chip");
    const programEl  = sr.getElementById("program-name");
    const phaseEl    = sr.getElementById("phase-name");
    const ringPctEl  = sr.getElementById("ring-pct");
    const ringFgEl   = sr.getElementById("ring-fg");
    const accentBar  = sr.getElementById("accent-bar");
    const midRow     = sr.getElementById("mid-row");
    const metricsEl  = sr.getElementById("metrics-grid");
    const mRemaining = sr.getElementById("m-remaining");
    const mElapsed   = sr.getElementById("m-elapsed");
    const mTotal     = sr.getElementById("m-total");
    const mPower     = sr.getElementById("m-power");

    // ── Title
    titleEl.textContent =
      this._cfg.title ||
      stateObj?.attributes?.friendly_name ||
      entityId;

    if (!stateObj) {
      stateChip.textContent = "Entity not found";
      stateChip.style.cssText = "background:rgba(128,128,128,.15);color:var(--secondary-text-color)";
      stateChip.classList.remove("pulsing");
      return;
    }

    const rawState = (stateObj.state || "unknown").toLowerCase();
    const meta = STATE_META[rawState] || DEFAULT_META;

    // Allow a per-config accent color override (stored as [r,g,b] by ha-form color_rgb)
    const ac = this._cfg.accent_color;
    const { r, g, b } = (Array.isArray(ac) && ac.length >= 3)
      ? { r: ac[0], g: ac[1], b: ac[2] }
      : meta;

    // ── Accent bar
    accentBar.style.background =
      `linear-gradient(90deg, rgb(${r},${g},${b}) 0%, rgba(${r},${g},${b},0.35) 100%)`;

    // ── Icon wrap glow
    iconWrap.style.background = `rgba(${r},${g},${b},0.14)`;
    iconWrap.style.boxShadow  = meta.active
      ? `0 0 0 2px rgba(${r},${g},${b},0.28), 0 0 18px rgba(${r},${g},${b},0.22)`
      : "none";

    // ── Appliance icon
    const icon = this._cfg.icon || stateObj.attributes.icon || "mdi:washing-machine";
    iconEl.setAttribute("icon", icon);
    iconEl.style.color = `rgb(${r},${g},${b})`;
    if (rawState === "running" && this._cfg.spin_icon !== false) {
      iconEl.classList.add("spinning");
    } else {
      iconEl.classList.remove("spinning");
    }

    // ── State chip
    stateChip.textContent = meta.label;
    stateChip.style.background = `rgba(${r},${g},${b},0.15)`;
    stateChip.style.color = `rgb(${r},${g},${b})`;
    if (meta.active) {
      stateChip.classList.add("pulsing");
    } else {
      stateChip.classList.remove("pulsing");
    }

    // ── Program
    const programObj = this._hass.states[this._resolve("program_entity")];
    const programName = programObj?.state ?? "";
    const programOk = programName && !["unknown","none","off","unavailable",""].includes(programName.toLowerCase());
    programEl.textContent = programOk ? programName : "";

    // ── Phase
    const phaseObj  = this._hass.states[this._resolve("phase_entity")];
    const phaseName = phaseObj?.state ?? "";
    const phaseOk   = phaseName && !["unknown","none","off","unavailable",""].includes(phaseName.toLowerCase());
    phaseEl.textContent = phaseOk ? phaseName : "—";

    // ── Progress ring
    const showRing = this._cfg.show_progress_ring !== false;
    midRow.classList.toggle("hidden", !showRing);

    if (showRing) {
      const pctObj = this._hass.states[this._resolve("pct_entity")];
      const pct    = pctObj ? parseFloat(pctObj.state) : NaN;

      if (!isNaN(pct)) {
        const clamped = Math.max(0, Math.min(100, pct));
        ringFgEl.style.strokeDashoffset = (CIRC * (1 - clamped / 100)).toFixed(2);
        ringFgEl.style.stroke = `rgb(${r},${g},${b})`;
        ringPctEl.textContent = `${Math.round(clamped)}%`;
      } else {
        ringFgEl.style.strokeDashoffset = CIRC.toFixed(2);
        ringPctEl.textContent = "—";
      }
    }

    // ── Metrics
    const showMetrics = this._cfg.show_metrics !== false;
    metricsEl.classList.toggle("hidden", !showMetrics);

    if (showMetrics) {
      // Time remaining (minutes)
      const timeObj = this._hass.states[this._resolve("time_entity")];
      const timeVal = timeObj ? parseFloat(timeObj.state) : NaN;
      mRemaining.textContent = !isNaN(timeVal) ? Math.round(timeVal) : "—";

      // Elapsed time (seconds → display as m:ss when ≥ 60 s)
      const elapsedObj = this._hass.states[this._resolve("elapsed_entity")];
      const elapsedSec = elapsedObj ? parseFloat(elapsedObj.state) : NaN;
      if (!isNaN(elapsedSec)) {
        if (elapsedSec >= 60) {
          const m = Math.floor(elapsedSec / 60);
          const s = String(Math.round(elapsedSec % 60)).padStart(2, "0");
          mElapsed.textContent = `${m}:${s}`;
        } else {
          mElapsed.textContent = `${Math.round(elapsedSec)}s`;
        }
      } else {
        mElapsed.textContent = "—";
      }

      // Total duration (minutes)
      const totalObj = this._hass.states[this._resolve("total_entity")];
      const totalVal = totalObj ? parseFloat(totalObj.state) : NaN;
      mTotal.textContent = !isNaN(totalVal) ? Math.round(totalVal) : "—";

      // Current power (W)
      const powerObj = this._hass.states[this._resolve("power_entity")];
      const powerVal = powerObj ? parseFloat(powerObj.state) : NaN;
      mPower.textContent = !isNaN(powerVal) ? Math.round(powerVal) : "—";
    }
  }
}

// ── Visual editor ────────────────────────────────────────────────────────────
class WashDataCardEditor extends HTMLElement {
  setConfig(config) {
    this._cfg = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    if (!this._form) {
      this.shadowRoot.innerHTML = `
        <style>
          .editor { padding: 16px; }
          ha-form { display: block; }
        </style>
        <div class="editor"><div id="form-host"></div></div>
      `;

      this._form = document.createElement("ha-form");
      this.shadowRoot.getElementById("form-host").appendChild(this._form);

      this._form.schema = [
        { name: "title",            label: "Title",                                       selector: { text: {} } },
        { name: "entity",           label: "State Entity (required)",                     selector: { entity: { domain: "sensor" } } },
        { name: "icon",             label: "Icon",                                        selector: { icon: {} } },
        { name: "accent_color",     label: "Accent Color (overrides state color)",        selector: { color_rgb: {} } },
        { name: "show_progress_ring", label: "Show Progress Ring",                        selector: { boolean: {} } },
        { name: "show_metrics",     label: "Show Metrics Grid",                           selector: { boolean: {} } },
        { name: "spin_icon",        label: "Spin Icon While Running",                     selector: { boolean: {} } },
        { name: "program_entity",   label: "Program Entity (auto-detected)",              selector: { entity: { domain: ["sensor", "select"] } } },
        { name: "phase_entity",     label: "Phase Entity (auto-detected)",                selector: { entity: { domain: "sensor" } } },
        { name: "time_entity",      label: "Time Remaining Entity (auto-detected)",       selector: { entity: { domain: "sensor" } } },
        { name: "total_entity",     label: "Total Duration Entity (auto-detected)",       selector: { entity: { domain: "sensor" } } },
        { name: "pct_entity",       label: "Progress % Entity (auto-detected)",           selector: { entity: { domain: "sensor" } } },
        { name: "power_entity",     label: "Power Entity (auto-detected)",                selector: { entity: { domain: "sensor" } } },
        { name: "elapsed_entity",   label: "Elapsed Time Entity (auto-detected)",         selector: { entity: { domain: "sensor" } } },
      ];

      this._form.computeLabel = (schema) => schema.label || schema.name;

      this._form.addEventListener("value-changed", (ev) => {
        if (!this._cfg || !this._hass) return;
        this._cfg = { ...this._cfg, ...ev.detail.value };
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: this._cfg },
          bubbles: true,
          composed: true,
        }));
      });
    }

    this._form.data = this._cfg;
    if (this._hass) this._form.hass = this._hass;
  }
}

// ── Registration ─────────────────────────────────────────────────────────────
customElements.define(CARD_TAG,   WashDataCard);
customElements.define(EDITOR_TAG, WashDataCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: "WashData Card",
  preview: true,
  description:
    "Hero-style dashboard card for WashData appliances. " +
    "Shows state, program, phase, circular progress ring, " +
    "time remaining, elapsed, total duration, and power.",
});

} // end collision guard
