package com.atrangiriders.ledger;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import java.util.List;

/**
 * Crash-safe Trusted Web Activity launcher.
 *
 * The normal path is the Android Browser Helper Trusted Web Activity. If a
 * browser/provider on a specific phone throws during startup, the exception is
 * contained and Atrangi Ledger opens in an external browser instead of showing
 * an Android "keeps stopping" dialog.
 */
public final class SafeLauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private boolean fallbackStarted;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable startupFailure) {
            openExternalBrowserFallback();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        try {
            super.onNewIntent(intent);
        } catch (Throwable startupFailure) {
            openExternalBrowserFallback();
        }
    }

    private void openExternalBrowserFallback() {
        if (fallbackStarted || isFinishing()) {
            return;
        }
        fallbackStarted = true;

        final Uri appUri = Uri.parse(getString(R.string.launch_url));
        final Intent browserIntent = new Intent(Intent.ACTION_VIEW, appUri)
                .addCategory(Intent.CATEGORY_BROWSABLE)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        // Avoid resolving the fallback URL back to this same app.
        List<ResolveInfo> handlers = getPackageManager().queryIntentActivities(browserIntent, 0);
        for (ResolveInfo handler : handlers) {
            if (handler.activityInfo != null
                    && handler.activityInfo.packageName != null
                    && !getPackageName().equals(handler.activityInfo.packageName)) {
                browserIntent.setPackage(handler.activityInfo.packageName);
                break;
            }
        }

        try {
            startActivity(browserIntent);
        } catch (ActivityNotFoundException noBrowser) {
            Toast.makeText(
                    this,
                    "A supported browser is required to open Atrangi Ledger.",
                    Toast.LENGTH_LONG
            ).show();
        } catch (Throwable ignored) {
            // Never allow a browser/provider failure to crash the launcher.
        } finally {
            finishAndRemoveTask();
        }
    }
}
