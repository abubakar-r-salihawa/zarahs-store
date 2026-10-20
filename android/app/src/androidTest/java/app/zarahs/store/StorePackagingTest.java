package app.zarahs.store;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.nio.charset.StandardCharsets;

@RunWith(AndroidJUnit4.class)
public class StorePackagingTest {
    @Test
    public void shipsLocalAssetsAndDisablesAccountBackup() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("app.zarahs.store", context.getPackageName());
        assertEquals(0, context.getApplicationInfo().flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        try (var stream = context.getAssets().open("public/index.html")) {
            String html = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertTrue(html.contains("js/supabase-sdk.bundle.js"));
            assertTrue(html.contains("js/mobile.bundle.js"));
            assertFalse(html.contains("cdn.jsdelivr.net/npm/@supabase/"));
        }
        Intent callback = new Intent(Intent.ACTION_VIEW, Uri.parse("app.zarahs.store://auth/callback"));
        callback.setPackage(context.getPackageName());
        assertNotNull(callback.resolveActivity(context.getPackageManager()));
    }
}
