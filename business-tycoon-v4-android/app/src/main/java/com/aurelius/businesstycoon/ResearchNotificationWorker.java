package com.aurelius.businesstycoon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class ResearchNotificationWorker extends Worker {
  private static final String PREFS = "business_tycoon_background";
  private static final String CHANNEL_ID = "ceo_research";
  private static final long THREE_HOURS = 3L * 60L * 60L * 1000L;

  private static final String[] TITLES = {
      "Pause the lowest-margin product line",
      "Introduce premium packaging on selected food products",
      "Consolidate raw-material suppliers",
      "Add a second source for critical materials",
      "Pilot EV logistics fleet",
      "Increase preventive maintenance",
      "Test dynamic pricing",
      "Automate quality inspection",
      "Add subscription pricing for cloud capacity",
      "Add a private-label retail product",
      "Reduce underused premium fleet capacity",
      "Pilot a regional distributor acquisition",
      "Install energy-efficiency controls",
      "Increase liquidity buffer",
      "Strengthen cyber controls",
      "Introduce targeted retention bonus",
      "Expand education CSR partnership",
      "Prioritize high-fit government tenders",
      "Increase patent licensing mix",
      "Reduce blanket discounting",
      "Optimize warehouse slotting",
      "Pilot an export sales channel",
      "Outsource low-density logistics routes",
      "Bring high-volume logistics in-house"
  };

  private static final String[] AREAS = {
      "Products / Portfolio","Food Processing / Retail","Procurement / Industry","Supply Chain",
      "Vehicles / Logistics","Factories / Fleet","Retail / Hotel / Products","Factories / Technology",
      "Data Center / Technology","Retail / Food","Assets / Vehicles","Retail / Logistics",
      "Factories / Property","Finance / Treasury","Company / Data Center","People / Staff",
      "CSR / Government","Government Collaboration","R&D / Licensing","Pricing / Sales",
      "Warehouse / Operations","Sales / Expansion","Logistics","Logistics / Operations"
  };

  public ResearchNotificationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull
  @Override
  public Result doWork() {
    Context context = getApplicationContext();
    long slot = System.currentTimeMillis() / THREE_HOURS;
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    long lastSlot = prefs.getLong("research_notification_slot", -1L);
    if (lastSlot == slot) return Result.success();

    int index = (int) Math.floorMod(slot, TITLES.length);
    int round = (int) (slot / TITLES.length) + 1;
    String title = "CEO Research #" + (index + 1) + " · " + TITLES[index];
    String text = AREAS[index] + " — new 3-hour recommendation is ready. Review benchmark table, forecast and 24-hour trial risk before Accept or Decline.";

    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
          CHANNEL_ID,
          "CEO Research Advisory",
          NotificationManager.IMPORTANCE_DEFAULT
      );
      channel.setDescription("Strategic Business Tycoon research briefs every three hours");
      manager.createNotificationChannel(channel);
    }

    Intent launchIntent = new Intent(context, MainActivity.class);
    launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pendingIntent = PendingIntent.getActivity(
        context,
        7700 + index,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ? new Notification.Builder(context, CHANNEL_ID)
        : new Notification.Builder(context);

    Notification notification = builder
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(title)
        .setContentText(text)
        .setStyle(new Notification.BigTextStyle().bigText(
            text + " The accepted policy runs for 24 hours, can produce profit or loss, and then requires a Continue or Drop decision. Research rotation round " + round + "."
        ))
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .build();

    manager.notify(7700 + index, notification);
    prefs.edit().putLong("research_notification_slot", slot).apply();
    return Result.success();
  }
}
