# IFC Takeoff Viewer

## Overview

This project is a React-based IFC (Industry Foundation Classes) viewer and material takeoff tool. It uses:

* **ThatOpen engine** (Three.js) to render the 3D model
* **Web‑IFC** for parsing IFC data
* **Material‑UI** for a modern, dark‑mode UI

Users can upload an IFC file, watch it load with a progress bar and stepper, then compute and download a material takeoff report as CSV.

---

## File Descriptions

### `src/App.tsx`

* Configures Material‑UI theme (light/dark toggle)
* Manages upload, model‑loading, and takeoff state
* Renders the 3D canvas, upload button, progress indicators, stepper, and takeoff panel

### `src/hooks/useEngine.tsx`

* Initializes ThatOpen’s 3D engine and Three.js renderer
* Loads IFC geometry into the scene with a progress callback
* Exposes a `loadIfc(path: string, onProgress?: (pct: number) => void)` function

### `src/hooks/useIfcParser.ts`

* Wraps Web‑IFC’s `IfcAPI` initialization (`SetWasmPath` + `Init`)
* Exposes parser readiness: `{ api, loading, error }`

### `src/hooks/useTakeoff.ts`

* Depends on `useIfcParser` for a ready IFC parser
* Defines `startTakeoff(file: File)` to parse quantities and materials
* Manages takeoff results `{ data, loading, error }`

### `src/components/MaterialTakeoff.tsx`

* Pure UI component to display:

  * Error messages
  * A table of material names, quantities, units, and types
  * A “Download CSV” button

### `src/components/IfcUpload.tsx`

* Renders a floating upload button (top‑left)
* Fires a callback when an IFC file is selected

---

## Potential Improvements

* **UI/UX**

  * Add filtering and sorting in the material table (by quantity, name, type)
  * Persist dark/light preference in `localStorage`
  * Mobile‑friendly layout (e.g. collapse panels into a bottom drawer)

* **Feedback & Progress**

  * Display a stepper tooltip or status messages on hover
  * Animate transitions between loading and results

* **Performance & Memory**

  * Dispose of old IFC models (`CloseModel`) and free WASM memory when switching files
  * Cache takeoff results per file (e.g. via `IndexedDB`)

* **Error Handling**

  * Distinguish and handle different error types (parsing vs. network vs. UI)
  * Wrap core UI in an Error Boundary

* **Testing & CI**

  * Add unit tests for hooks (`useIfcParser`, `useTakeoff`) with mocks
  * E2E tests for upload → load → takeoff flows

* **Exports & Formats**

  * Offer additional export formats (XLSX, PDF)
  * Integrate with cloud storage or shareable links

* **Accessibility**

  * Ensure ARIA labels for buttons and progress indicators
  * Keyboard navigation for upload, table sorting, and theme toggle

* **IFC Takeoff Computation**

  * Parallelize quantity extraction via Web Workers or fragment‑based updates
  * Incremental updates: re‑run takeoff only on changed parts of the model
  * Support additional IFC quantity types (`IfcQuantityWeight`, `IfcQuantityCount`, etc.)
  * Enhanced unit handling: detect and convert all project units and allow on‑the‑fly conversions
  * Group by classification: aggregate materials by user‑defined IFC classifications
  * Streaming parse for very large IFC files to reduce memory footprint
  * Customizable takeoff rules: let users script which properties to include or exclude

---

## Technical Challenges Working with IFC Quantities

1. **Schema Complexity & Flexibility**

   * IFC defines many `IfcQuantity*` subclasses (`IfcQuantityLength`, `IfcQuantityArea`, `IfcQuantityVolume`, etc.) grouped under `IfcElementQuantity`. Navigating these layers requires extensive conditional logic.
   * Quantity properties are optional and may override project units, or omit units entirely—forcing fallbacks to global context or hard‑coded assumptions.
   * Custom or vendor‑specific extensions often store quantities in `IfcPropertySet` rather than standard `IfcQuantity` entities, requiring dynamic detection of non‑standard property sets.

2. **Authoring Variability & Level of Detail (LOD)**

   * Different models come with different LODs: some include detailed bolt‑level geometry, others only coarse bounding volumes. Missing or partial quantity definitions can lead to under‑ or over‑counts.
   * Not all IFC exporters automatically generate quantity sets; authors must enable “Include Quantities” or use plugins. Absent `IfcElementQuantity` sets force fallback to per‑object counts or mesh‑based measurements.
   * Semantic definitions (`IfcWall` height in metadata) can drift from geometric reality (extruded mesh), causing discrepancies between reported and measured dimensions.

3. **Unit & Context Drift**

   * IFC projects define global units via `IfcUnitAssignment`, but individual quantities may override them. Robust parsing must first check a quantity’s local unit, then fall back to global context.
   * IFC supports prefixes (e.g. “milli”, “kilo”) and compound units (`IfcCompoundUnit`). Accurately extracting unit symbols and scale factors often requires traversing multiple entity references and handling custom unit types.

---