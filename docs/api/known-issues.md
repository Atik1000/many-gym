# Known issues & contract gaps

Everything here was found while integrating the API into this app and reading the published schema at
`https://v0.manygym.com/api/v1/schema/`. Each item says what the client had to do about it.

**Not yet verified against a live authenticated session** — these come from the spec and the ten public
endpoints. The authenticated sweep is still outstanding.

[← All domains](./README.md)

---

## Blocking

### 1. No token refresh endpoint

`POST /auth/login/` and `POST /auth/verify-signup-otp/` both return `{access, refresh, …}`, but **no endpoint
accepts a refresh token**. Nothing matching `/token/refresh/`, `/auth/refresh/` or similar exists in the schema.

An expired access token therefore has no recovery path except a full re-login, which drops the person out of
whatever they were doing. A long editing session will lose work.

*Client:* `lib/api/http.ts` treats every `401` as terminal and redirects to `/login`.

### 2. File upload works, but only through multipart — the JSON form silently can't

**Correction to an earlier reading of this.** The API *does* accept direct binary uploads, on four fields:

| Endpoint | Binary field |
|---|---|
| `POST /gyms/gallery/` | `file` — "Direct file upload (picture or video)" |
| `PATCH /gyms/profile/overview/` | `profile_picture`, `cover_photo` (≤10MB, converted to WebP) |
| `PATCH /posts/{id}/media/{id}/thumbnail/` | `thumbnail_image` |

What makes this easy to miss is that each of those endpoints advertises three content types, and the JSON
variant takes a `media_url`/`profile_picture_url` **capped at 1000 characters**. Sending a data: URL there —
the obvious thing for a client that has just read a file — fails with:

```
400 {"media_url": ["Ensure this field has no more than 1000 characters."]}
```

So the upload path is the multipart one, and nothing in the error points you at it.

Post media works the same way, and is the least discoverable of the lot. `MediaItemInputRequest` documents
only `media_url`, which reads as "images must already be hosted" — but `POST /posts/` accepts repeated binary
entries in its multipart form. Tested against the live API:

| Field name | Result |
|---|---|
| `files` | **201, media attached** and converted to WebP |
| `media_files` | **201, media attached** |
| `file` (singular) | **201 — and silently ignored.** The post is created with `media_count: 0` |
| `media_items[0]file` | `400 {"media_items": [{"media_url": ["This field is required."]}]}` |

The singular `file` is the trap: it is the obvious name, it returns success, and the image just isn't there.

*Client:* `uploadFile()` keeps the picked `File` alongside its preview, and the gallery and overview saves send
it as `multipart/form-data`. The earlier code put a data: URL in `media_url`, which the API rejected — the
reason uploaded photos never appeared.

### 2b. Uploaded media comes back as a server-relative path

An upload returns `media_url` and `resolved_media_url` as paths, not URLs:

```json
{"media_url": "/media/gyms/gallery/original/3dc8c4cd…_gallery-qa.png"}
```

Rendered as-is, that resolves against the *app's* origin and 404s anywhere other than the API host — which is
every deployment. The schema types these as plain strings and says nothing about it.

*Client:* `mediaUrl()` in `lib/api/http.ts` prefixes any relative path with the API base, and every media field
(gallery, post media, avatars, gym profile and cover) goes through it.

### 3. Staff invitations can't be redeemed

Members and staff are treated differently here, and only one half works.

`POST /members/accept-invitation/` **does** redeem a member onboarding invitation — it takes a `token` and
activates the membership. (It requires a signed-in session, which is an odd pairing for an invitation link.)

`POST /access-control/staff/` invites a staff member by email and `StaffAssignment.status` starts at `invited`,
but **nothing redeems a staff invitation**. No endpoint takes a staff invite code and activates the assignment.

*Client:* `/accept?code=…` calls the member endpoint. A staff invitation has nothing to call, so the assignment
is expected to activate server-side once the invited email registers.

---

## Design inconsistencies

### 4. `gym_id` is accepted inconsistently

Tenancy is handled differently per module, with no apparent rule:

| Endpoint group | Takes `gym_id`? |
|---|---|
| `GET/POST /leads/`, `/posts/`, `/routine-templates/` and their `{id}` routes | yes |
| `GET /plans/`, `/members/` (list only) | yes |
| `POST /plans/`, `POST /members/` | **no** |
| `GET/PATCH/DELETE /plans/{id}/`, `/members/{id}/` | **no** |
| `/members/metrics/` | **no** |
| `/plans/metrics/`, `/leads/metrics/` | yes |
| `/dashboard/summary/`, all four `/reports/*` | **required** |

