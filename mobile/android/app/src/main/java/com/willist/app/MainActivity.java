package com.daystep.app;

import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register Google Auth plugin
        this.init(savedInstanceState, java.util.List.of(
            GoogleAuth.class
        ));
    }
}
