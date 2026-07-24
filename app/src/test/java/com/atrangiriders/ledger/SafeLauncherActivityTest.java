package com.atrangiriders.ledger;

import static org.junit.Assert.assertNotNull;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;

/** Verifies that the launcher startup path contains provider failures. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 30)
public class SafeLauncherActivityTest {

    @Test
    public void launcherCanCreateWithoutUncaughtStartupFailure() {
        ActivityController<SafeLauncherActivity> controller =
                Robolectric.buildActivity(SafeLauncherActivity.class);

        SafeLauncherActivity activity = controller.create().get();
        assertNotNull(activity);

        controller.start().resume().pause().stop().destroy();
    }
}
