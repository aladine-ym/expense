// ======================= Feature Flags =======================

/**
 * Central repository for toggling experimental or staged features.
 * This enables gradual rollout while honoring the requirement that
 * all new functionality is guarded by a feature flag.
 */
export const featureFlags = {
    notesReactivity: true,
    autoAdjustBudgets: true,
    driveSync: false,
    offlinePWA: true,
    swipeGestures: false,
    indexedDBBootstrap: false
};
