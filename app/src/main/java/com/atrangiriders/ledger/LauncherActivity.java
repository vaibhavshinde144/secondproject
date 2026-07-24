package com.atrangiriders.ledger;

/**
 * Launches the existing Atrangi Ledger PWA in a Trusted Web Activity.
 * When Digital Asset Links have not yet propagated, the Android Browser
 * Helper safely falls back to a Chrome Custom Tab so Google sign-in works.
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
}
