package com.aurelius.businesstycoon;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {
  private WebView webView;
  private static final String PREFS = "business_tycoon_background";
  private static final String WORK_NAME = "business_tycoon_economy";

  @Override
  public void onCreate(Bundle state) {
    super.onCreate(state);
    setBars(false);

    webView = new WebView(this);
    webView.setBackgroundColor(Color.rgb(11, 19, 43));
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setAllowFileAccess(true);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
    settings.setTextZoom(100);

    webView.addJavascriptInterface(new GameBridge(this), "AndroidGame");
    webView.setWebViewClient(new WebViewClient());
    webView.setWebChromeClient(new WebChromeClient());
    webView.loadUrl("file:///android_asset/index.html");
    setContentView(webView);
    scheduleBackground(60);
  }

  private void setBars(boolean light) {
    Window window = getWindow();
    int flags = View.SYSTEM_UI_FLAG_VISIBLE;
    if (light && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    }
    if (light && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    }
    window.getDecorView().setSystemUiVisibility(flags);
    window.setStatusBarColor(light ? Color.rgb(248, 250, 252) : Color.rgb(11, 19, 43));
    window.setNavigationBarColor(light ? Color.rgb(248, 250, 252) : Color.rgb(7, 11, 20));
  }

  private void scheduleBackground(int minutes) {
    long interval = Math.max(15, minutes);
    PeriodicWorkRequest work = new PeriodicWorkRequest.Builder(
        BackgroundEconomyWorker.class,
        interval,
        TimeUnit.MINUTES
    ).addTag(WORK_NAME).build();

    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
        WORK_NAME,
        ExistingPeriodicWorkPolicy.UPDATE,
        work
    );
  }

  public class GameBridge {
    private final Context context;

    GameBridge(Context context) {
      this.context = context;
    }

    @JavascriptInterface
    public void syncBackgroundState(String json) {
      context.getSharedPreferences(PREFS, MODE_PRIVATE)
          .edit()
          .putString("state", json)
          .apply();
    }

    @JavascriptInterface
    public String getBackgroundState() {
      return context.getSharedPreferences(PREFS, MODE_PRIVATE)
          .getString("state", "");
    }

    @JavascriptInterface
    public void scheduleBackground(int minutes) {
      runOnUiThread(() -> MainActivity.this.scheduleBackground(minutes));
    }

    @JavascriptInterface
    public void setSystemBars(String mode) {
      final boolean light = "light".equalsIgnoreCase(mode);
      runOnUiThread(() -> {
        setBars(light);
        if (webView != null) {
          webView.setBackgroundColor(
              light ? Color.rgb(244, 247, 251) : Color.rgb(11, 19, 43)
          );
        }
      });
    }
  }

  @Override
  protected void onPause() {
    super.onPause();
    if (webView != null) {
      webView.evaluateJavascript(
          "try{save();syncNativeState();}catch(e){}",
          null
      );
    }
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (webView != null) {
      webView.evaluateJavascript(
          "try{settleOfflineProgress(true);render();}catch(e){}",
          null
      );
    }
  }

  @Override
  public void onBackPressed() {
    if (webView != null && webView.canGoBack()) {
      webView.goBack();
    } else {
      super.onBackPressed();
    }
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.destroy();
    }
    super.onDestroy();
  }
}
