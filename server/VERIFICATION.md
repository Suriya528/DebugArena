# Safe verification workflow

Run the repeatable verification suite from the repository root:

```powershell
npm test
```

The command sets `DEBUGARENA_VERIFICATION_MODE=isolated`, forces `NODE_ENV=test`, clears the test process's `MONGODB_URI`, and starts only a local `MongoMemoryServer`. The database connector ignores any value loaded from `.env` in this mode and rejects non-loopback MongoDB addresses.

The suite exercises the local JavaScript judge and isolated DEBUG ARENA API flows. It detects C, C++, Java, Python, and SQL toolchain availability at runtime. Missing toolchains are reported as `ENVIRONMENT BLOCKED`, not test failures.

Useful focused commands:

```powershell
npm run test:judge
npm run test:critical
npm run typecheck
npm run build
```

Do not use the older `src/scripts/verify_*.ts` scripts against a normal development or production server. They are gated by the isolation marker and are retained only as compatibility verification scripts. Destructive maintenance commands (`seed`, `clean-demo`, and `clean-all`) are intentionally not part of this workflow.
