# Dashboard & Reports

5 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/dashboard/summary/`

**Executive Dashboard Summary**

- **Auth:** Bearer JWT
- **operationId:** `dashboard_summary_retrieve`

Retrieves management headline metrics including active members, expiring memberships, leads, pending tasks, and revenue.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | DashboardSummary |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `gym_id` | string(uuid) |  |
| `gym_name` | string |  |
| `generated_at` | string(date-time) |  |
| `headline_metrics` | HeadlineMetrics |  |

</details>

---

## GET `/api/v1/reports/leads-funnel/`

**Lead Conversion Funnel Report**

- **Auth:** Bearer JWT
- **operationId:** `reports_leads_funnel_retrieve`

Computes sales funnel conversion rates from New to Joined, drop-off percentages, acquisition sources, and lost reasons.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `end_date` | string | no | YYYY-MM-DD |
| `gym_id` | string | yes |  |
| `start_date` | string | no | YYYY-MM-DD |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LeadFunnelReport |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `gym_id` | string(uuid) |  |
| `start_date` | string |  |
| `end_date` | string |  |
| `total_leads` | integer |  |
| `funnel_stages` | FunnelStages |  |
| `conversion_rates` | ConversionRates |  |
| `stage_breakdown` | array of LeadStageCount |  |
| `lost_reason_distribution` | array of LostReasonCount |  |
| `source_breakdown` | array of SourceCount |  |

</details>

---

## GET `/api/v1/reports/membership-growth/`

**Membership Growth & Churn Report**

- **Auth:** Bearer JWT
- **operationId:** `reports_membership_growth_retrieve`

Analyzes member acquisition, new subscriptions, cancellations, net growth, and churn rate over a date range.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `end_date` | string | no | YYYY-MM-DD |
| `gym_id` | string | yes |  |
| `start_date` | string | no | YYYY-MM-DD |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MembershipGrowthReport |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `gym_id` | string(uuid) |  |
| `start_date` | string |  |
| `end_date` | string |  |
| `total_members` | integer |  |
| `active_subscriptions` | integer |  |
| `new_members_in_period` | integer |  |
| `new_subscriptions_in_period` | integer |  |
| `cancelled_subscriptions_in_period` | integer |  |
| `net_growth` | integer |  |
| `churn_rate_percentage` | number(double) |  |
| `status_breakdown` | array of SubscriptionStatusBreakdown |  |
| `plan_breakdown` | array of PlanActiveSubscription |  |

</details>

---

## GET `/api/v1/reports/revenue/`

**Revenue & Collections Report**

- **Auth:** Bearer JWT
- **operationId:** `reports_revenue_retrieve`

Aggregates total payments, breakdown by payment method, plan distribution, and daily revenue collections over a date range.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `end_date` | string | no | YYYY-MM-DD |
| `gym_id` | string | yes |  |
| `start_date` | string | no | YYYY-MM-DD |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RevenueReport |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `gym_id` | string(uuid) |  |
| `start_date` | string |  |
| `end_date` | string |  |
| `total_revenue` | number(double) |  |
| `total_transactions` | integer |  |
| `average_transaction_value` | number(double) |  |
| `payment_method_breakdown` | array of PaymentMethodBreakdown |  |
| `plan_distribution` | array of PlanRevenueDistribution |  |
| `daily_breakdown` | array of DailyRevenueBreakdown |  |

</details>

---

## GET `/api/v1/reports/trainer-workload/`

**Trainer Workload & Allocation Report**

- **Auth:** Bearer JWT
- **operationId:** `reports_trainer_workload_retrieve`

Reports active member counts, routine assignments, and workload breakdown per gym trainer and staff member.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | TrainerWorkloadReport |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `gym_id` | string(uuid) |  |
| `gym_name` | string |  |
| `total_active_staff` | integer |  |
| `total_assigned_members` | integer |  |
| `total_active_routines` | integer |  |
| `average_members_per_trainer` | number(double) |  |
| `trainers` | array of TrainerWorkloadItem |  |

</details>

---
