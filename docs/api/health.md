# health

1 endpoint. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/health/`

**Service Health Check**

- **Auth:** public — no token
- **operationId:** `health_retrieve`

Verifies the operational status of the Web API, PostgreSQL database, and Redis cache.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | All infrastructure components healthy |
| `503` | _no schema documented_ | One or more infrastructure services unavailable |

---
