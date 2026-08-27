package com.aurelius.businesstycoon;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.util.Random;

public class BackgroundEconomyWorker extends Worker {
  private static final String PREFS = "business_tycoon_background";
  private static final long DEFAULT_CYCLE_MS = 60_000L;
  private static final long RISK_MS = 30L * 60L * 1000L;
  private final Random random = new Random();

  private static final String[] NAMES = {
      "Severe Flood", "Earthquake", "Cyclone", "Property Fire",
      "Vehicle Accident", "Industrial Fire", "Cyberattack",
      "Supply Chain Strike", "Personal Emergency"
  };
  private static final String[] TYPES = {
      "Natural", "Natural", "Natural", "Accident", "Accident",
      "Man-made", "Man-made", "Man-made", "Personal"
  };
  private static final String[] CATEGORIES = {
      "property", "disaster", "disaster", "property", "vehicle",
      "company", "company", "company", "personal"
  };
  private static final String[] EMOJIS = {
      "🌊", "🌎", "🌀", "🏠", "🚗", "🔥", "🛡️", "⚠️", "🏥"
  };
  private static final String[] TEXTS = {
      "Flooding damaged property and interrupted operations.",
      "Infrastructure damage caused an unexpected capital loss.",
      "Weather disruption damaged facilities and logistics.",
      "A property fire created repair costs.",
      "A fleet accident generated repair and replacement costs.",
      "An industrial incident interrupted operations.",
      "A cyber incident interrupted digital operations.",
      "A labor disruption affected the supply chain.",
      "An unexpected personal emergency required a cash outflow."
  };
  private static final double[] SEVERITY = {
      .008, .012, .009, .006, .004, .007, .005, .004, .003
  };

  public BackgroundEconomyWorker(
      @NonNull Context context,
      @NonNull WorkerParameters params
  ) {
    super(context, params);
  }

  private double coverage(JSONObject coverage, String category, String type) {
    double specific = coverage.optDouble(category, 0.0);
    double catastrophe = (
        "Natural".equals(type) || "Man-made".equals(type)
    ) ? coverage.optDouble("disaster", 0.0) : 0.0;
    return Math.min(.95, Math.max(specific, catastrophe));
  }

