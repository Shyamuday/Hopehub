# Hope Hub WebRTC production requirements

The API publishes ICE configuration to the web clients. Production should provide all three relay routes, in this order:

```text
turn:turn.hopehub.in:3478?transport=udp
turn:turn.hopehub.in:3478?transport=tcp
turns:turn.hopehub.in:443?transport=tcp
```

`TURN_URLS` accepts the comma-separated list. Use coturn's shared-secret authentication and configure:

```text
TURN_CREDENTIAL_MODE=temporary
TURN_SHARED_SECRET=<stored outside git>
TURN_USERNAME_PREFIX=hopehub
TURN_TTL_SECONDS=3600
```

The same secret must be configured in coturn with `use-auth-secret` and `static-auth-secret`. Do not commit the value or use a permanent browser-visible password.

Port 443 must terminate TURN TLS, not HTTP. The TURN certificate must cover `turn.hopehub.in`, remain renewable, and be readable by coturn. Keep the UDP relay range open in the firewall. Add a second independently hosted TURN endpoint to `TURN_URLS` before calling the service redundant.

After configuration:

1. Check `/health/ready`. It reports UDP, TCP, TLS 443, and credential mode without exposing credentials.
2. Test calls from Wi-Fi, cellular data, and a network with UDP blocked.
3. Confirm Admin → Call health records direct and TURN routes.
4. Confirm a rolling API restart does not interrupt established peer media.

Repository changes do not create a certificate, firewall rule, second relay server, or DNS record. Those remain infrastructure operations.

## Call reliability test gate

Run the shared call-service regression suite before releasing either web app:

```text
npm test --prefix apps/healing-web -- --watch=false --include="**/consultation-webrtc-call.service.spec.ts"
```

The suite verifies incoming signal sequencing, cached preflight reuse, prepared-media reuse, signaling-server restart recovery, authoritative sequence synchronization, relay-only ICE policy, automatic video pause and restoration, offline/online ICE recovery, and foreground resynchronization.

Browser automation cannot reproduce every mobile radio, operating-system background policy, Bluetooth stack, or carrier NAT. Before a calling release, also complete these physical-device checks and confirm the call timeline contains the expected route and recovery events:

1. Android Chrome to Android Chrome on Wi-Fi.
2. iPhone Safari or installed PWA to Android Chrome.
3. Wi-Fi to cellular, then cellular to Wi-Fi during an active call.
4. 4G to 5G handover during an active call.
5. Bluetooth headset connect and disconnect during an active call.
6. Screen lock, background, and return on both participants.
7. UDP-blocked network using TURN TCP/TLS 443.
8. Temporary network loss followed by automatic recovery.

## Multiple API instances

Set `SOCKET_REDIS_URL` to a dedicated Redis endpoint before running more than one API instance. The API then shares Socket.IO rooms and call signals through the Redis adapter. If the variable is configured but Redis cannot connect, startup fails rather than allowing callers and receivers to be silently split across instances.
