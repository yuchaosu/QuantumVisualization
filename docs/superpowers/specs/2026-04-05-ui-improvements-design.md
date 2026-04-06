# UI Improvements Design: Contrast, Theming, Responsive Sphere

## Overview

Three interconnected UI improvements to the QuantumVisualization app:

1. **State vector contrast** — make the qubit state arrow clearly visible against the sphere and background
2. **Light/dark theme toggle** — warm cream light theme + dark theme, switchable via Nav button, persisted in localStorage
3. **Responsive sphere sizing** — sphere fills available vertical space dynamically instead of fixed height

---

## Problem Statement

- The state vector (arrow) is hard to see: dark arrow against dark sphere against dark background — no contrast
- No way to switch to a lighter theme
- The sphere row has a fixed `min-height: 500px` that doesn't adapt to the viewport

---

## Design

### 1. State Vector Contrast

**Vector color is theme-aware** — the arrow shaft and cone use a color that has strong contrast on each background:

| Theme | Vector color | Background | Contrast ratio |
|-------|-------------|------------|----------------|
| Dark  | `#00d4ff` (electric cyan) | `#0d1117` | ~13.5:1 |
| Light | `#005bb5` (deep ocean blue) | `#fdf6e3` | ~7.2:1 |

Both colors exceed WCAG AA (4.5:1) on their respective backgrounds.

`SphereScene.tsx` receives a `vectorColor: string` prop. `BlochSphere.tsx` receives `theme: 'dark' | 'light'` and passes the appropriate color string down to `SphereScene`.

**Sphere opacity:** Reduced from 30% → 15%. The sphere is a reference frame — it should read as a ghost outline so the vector dominates visually.

**Axis labels:** X/Y/Z and |0⟩/|1⟩ labels retain existing subtle gray styling; no change needed.

---

### 2. Theme System

**Mechanism:** A `data-theme` attribute on `<html>`. CSS variables are defined at `:root` (dark, default) and redefined under `[data-theme="light"]`. No JS theme library needed.

**Toggle button:** Lives in the `Nav` component (top-right corner).
- In dark mode: displays `🌙` (Unicode U+1F319, CRESCENT MOON) — indicates current theme is dark
- In light mode: displays `☀️` (Unicode U+2600 + U+FE0F, SUN with emoji variation selector) — indicates current theme is light
- `aria-label` in dark mode: `"Switch to light theme"`
- `aria-label` in light mode: `"Switch to dark theme"`

The icon shows the **current** theme; the `aria-label` describes the **action on press**. This mismatch is intentional — it follows standard toggle-button convention where the label tells the user what will happen, not what is happening.

Icon characters are rendered as plain text inside the button — no icon library required.

**Persistence:**
- Storage key: `'qv-theme'` (namespaced to avoid collisions with other apps on the same origin)
- On app load: `localStorage.getItem('qv-theme')` → validates value is `'dark'` or `'light'` → falls back to `'dark'`
- On toggle: write new value with `localStorage.setItem('qv-theme', newTheme)`
- Constant defined in `App.tsx`: `const THEME_STORAGE_KEY = 'qv-theme'`

**State:** Managed in `App.tsx` as `theme: 'dark' | 'light'`. Applied via `useEffect` that calls `document.documentElement.setAttribute('data-theme', theme)`. Passed to `Nav` via `theme` + `onToggleTheme` props. Passed to `BlochSphere` via `theme` prop (so it can select the correct vector color).

**Dark palette** (`:root`):
```css
--bg-base: #0d1117;
--bg-surface: #161b22;
--bg-elevated: #21262d;
--border: #30363d;
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--accent-blue: #58a6ff;
--accent-green: #3fb950;
--accent-red: #f85149;
--accent-purple: #bc8cff;
```

**Light palette** (`[data-theme="light"]`):
```css
--bg-base: #fdf6e3;
--bg-surface: #f5efe0;
--bg-elevated: #ede7d4;
--border: #c8bfa8;
--text-primary: #2c2416;
--text-secondary: #6b5d4a;
--accent-blue: #0066cc;
--accent-green: #2a7a2a;
--accent-red: #cc2200;
--accent-purple: #7030a0;
```

**Accent contrast on light backgrounds:** Accent values are used as foreground text/borders (GateControls) and as filled bar elements (StateReadout probability bars) against `--bg-surface` (`#f5efe0`). All five values have been verified against `#f5efe0` (relative luminance ≈ 0.865):

| Variable | Light value | Contrast vs `--bg-surface` |
|----------|------------|---------------------------|
| `--accent-blue` | `#0066cc` | ~4.9:1 ✓ |
| `--accent-green` | `#2a7a2a` | ~4.6:1 ✓ |
| `--accent-red` | `#cc2200` | ~4.8:1 ✓ |
| `--accent-purple` | `#7030a0` | ~7.0:1 ✓ |

All values exceed WCAG AA (4.5:1). No runtime verification is needed.

---

### 3. Responsive Sphere Sizing

**Current problem:** `.sphereRow` has `min-height: 500px` as a fixed floor, and `BlochSphere.module.css` `.container` also has `min-height: 500px`. These prevent the sphere from naturally filling available space.

**Fix:**
- `.sphereRow` in `App.module.css`: keep `flex: 1`, lower `min-height` from `500px` → `350px`. The row retains a floor so the sphere never collapses to zero on very short viewports. This is intentional — the row controls the floor, the container defers to it.
- `BlochSphere.module.css` `.container`: remove `min-height: 500px` entirely, keep `width: 100%; height: 100%`. The container has no floor of its own because it fills its parent (the row) which already enforces the floor.
- R3F `<Canvas>` already uses 100% width/height by default — no Canvas changes needed.

The other rows (Nav, GateControls, StateReadout, Explanation) take their natural content height. The sphere row claims all remaining vertical space via `flex: 1`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `[data-theme="light"]` block with warm cream palette |
| `src/App.tsx` | Add `theme` state + `THEME_STORAGE_KEY` constant, `useEffect` to apply to `<html>`, localStorage init/write, pass `theme`/`onToggleTheme` to Nav, pass `theme` to BlochSphere |
| `src/components/Nav/Nav.tsx` | Add `theme` + `onToggleTheme` props, add toggle button with `🌙`/`☀` icon and correct `aria-label` |
| `src/components/Nav/Nav.module.css` | Style the toggle button |
| `src/components/BlochSphere/BlochSphere.tsx` | Accept `theme` prop, derive `vectorColor` from it, pass to SphereScene |
| `src/components/BlochSphere/SphereScene.tsx` | Accept `vectorColor: string` prop, use it for arrow shaft + cone color; reduce sphere opacity to 0.15 |
| `src/App.module.css` | Change `.sphereRow` min-height from `500px` → `350px` |
| `src/components/BlochSphere/BlochSphere.module.css` | Remove `min-height: 500px` from `.container` |

---

## Out of Scope

- System-preference (`prefers-color-scheme`) auto-detection
- Animated theme transition
- Per-component color customization
- Any changes to quantum math, gate logic, or test files