A caller can't learn one rule and apply it. Endpoints that omit it rely entirely on the token's gym context,
which is fine — but then the ones that require it are redundant, and vice versa.

### 5. The same feature is published at six prefixes

Follow is reachable at `/follow/`, `/follows/`, `/users/follow/`, `/auth/follow/`, each with and without
`{target_id}`, plus `/users/{user_id}/follow/`, `/auth/{user_id}/follow/` and `/gyms/{gym_id}/follow/`.
That is **18 operations** for one feature.

`/auth/*` and `/users/*` are likewise complete aliases for profile, password and OTP — another 8.

Roughly **26 of the 149 operations are duplicates**. Every one is a surface that has to stay in sync, and the
docs can't tell a reader which is canonical.

### 6. Pagination is documented as a bare array

`GET /members/`, `/leads/`, `/plans/` and others accept `page` and `page_size`, but their `200` is typed as a
bare array (`[MemberList]`), not an envelope with `count`/`next`/`results`. Two of them — `/access-control/roles/`
and `/access-control/staff/` — *are* typed as `PaginatedRoleList` / `PaginatedStaffAssignmentList`.

So a generated client cannot know whether to read `response` or `response.results`.

*Client:* `asArray()` in `lib/api/adapters.ts` accepts either shape.

### 7. `GET /posts/` is marked public but is not usable publicly

The operation has no security requirement, implying anonymous access. In practice:

```
GET /api/v1/posts/           → 400 {"code":"VALIDATION_ERROR",
                                    "message":"An active Gym context token or 'gym_id' parameter is required."}
GET /api/v1/posts/?gym_id=1  → 404 {"code":"RESOURCE_NOT_FOUND","message":"Gym not found."}
```

`gym_id` is a UUID, so no guessable value works. The endpoint is only usable by someone who already knows a
gym's UUID — which is not what "public" implies.

### 8. Responses documented with no schema

Ten operations declare a `2xx` with no body schema, so a generated client types them as `unknown`. The most
consequential is `GET /access-control/permissions/` — the endpoint that defines the **permission vocabulary**,
which a client needs in order to build a role editor.

*Client:* `lib/permissions.ts` ships a guessed label→scope table and corrects it at runtime via
`syncVocabulary()` once that endpoint responds.

---

## Missing capabilities

### 9. No endpoint lists payments

Payments exist only nested inside `MemberSubscriptionDetail`, reachable through `GET /members/{id}/`. There is no
`/payments/` collection and no transaction log.

Consequences: a per-payment CSV export needs one request per member, and there is no way to show "recent
payments" without fetching the whole directory.

*Client:* the Insights export now emits the revenue report's daily totals instead of individual payments.

### 10. No gym-wide outstanding-balance figure

`/reports/revenue/` reports money collected, never money owed. Outstanding balance is computable only per
subscription (`total_cost` − `total_paid`), i.e. one member at a time.

*Client:* the "Outstanding" KPI reads `0` and the debtors table is empty.

### 11. No previous-period comparison

The revenue report takes a single `start_date`/`end_date` window and returns no comparison figures, so a
"+12% vs last period" indicator can't be built without a second call and client-side arithmetic.

*Client:* the revenue delta indicator is removed.

---

## Missing write paths

These are the ones that caused real bugs in this app: the parent resource's PATCH body silently omits the field,
so a write aimed at it is accepted and discarded.

### 12. No endpoint consumes a session

`MemberSubscriptionDetail` reports `total_sessions` and `remaining_sessions`, and session-based plans are a
first-class plan type — but nothing decrements a session. There is no check-in, attendance or consumption
endpoint anywhere in the schema.

A session-pack gym therefore cannot record the one event its business model is built on.

*Client:* the "Use a session" button is disabled and labelled as unsupported.

### 13. `joining_status` can't be changed

`MemberDetail.joining_status` is `sent_invitation` or `joined`, but `PatchedMemberUpdateRequest` has no such
field. Nothing promotes a member from invited to joined except, presumably, the member accepting.

*Client:* the "Mark as joined" action became "Resend invitation", which is the only related endpoint.

### 14. A staff member's role can't be changed

`PatchedUpdateStaffStatusRequest` carries exactly one field — `status` (`invited`/`active`/`inactive`). There is
no way to move an existing staff member to a different role; the role is fixed at invitation.

