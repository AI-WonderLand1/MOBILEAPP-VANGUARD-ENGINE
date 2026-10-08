# Mobile dependency and APK checks

- Android GitHub Actions now runs on PRs and pushes to **Master** (actual repository default branch). Older workflow listened to lowercase `master` and `main` only.
- The additional web studio workflow runs `npm ci`, `npm run lint`, and `npm run build`; it reports npm audit findings without hiding them or falsely claiming all are fixed.
- Dependabot security update PR #3 is separate and should only be merged after web and Android checks pass.
- Real native Vulkan runtime/device validation remains necessary even after building an APK.
