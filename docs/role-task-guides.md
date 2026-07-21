# Role & Task Guides

Every HopeHub app shows a **Your role & tasks** panel when users log in. It explains responsibilities, daily steps, and clear boundaries — so there is no doubt about what each role should do.

## Where it appears

The panel is mounted in each app shell (or patient dashboard) at the top of the main content area:

| App | Role | Variant support |
|-----|------|-----------------|
| `doctor-web` | Homeopathic doctor | Per `doctorType` (intern, visiting, default) |
| `admin-web` | Platform administrator | — |
| `hr-web` | HR manager | — |
| `receptionist-web` | Receptionist | — |
| `clinic-manager-web` | Clinic manager | — |
| `accountant-web` | Accountant | — |
| `supplier-web` | Supplier partner | — |
| `warehouse-web` | Warehouse manager | — |
| `delivery-web` | Delivery executive | — |
| `diagnostic-web` | Diagnostic lab partner | — |
| `store-manager-web` | Store manager | — |
| `store` | Store staff | — |
| `user-web` | Patient | — |

Users can **Collapse**, **Got it** (hide), or reopen via **Show my role & tasks**. Preference is stored in `localStorage` per app (and doctor variant).

## Source of truth

Canonical **content** lives in `shared/role-task-guides/data.ts`.

The **UI component** is copied to each app at:

```
apps/<app>/src/app/shared/role-task-guide/
```

When editing task text, change only `shared/role-task-guides/data.ts` — all apps read from that file.

API re-exports the same data at `GET /role-guides` and `GET /role-guides/:appKey?variant=...` for integrations or mobile clients.

## Editing guides

1. Open `shared/role-task-guides/data.ts`
2. Find the entry by `appKey` (and optional `variantKey` for doctor types)
3. Update `responsibilities`, `dailyTasks`, or `boundaries`
4. Restart the app — no per-app copy needed

### Doctor variants

- Default guide — chief, junior, specialist, telemedicine, RMO
- `VISITING_DOCTOR` — no slots/earnings emphasis
- `MEDICAL_INTERN` — supervised role, no prescribing

## Component usage

```html
<app-role-task-guide appKey="hr-web" theme="dark" />
<app-role-task-guide appKey="doctor-web" [variantKey]="doctorType" />
```

`theme`: `light` (default) or `dark` for HR-style portals.

## Related docs

- [Homeopathic doctor types](./homeopathic-doctor-types.md) — doctor capability matrix