*Client:* the role dialog now explains this and offers active/inactive instead. Changing someone's role means
revoking the assignment and re-inviting them, which resets them to `invited`.

### 15. `DELETE /follow/` can't name a target

The unified unfollow route is documented with **no request body and no parameters**:

```
DELETE /api/v1/follow/        requestBody: none, parameters: none
DELETE /api/v1/follow/{target_id}/   (this one does take a path param)
```

As published, the bare `DELETE /follow/` cannot say who to unfollow. Of the six follow prefixes, the DELETE
variants are inconsistent about whether they accept a target at all.

Confirmed live: `DELETE /api/v1/follow/` with a valid gym-context token returns
`400 VALIDATION_ERROR "Validation failed for the submitted data."` — the route exists but is unusable, exactly as
the schema suggested.

*Client:* both directions go through `POST /follow/` with `action: "follow" | "unfollow"`, which is the only
route that reliably identifies a target.

### 16. `/plans/metrics/` has no response schema

Like `GET /access-control/permissions/`, the plan pricing metrics endpoint documents a `200` with no body
schema, so a client can't know what it returns without calling it.

*Client:* the plans screen renders whichever numeric fields come back, labelled from their key names.

---

## Found only by calling it

These four are invisible in the schema. Each was found by running the endpoint with a real gym-owner token,
and each one broke working client code.

### 20. `short_description` has an undocumented 120-character minimum

`PatchedGymOverviewUpdateRequest.short_description` declares no `minLength`, and gym creation accepts a gym
with none at all. But updating it rejects anything shorter than 120 characters:

```
PATCH /api/v1/gyms/profile/overview/   {"short_description": "QA sweep"}
→ 400 {"details": {"short_description": ["Ensure this field has at least 120 characters."]}}
```

A profile form built from the schema lets someone type a one-line description and then fails on save.

### 21. Amenities have two id spaces, and the wrong one fails confusingly

`GymAmenityItem` carries two ids, and which one an endpoint wants is undocumented:

| Field | Meaning | Required by |
|---|---|---|
| `amenity_id` | master catalog id | `PUT /amenities/gym-amenities/sync/` |
| `id` | the gym's own configured row | `PUT /plans/{id}/amenities/`, `POST /members/subscriptions/{id}/extra-amenities/` |

Sending a catalog id where a row id is wanted gives a message that points the wrong way:

```
PUT /api/v1/plans/{id}/amenities/   {"amenity_ids": ["<catalog id>"]}
→ 400 "The following amenity IDs do not belong to this gym or do not exist: [...]"
```

The id *does* exist and *does* belong to the gym — it is simply the wrong one of the two. Retrying with the row
id returns `200`.

*Client:* `resolveAmenityIds()` (row ids) and `resolveCatalogIds()` (catalog ids) are now separate functions,
and syncing clears the cache because a sync mints new row ids. The earlier single resolver returned catalog ids
for everything, which silently broke plan inclusions and member extras.

### 22. "Invite Staff Member" cannot invite anyone

`POST /access-control/staff/` is titled *Invite Staff Member* and its description implies an invitation flow.
It is actually an assign-a-role-to-an-existing-account endpoint:

```
POST /api/v1/access-control/staff/   {"email": "<nobody>", "role_id": "..."}
→ 404 "No registered user found with this email. Staff must register first."

POST /api/v1/access-control/staff/   {"email": "<already registered>", "role_id": "..."}
→ 201, assignment created
```

Nothing emails the person, so a gym owner cannot bring a new colleague on board from the admin panel at all —
the colleague has to find the sign-up page by themselves first. This also explains finding 3: there is no staff
invitation to redeem because no invitation is ever sent.

*Client:* the People screen now says "Add Person" rather than "Invite", explains that the person needs an
account first, and translates the 404 into that instruction. The dead "Invite link" button is gone — it built a
link against a code no endpoint accepts.

### 22b. Two different day-of-week numberings

The same API numbers weekdays two different ways, and only one of them is documented.

| Resource | Numbering | Evidence |
|---|---|---|
| Opening hours (read and write) | **0-based**, `0`=Sunday … `6`=Saturday | `GET /gyms/opening-hours/` returns `0=Sunday`; `GymOpeningHoursBulkItemRequest` declares `minimum: 0, maximum: 6` |
| Routine template days (write) | **1-based**, `1`=Monday … `7`=Sunday | `0` → `400 "Ensure this value is greater than or equal to 1."`; `8` → `400 "… less than or equal to 7."` |

