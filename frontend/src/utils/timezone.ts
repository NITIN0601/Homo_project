/**
 * ─── Clinic Operational Timezone & Global Localization ────────────────────────
 * Facade entrypoint: re-exports cleanly modularized timezone submodules.
 *
 * Submodules:
 * - ./timezone/types: Interfaces & type contracts
 * - ./timezone/constants: Common timezones & canonical abbreviations
 * - ./timezone/inference: Location-to-timezone resolution
 * - ./timezone/clinicClock: Clinic clock, diurnal period, & slot normalization
 * - ./timezone/slotMapping: Global slot localization & session hours
 */

export * from "./timezone/index";
