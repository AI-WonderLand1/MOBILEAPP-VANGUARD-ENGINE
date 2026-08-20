{ pkgs, ... }: {

  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    # Install Expo CLI globally via npm packages
    (pkgs.nodejs-20-packages.override {
      nodejs = pkgs.nodejs_20;
      packages = p: [ p.expo-cli ];
    })
    pkgs.openjdk  # For Android development
    pkgs.android-sdk  # Android SDK
    pkgs.android-platform-tools  # ADB and other platform tools
    pkgs.android-platform-30   # Android 11 platform
    pkgs.android-build-tools-30-0-3  # Build tools version
    pkgs.android-emulator-30-0-x86_64  # Android emulator image (example)
    # Note: Android Studio is not available in nixpkgs due to licensing.
    # For full Android Studio IDE, consider running it on your host machine
    # and connecting to the container via ADB over TCP, or use the command-line
    # tools provided here for building and debugging.
  ];

  # Sets environment variables in the workspace
  env = {
    ANDROID_SDK_ROOT = "${pkgs.android-sdk}";
    ANDROID_AVD_HOME = "${pkgs.android-emulator-30-0-x86_64}";
    SOME_ENV_VAR = "hello";
    # Add PATH for platform tools, build-tools, and emulator
    PATH = "${pkgs.android-platform-tools}/bin:${pkgs.android-sdk}/platform-tools:${pkgs.android-build-tools-30-0-3}:${pkgs.android-emulator-30-0-x86_64}/emulator:${pkgs.nodejs_20}/bin";
  };

  # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
  idx.extensions = [
    "angular.ng-template"
    "vscjava.vscode-java-pack"
    "ms-android.vscode-android"
    "expo.vscode-expo"  # Expo extension for VS Code
  ];

  # Enable previews and customize configuration
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [
          "npm"
          "run"
          "start"
          "--"
          "--port"
          "$PORT"
          "--host"
          "0.0.0.0"
          "--disable-host-check"
        ];
        manager = "web";
        # Optionally, specify a directory that contains your web app
        # cwd = "app/client";
      };
      android-emulator = {
        # Script to start Android emulator
        command = [
          "bash"
          "-c"
          ""
            "echo 'Setting up Android emulator...' && "
            "avdmanager create avd -n test_avd -k 'system-images;android-30;default;x86_64' --force && "
            "emulator -avd test_avd -no-window -no-audio -gpu swiftshader_indirect &"
            "";
        ];
        manager = "android-emulator";
        # Health check to see if emulator is ready
        healthCheck = {
          command = ["adb", "get-state"];
          interval = 5000; # 5 seconds
          timeout = 2000;  # 2 seconds
          startPeriod = 10000; # 10 seconds
          retries = 10;
        };
      };
      # Optional: Expo web preview (if you have an Expo project)
      expo = {
        command = [
          "expo"
          "start"
          "--web"
          "--dev-client"
          "--port"
          "$PORT"
        ];
        manager = "web";
        # Health check for Expo dev server
        healthCheck = {
          command = ["curl", "-f", "http://localhost:$PORT"];
          interval = 5000;
          timeout = 2000;
          startPeriod = 15000;
          retries = 10;
        };
      };
    };
  };
}