`DayOfWeekEnum` documents only the 0-based form. `DayInputRequest.day_of_week` is a bare `integer` with no
`minimum`, `maximum` or enum, so nothing in the schema hints that it uses the other convention.

The practical effect is worse than a mismatched label: because a weekly routine always includes all seven days,
sending Sunday as `0` makes the **whole request fail**, so no weekly routine template can be saved at all. And
for Monday–Saturday the two conventions happen to coincide, so the bug is invisible until Sunday is involved.

*Client:* `HOURS_DAY` and `ROUTINE_DAY` are now separate maps in `lib/api/adapters.ts`. One shared map meant
every weekly template was rejected.

### 22c. `GymDetail` declares three fields as the wrong type

The schema and the live response disagree about `GET /gyms/profile/`:

| Field | Schema says | Actually returns |
|---|---|---|
| `location` | `string` | an **object**: `{id, address, latitude, longitude, city, country, postal_code, is_primary, updated_at}` |
| `opening_hours_count` | `string` | a **number** (`7`) |
| `gallery_count` | `string` | a **number** (`1`) |

A client generated from the schema types `location` as a string, so the embedded address is unusable and the
caller fetches `/gyms/profile/location/` separately for data it already has. The counts break any arithmetic
without a cast.

*Client:* `loadGym()` reads the embedded `location` and only calls the dedicated location endpoint when it is
absent, saving a request per gym load. The three fields are read through narrowing rather than the generated
types, which are wrong here.

### 23. The permission vocabulary is only discoverable by calling the API

`GET /access-control/permissions/` documents a `200` with no response schema (finding 8), and it is the sole
source of the scope strings a client needs. Fetched with a real token, it returns **19 scopes across 9 topics**:

```
gym_profile:read|edit   leads:read|manage      members:read|edit|delete
people_roles:read|manage  reports:read         routines:read|manage|assign
studio:read|manage      plans:read|manage      trainers:read|manage
```

Two things no reasonable guess would get right: the write verb is `edit`, not `update`, and most topics have a
single `:manage` rather than separate create/update/delete scopes. `reports` has only `read`.

*Client:* `lib/permissions.ts` now carries this verified table. The guessed one it replaced was wrong in nearly
every topic, which would have hidden UI from staff who were entitled to it (gym owners were unaffected —
they are granted everything).

---

## 29. The 409 messages recommend a remedy that does not work

Deleting a member or a plan that has history returns a `409` whose message tells you what to do instead. Doing
exactly that does not unblock the delete:

```
DELETE /api/v1/members/{id}/
→ 409 "Cannot permanently delete a member with payment ledger history.
       Cancel their active subscription instead."

PATCH /api/v1/members/subscriptions/{id}/status/  {"membership_status": "cancelled"}  → 200
DELETE /api/v1/members/{id}/                                                          → 409  (same message)
```

```
DELETE /api/v1/plans/{id}/
→ 409 "Cannot delete a membership plan that has member subscription history.
       Archive the plan instead."

POST   /api/v1/plans/{id}/status/  {"plan_status": "archived"}  → 200
DELETE /api/v1/plans/{id}/                                      → 409  (same message)
```

Verified with the subscription confirmed `cancelled` and the plan confirmed `archived`.

The rule is actually stricter than the message implies: **once a member has any payment, or a plan has any
subscription, it can never be deleted.** Cancelling and archiving change the record's status but do not remove
the history that blocks deletion, and there is no endpoint that deletes a payment.

That is a defensible policy — a payment ledger should not be erasable. The problem is the wording: it reads as
a two-step remedy, so a client implements "cancel, then retry" and retries forever. It would be clearer as
"members with payment history cannot be deleted; cancel their subscription to end it instead", making it plain
that cancelling *is* the end state rather than a step toward deletion.

*Client:* the UI surfaces the server's message as-is. Worth revisiting once the wording is settled.

---

## Hardening

Found by probing the live server unauthenticated — all 149 routes, plus method handling, token handling,
CORS and headers.

### 17a. Logout does not revoke anything

**The most serious issue found.** `POST /auth/logout/` is documented as *"User Logout & Token Revocation"* and
its description says it registers the session in an `auth_tokens` registry. It returns `200`. The access token
then keeps working — indefinitely, and with full privileges:

