# OOREP repertory data (GPL)

This folder holds the official OOREP PostgreSQL dump used for a one-time import into HopeHub.

## Download

```powershell
npm run repertory:download:oorep --prefix apps/api
```

Source: [nondeterministic/oorep](https://github.com/nondeterministic/oorep) (`oorep.sql.gz`, GPL repertories `publicum` and `kent-de`).

Re-download:

```powershell
npm run repertory:download:oorep --prefix apps/api -- --force
```

## Import

```powershell
npm run prisma:migrate --prefix apps/api
npm run repertory:import:oorep --prefix apps/api
```

Optional flags:

```powershell
npm run repertory:import:oorep --prefix apps/api -- --sql data/oorep/oorep.sql --sources publicum,kent-de
```

## License note

`publicum` and `kent-de` are GPL v3. Do not redistribute other repertories from oorep.com without permission.
