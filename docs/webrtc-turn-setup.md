# WebRTC TURN Setup

Hope Hub uses Socket.IO for WebRTC signaling and coturn for TURN relay support.

## Production TURN Server

- DNS: `turn.hopehub.in`
- Public IP: `13.233.107.251`
- TURN URL exposed to apps: `turn:turn.hopehub.in:3478`
- Realm: `hopehub.in`
- Server package: `coturn`
- Service: `coturn`

The TURN username and credential are stored only on the production server:

```bash
/etc/hopehub-turn-url
/etc/hopehub-turn-username
/etc/hopehub-turn-credential
```

The API reads these into `apps/api/.env` during local production deploy through:

```bash
deploy/scripts/deploy-api-local.sh
```

## Required Firewall Ports

Lightsail instance `Ubuntu-1` must allow:

```text
3478/tcp
3478/udp
49152-65535/udp
```

Ports `22/tcp`, `80/tcp`, and `443/tcp` remain required for SSH and web/API traffic.

## coturn Config

Main config file:

```bash
/etc/turnserver.conf
```

Important settings:

```conf
listening-port=3478
fingerprint
lt-cred-mech
realm=hopehub.in
server-name=turn.hopehub.in
external-ip=13.233.107.251/172.26.3.37
user=hopehub:<stored-secret>
no-cli
no-multicast-peers
no-loopback-peers
min-port=49152
max-port=65535
```

`external-ip` is required because the Lightsail public IP is NATed to the instance private IP.

## API Endpoint

Authenticated clients load ICE servers from:

```text
GET /rtc/ice-servers
```

Expected shape:

```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" },
    {
      "urls": "turn:turn.hopehub.in:3478",
      "username": "hopehub",
      "credential": "***"
    }
  ]
}
```

## Verification

Check DNS:

```bash
nslookup turn.hopehub.in
```

Check coturn:

```bash
sudo systemctl status coturn
sudo ss -lunpt | grep :3478
```

Check API:

```bash
curl -H "Authorization: Bearer <token>" https://api.hopehub.in/rtc/ice-servers
```

## App Integration

The shared call UI lives in:

```text
libs/platform-ui/src/consultation-call
```

Current consumers:

```text
apps/user-web
apps/doctor-web
apps/healing-web
```

Calls require:

- an authenticated Socket.IO connection to the API
- the consultation id
- the target user id
- ICE servers from `/rtc/ice-servers`
- a consultation with an assigned doctor for patient-side calling