```
POST /auth/logout/                           → 200
GET  /auth/me/                               → 200   (same token, after logout)
GET  /members/?gym_id=…                      → 200
GET  /dashboard/summary/?gym_id=…            → 200
PATCH /gyms/settings/?gym_id=…               → 200   ← a privileged WRITE succeeds
POST /auth/logout/  (same refresh, replayed) → 200   ← replay is accepted too
```

Re-checked six seconds later in case revocation were asynchronous; all still `200`.

This compounds badly with finding 1. Because there is no refresh endpoint, access tokens have to be
long-lived to be usable at all — and logout cannot cut one short. So "sign out" on a shared or public computer
removes the token from that browser's storage and nothing more: anyone who captured it beforehand keeps full
read **and write** access to the gym until the token expires on its own.

A server-side token denylist (or short access-token lifetimes plus a working refresh endpoint) is the fix.
Nothing a client does can mitigate this.

*Client:* `signOut()` calls the endpoint and clears local storage, which is all it can do. The app cannot make
a token stop working.

### 17b. Context switching does not invalidate the previous token

`POST /auth/switch-context/` correctly issues a new token (`personal` → 0 scopes, `gym` → the gym's 19). But
the token held before the switch stays valid:

```
POST /auth/switch-context/ {personal}  → 200
POST /auth/switch-context/ {gym}       → 200
GET  /auth/me/  using the ORIGINAL pre-switch token → 200
```

So every context switch leaves another working credential in circulation. Benign on its own; with 17a it means
the number of live, unrevokable tokens only ever grows.

### 17. No rate limiting on login

Twelve consecutive wrong passwords for the same account all returned `400`. No `429`, no `Retry-After`, no
lockout, no backoff:

```
POST /api/v1/auth/login/  ×12 wrong passwords
→ 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400
```

Password guessing against this endpoint is therefore unthrottled. The same applies to the OTP endpoints, where
it matters more: a signup or reset code is **6 numeric digits**, so the whole space is a million values and
`verify-reset-otp` / `verify-signup-otp` appear equally unthrottled. An attacker who knows a target's email can
attempt codes until one lands, within the 15-minute window.

This is a server-side fix — per-account and per-IP throttling on login and both OTP verify endpoints, ideally
with the code invalidated after a handful of wrong attempts.

*Client:* nothing. The demo this app replaced had a five-attempt client-side lockout; that was removed with the
rest of the fake auth, and it is deliberately **not** being re-added — a throttle in the browser is bypassable
by anyone calling the API directly, so it would signal protection that does not exist.

### 18. Authentication is checked before the HTTP method

On protected routes a wrong verb answers `401`, not `405`:

| Request | Response |
|---|---|
| `GET /api/v1/auth/login/` (POST-only, public) | `405` + `Allow: POST, OPTIONS` ✅ |
| `GET /api/v1/auth/logout/` (POST-only, protected) | **`401`** + `Allow: POST, OPTIONS` |
| `POST /api/v1/members/metrics/` (GET-only, protected) | **`401`** + `Allow: GET, HEAD, OPTIONS` |

The `Allow` header is correct in every case, so the information is there — but the status code sends a client
looking for a credentials problem when the real fault is the verb. Public routes get this right, which makes the
difference a middleware-ordering artifact rather than a deliberate choice.

### 19. No HSTS

Responses carry `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy: same-origin`,
but **no `Strict-Transport-Security`**. For an API that serves bearer tokens over HTTPS, HSTS is the header that
stops a downgrade attempt from ever reaching the wire.

CORS is `Access-Control-Allow-Origin: *` with credentials *not* allowed — the safe pairing of those two, since
a wildcard origin plus credentials would be rejected by browsers anyway. Worth knowing that any origin may call
the API with a bearer token it has obtained.

---

## Smaller gaps

| Gap | Effect on this app |
|---|---|
| No member number on `MemberDetail` | The UI shows a truncated UUID where it used to show `MG-00248` |
| No `tagline` or `website` on the gym profile | Both fields removed from the profile screen's data |
| Gym posts have no likes, comments or pinning | The Studio UI has all three; they are local-only and reset on reload |
| `StaffAssignment.status` has three states (`invited`/`active`/`inactive`) | The UI models two, so `inactive` currently displays as "invited" |
| `MemberList` omits `subscriptions` | Directory rows rely on the server's precomputed `membership_status` / `payment_status`; detail screens must call `GET /members/{id}/` |
| Plan instalments are an untyped JSON blob (`installment_schedule_config`) | The client shape-checks each entry rather than trusting it |
