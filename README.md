![HACS](https://img.shields.io/github/actions/workflow/status/technogrady/ha_washdata_card/validate.yml?label=HACS)
![Latest](https://img.shields.io/github/v/release/technogrady/ha_washdata_card)

# WashData Card

A custom Home Assistant **Lovelace dashboard card** for the
[WashData integration](https://github.com/3dg1luk43/ha_washdata).

The card renders a large **hero view** that surfaces everything WashData
exposes — current state, program, cycle phase, a circular progress ring,
time remaining, elapsed time, total predicted duration, and live power — in a
single glanceable card with state-aware color accents.

---

## Features

- **Hero layout** — large card (min 260 px) with a full-width accent bar that
  shifts color based on the appliance state.
- **Circular SVG progress ring** — big percentage in the center, smooth
  animated fill as the cycle advances.
- **State chip** — shows the current state label; pulses when the machine is
  actively running.
- **Appliance icon** — glow ring and optional spin animation while running.
- **Program + phase** — program name prominent, current phase as a secondary
  label beside the ring.
- **4-metric grid** — Time Left · Elapsed · Total Duration · Power, each with
  icon, value, and unit.
- **Auto-discovery** — set `entity` (the `_washer_state` sensor) and all
  sibling sensors are detected automatically. Every sensor can be overridden
  explicitly.
- **Visual editor** — full `ha-form`-based GUI in the dashboard card picker;
  no YAML required.
- **Tap to more-info** — tapping the card opens the standard HA detail dialog
  for the state entity.
- **Collision-safe** — a `customElements.get()` guard means it coexists safely
  with the card copy bundled inside the WashData integration.
- **HA theme-aware** — honours `--ha-card-background`, `--primary-text-color`,
  `--secondary-text-color`, `--divider-color`, and other standard CSS vars.

---

## Installation

### Option A: HACS (Recommended)

1. Open HACS in Home Assistant.
2. Go to **Frontend** (or **Dashboards** depending on your HACS version).
3. Click the **⋮** menu in the top right and choose **Custom repositories**.
4. Add this repository:
   - **Repository:** `https://github.com/technogrady/ha_washdata_card`
   - **Category:** `Lovelace` (Dashboard / Plugin)
5. Click **Add**, then search for **"WashData Card"** and click **Download**.
6. HACS registers the resource automatically. If it does not, add it manually
   under **Settings → Dashboards → Resources**:
   - **URL:** `/hacsfiles/ha_washdata_card/ha-washdata-card.js`
   - **Resource type:** `JavaScript Module`
7. Hard-refresh your browser (`Ctrl`/`Cmd` + `Shift` + `R`).

### Option B: Manual

1. Download `ha-washdata-card.js` from the latest
   [release](https://github.com/technogrady/ha_washdata_card/releases).
2. Copy it to:
   ```
   <config>/www/community/ha_washdata_card/ha-washdata-card.js
   ```
   (create the folders if they don't exist).
3. Go to **Settings → Dashboards → Resources → Add resource**:
   - **URL:** `/local/community/ha_washdata_card/ha-washdata-card.js`
   - **Resource type:** `JavaScript Module`
4. Hard-refresh your browser.

---

## Usage

In the dashboard editor, click **Add Card → Custom: WashData Card** and fill
in the fields, or use YAML directly:

```yaml
type: custom:ha-washdata-card
entity: sensor.washing_machine_washer_state
title: Washing Machine
icon: mdi:washing-machine
spin_icon: true
show_progress_ring: true
show_metrics: true
```

All sibling sensors (`_washer_program`, `_current_phase`, `_cycle_progress`,
`_time_remaining`, `_elapsed_time`, `_total_duration`, `_current_power`) are
inferred automatically when your entities follow the WashData naming convention
(`sensor.<device>_washer_state`). Override any of them explicitly if needed.

### Full configuration reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `entity` | entity id | **required** | Main state sensor (`sensor.*_washer_state`). |
| `title` | string | friendly name | Card header text. |
| `icon` | mdi icon | `mdi:washing-machine` | Appliance icon. |
| `accent_color` | `[r, g, b]` | state color | Override the accent color (all states). |
| `show_progress_ring` | boolean | `true` | Show the circular progress ring + phase row. |
| `show_metrics` | boolean | `true` | Show the 4-metric grid. |
| `spin_icon` | boolean | `true` | Spin the appliance icon while the state is `running`. |
| `program_entity` | entity id | auto | Program name sensor or select entity. |
| `phase_entity` | entity id | auto | Current-phase sensor (`_current_phase`). |
| `time_entity` | entity id | auto | Time-remaining sensor in minutes (`_time_remaining`). |
| `total_entity` | entity id | auto | Total predicted duration in minutes (`_total_duration`). |
| `pct_entity` | entity id | auto | Cycle-progress sensor 0–100 (`_cycle_progress`). |
| `power_entity` | entity id | auto | Current-power sensor in watts (`_current_power`). |
| `elapsed_entity` | entity id | auto | Elapsed-time sensor in seconds (`_elapsed_time`). |

### State color reference

| State | Color |
| :--- | :--- |
| `running` / `rinsing` / `spinning` | Green |
| `starting` / `ending` | Blue |
| `anti_wrinkle` | Purple |
| `paused` | Amber |
| `interrupted` / `force_stopped` | Red |
| `finished` | Light green |
| `idle` / `off` / `unknown` | Gray |

---

## Related

- [WashData integration](https://github.com/3dg1luk43/ha_washdata) — the
  backend integration that provides the entities consumed by this card.

## License

Non-commercial use only. See [LICENSE](LICENSE).