  @NonNull
  @Override
  public Result doWork() {
    try {
      SharedPreferences prefs = getApplicationContext()
          .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      String raw = prefs.getString("state", "");
      if (raw == null || raw.isEmpty()) {
        return Result.success();
      }

      JSONObject j = new JSONObject(raw);
      long now = System.currentTimeMillis();
      long cycleMs = Math.max(
          DEFAULT_CYCLE_MS,
          j.optLong("cycleMs", DEFAULT_CYCLE_MS)
      );
      long lastEconomyAt = j.optLong("lastEconomyAt", now);
      long lastCollectionAt = j.optLong("lastCollectionAt", now);
      long lastRiskAt = j.optLong("lastRiskAt", now);

      double cash = j.optDouble("cash", 0.0);
      double totalEarned = j.optDouble("totalEarned", 0.0);
      double taxDue = j.optDouble("taxDue", 0.0);
      double taxRecovered = j.optDouble("taxRecovered", 0.0);
      double insurancePaid = j.optDouble("insurancePaidTotal", 0.0);
      double insuranceClaims = j.optDouble("insuranceClaimsTotal", 0.0);
      double disasterLoss = j.optDouble("disasterLossTotal", 0.0);

      double operatingPerCycle = Math.max(
          0.0,
          j.optDouble("passiveGross", 0.0)
      );
      double taxRate = Math.max(0.0, j.optDouble("taxRate", .18));
      double premiumTotal = Math.max(
          0.0,
          j.optDouble("premiumTotal", 0.0)
      );
      double royaltyPerCollection = Math.max(
          0.0,
          j.optDouble("royaltyPerCollection", 0.0)
      );
      double netWorth = Math.max(
          50_000.0,
          Math.abs(j.optDouble("netWorth", 50_000.0))
      );
      double riskProbability = Math.max(
          0.0,
          Math.min(.20, j.optDouble("riskProbability", .04))
      );
      int intervalMin = j.optInt("collectionIntervalMin", 60);
      long collectionMs = Math.max(15, intervalMin) * 60L * 1000L;

      long cycles = Math.min(
          10_080L,
          Math.max(0L, (now - lastEconomyAt) / cycleMs)
      );
      if (cycles > 0) {
        double earnings = operatingPerCycle * cycles;
        cash += earnings;
        totalEarned += earnings;
        taxDue += earnings * taxRate;
        lastEconomyAt += cycles * cycleMs;
        netWorth += earnings;
      }

      long collections = Math.min(
          336L,
          Math.max(0L, (now - lastCollectionAt) / collectionMs)
      );
      for (long i = 0; i < collections; i++) {
        cash -= premiumTotal;
        insurancePaid += premiumTotal;

        if (royaltyPerCollection > 0.0) {
          cash += royaltyPerCollection;
          totalEarned += royaltyPerCollection;
          taxDue += royaltyPerCollection * taxRate;
        }

        double paid = Math.max(
            0.0,
            Math.min(Math.max(0.0, cash), taxDue)
        );
        cash -= paid;
        taxDue -= paid;
        taxRecovered += paid;
        if (taxDue > 0.0) {
          taxDue *= 1.02;
        }
        lastCollectionAt += collectionMs;
      }

      JSONObject coverage = j.optJSONObject("coverage");
      if (coverage == null) {
        coverage = new JSONObject();
      }
      JSONObject lastDisaster = j.optJSONObject("lastDisaster");

      long riskBlocks = Math.min(
          336L,
          Math.max(0L, (now - lastRiskAt) / RISK_MS)
      );
      for (long i = 0; i < riskBlocks; i++) {
        if (random.nextDouble() < riskProbability) {
          int idx = random.nextInt(NAMES.length);
          double grossLoss = Math.min(
              350_000.0,
              Math.max(
                  2_500.0,
                  netWorth * SEVERITY[idx] * (.7 + random.nextDouble() * .5)
              )
          );
          double rate = coverage(
              coverage,
              CATEGORIES[idx],
              TYPES[idx]
          );
          double covered = grossLoss * rate;
          double netLoss = grossLoss - covered;

          cash -= netLoss;
          disasterLoss += netLoss;
          insuranceClaims += covered;
          netWorth = Math.max(50_000.0, netWorth - netLoss);

          lastDisaster = new JSONObject();
          lastDisaster.put("name", NAMES[idx]);
          lastDisaster.put("type", TYPES[idx]);
          lastDisaster.put("category", CATEGORIES[idx]);
          lastDisaster.put("emoji", EMOJIS[idx]);
          lastDisaster.put("text", TEXTS[idx]);
          lastDisaster.put("grossLoss", grossLoss);
          lastDisaster.put("covered", covered);
          lastDisaster.put("netLoss", netLoss);
          lastDisaster.put("coverageRate", rate);
          lastDisaster.put("at", lastRiskAt + RISK_MS);
        }
        lastRiskAt += RISK_MS;
      }

      j.put("cash", cash);
      j.put("totalEarned", totalEarned);
      j.put("taxDue", taxDue);
      j.put("taxRecovered", taxRecovered);
      j.put("insurancePaidTotal", insurancePaid);
      j.put("insuranceClaimsTotal", insuranceClaims);
      j.put("disasterLossTotal", disasterLoss);
      j.put("lastEconomyAt", lastEconomyAt);
      j.put("lastCollectionAt", lastCollectionAt);
      j.put("lastRiskAt", lastRiskAt);
      j.put("netWorth", netWorth);
      if (lastDisaster != null) {
        j.put("lastDisaster", lastDisaster);
      }
      j.put("updatedAt", now);

      prefs.edit().putString("state", j.toString()).apply();
      return Result.success();
    } catch (Exception e) {
      return Result.retry();
    }
  }
}
