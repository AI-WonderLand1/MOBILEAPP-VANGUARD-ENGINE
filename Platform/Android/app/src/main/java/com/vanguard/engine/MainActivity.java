package com.vanguard.engine;

import android.app.NativeActivity;
import android.os.Bundle;
import android.view.inputmethod.InputMethodManager;

public class MainActivity extends NativeActivity {
    static {
        System.loadLibrary("vanguard");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    public void showSoftInput() {
        InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.showSoftInput(findViewById(android.R.id.content), 0);
        }
    }

    public int pollUnicodeChar() {
        // Not used in initial M0; kept for future ImGui text input
        return 0;
    }
}