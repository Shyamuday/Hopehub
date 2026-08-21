# Hope Hub web calling status

Hope Hub calling is intentionally implemented as a website/PWA experience. Native Android
ConnectionService and iOS CallKit are outside the current product scope.

## Implemented in the website

- Persistent call surface shared by Healing Web and Doctor Web.
- Compact ongoing-call bar across route changes with return, mute, speaker and end controls.
- Incoming-call web push for supported browsers, including opening the correct consultation.
- Ongoing-call browser notification when the active tab is hidden; tapping returns to the call.
- Media Session metadata and supported headset/lock-screen hangup, microphone and camera actions.
- Picture-in-Picture, full screen, front/rear camera switching and audio-output selection where the
  browser exposes those APIs.
- One active call per consultation across browser tabs and devices.
- Remote hangup propagation and authoritative call-state synchronization.
- Cached device/network preflight and prepared media reuse for faster connection.
- Automatic microphone/camera recovery after device changes.
- Trickle ICE, TURN route detection, ICE restart and foreground/socket resynchronization.
- Automatic video pause on sustained poor network while voice remains connected, followed by video
  restoration after the connection stabilizes.
- Wake lock during connected calls where supported.
- Call timeline, route, packet-loss, jitter, round-trip-time and setup-time diagnostics.
- Admin call-health reporting with p95 connection/first-media timings and reliability alerts.
- Graceful API draining and optional Socket.IO Redis scaling.

## Required production infrastructure

1. Publish all TURN routes:

   ```text
   turn:turn.hopehub.in:3478?transport=udp
   turn:turn.hopehub.in:3478?transport=tcp
   turns:turn.hopehub.in:443?transport=tcp
   ```

2. Use short-lived TURN credentials with `TURN_CREDENTIAL_MODE=temporary` and a secret shared with
   coturn. Do not expose a permanent TURN password to browsers.
3. Add a second independently hosted TURN server for relay failover.
4. Configure `SOCKET_REDIS_URL` before running multiple API instances.
5. Keep Web Push VAPID credentials configured so incoming calls can alert an installed PWA when the
   page is not open.

See `deploy/WEBRTC_PRODUCTION.md` for the infrastructure procedure.

## Browser limitations

- A website cannot keep WebRTC media alive after the browser/PWA is force-closed.
- Mobile browsers may suspend audio, sockets or timers under aggressive battery/background rules.
- Browser notifications can return the user to the call, but cannot reliably expose native
  speaker-routing or end-call buttons on every operating system. Those controls remain one tap away
  in the compact in-app call bar.
- iOS background call alerts require the PWA to be added to the Home Screen and notifications to be
  allowed.
- Audio-output selection is not exposed by every mobile browser; Hope Hub falls back to the device's
  system audio route.

These are platform restrictions, not application fallbacks. The UI must explain them instead of
claiming native-phone behavior that a browser cannot guarantee.

## Release test gate

Run the shared regression suite:

```text
npm test --prefix apps/healing-web -- --watch=false --include="**/consultation-webrtc-call.service.spec.ts"
```

Then verify on physical devices:

1. Android Chrome to Android Chrome on Wi-Fi.
2. Android Chrome to Android Chrome on cellular data.
3. iPhone Safari or installed PWA to Android Chrome.
4. Wi-Fi/cellular and 4G/5G handover during an active call.
5. Bluetooth connect/disconnect and speaker switching.
6. Screen lock, background, notification tap and foreground restoration.
7. UDP-blocked network proving TURN TCP/TLS 443 relay.
8. Temporary network loss followed by automatic recovery.
9. Remote hangup immediately ending the other side.
10. Attempting a second call while one is active being rejected with a clear message.

The website calling feature is development-complete only after the automated suite and this
real-device matrix pass against the production TURN configuration.
