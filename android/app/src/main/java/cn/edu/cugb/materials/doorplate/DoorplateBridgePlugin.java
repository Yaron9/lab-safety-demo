package cn.edu.cugb.materials.doorplate;

import android.app.Activity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DoorplateBridge")
public class DoorplateBridgePlugin extends Plugin {
    private static final float SLEEP_BRIGHTNESS = 0.01f;
    private float previousBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
    private boolean sleeping = false;

    @PluginMethod
    public void sleep(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available");
            return;
        }

        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();
            WindowManager.LayoutParams attrs = window.getAttributes();
            if (!sleeping) {
                previousBrightness = attrs.screenBrightness;
            }
            attrs.screenBrightness = SLEEP_BRIGHTNESS;
            window.setAttributes(attrs);
            applyImmersiveMode(window);
            sleeping = true;

            JSObject result = new JSObject();
            result.put("sleeping", true);
            result.put("brightness", SLEEP_BRIGHTNESS);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void wake(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available");
            return;
        }

        activity.runOnUiThread(() -> {
            Window window = activity.getWindow();
            WindowManager.LayoutParams attrs = window.getAttributes();
            attrs.screenBrightness = previousBrightness;
            window.setAttributes(attrs);
            applyImmersiveMode(window);
            sleeping = false;

            JSObject result = new JSObject();
            result.put("sleeping", false);
            result.put("brightness", previousBrightness);
            call.resolve(result);
        });
    }

    private void applyImmersiveMode(Window window) {
        View decor = window.getDecorView();
        decor.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
