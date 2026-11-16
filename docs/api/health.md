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
| `200` | HealthCheckResponse |  |
| `503` | _no schema documented_ | One or more infrastructure services unavailable |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `status` | string | Overall system health status ('healthy' or 'unhealthy'). |
| `service` | string | Service identifier. |
| `timestamp` | number(double) | Current Unix timestamp. |
| `components` | object | Component statuses. |
| `latency_ms` | number(double) | Latency in milliseconds. |

</details>

---
