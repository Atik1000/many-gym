# Known issues & contract gaps

Everything here was found while integrating the API into this app and reading the published schema at
`https://v0.manygym.com/api/v1/schema/`. Each item says what the client had to do about it.

**Not yet verified against a live authenticated session** — these come from the spec and the ten public
endpoints. The authenticated sweep is still outstanding.

[← All domains](./README.md)

---

## Blocking

### 1. ~~No token refresh endpoint~~ — fixed in the API

**Resolved.** The schema now publishes `POST /auth/refresh/` (also at `/auth/token/refresh/` and
`/token/refresh/`): it takes `{refresh}`, returns a new pair, keeps the context claims and rotates the refresh
token.

*Client:* `lib/api/http.ts` now answers a `401` by refreshing once (single-flight, shared across tabs) and
retrying the request; only a refused refresh signs the person out. Not yet exercised against a live session.

What remains is smaller: the same operation at three paths, with nothing saying which is canonical (see #38).

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

It also cannot activate "once the invited email registers": `POST /access-control/staff/` only accepts an
email that is **already** registered (404 otherwise), so there is no later registration to hang activation
on. Left alone, an invited assignment stays `invited` indefinitely.

The one route that does move it is `PATCH /access-control/staff/{assignment_id}/` with `{"status": "active"}`,
which needs `people_roles:manage` — i.e. the inviter, not the invitee.

*Client:* `/accept?code=…` calls the member endpoint only. For staff, People & Roles shows an **Activate**
button on every `invited` row (and **Reactivate** on `inactive` ones) that sends that PATCH, and the add-person
form says the person must be activated. All three statuses are shown; `inactive` used to be displayed as
"Invited".

*Wanted from the API:* either create the assignment as `active` (the person is a known account and the admin
has chosen a role, so there is nothing left to redeem), or add `POST /access-control/staff/accept/` taking the
invite token so the invitee can accept, mirroring the member flow. Whether an `invited` assignment already
lets the person switch into the gym is not documented and has not been verified.

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

### 5. The same feature is published at several prefixes

The follow routes were trimmed in the schema: `/follow/`, `/users/follow/`, `/auth/follow/` and
`/auth/{user_id}/follow/` are no longer documented, leaving `/follows/` (with and without `{target_id}`),
`/users/{user_id}/follow/` and `/gyms/{gym_id}/follow/`. **The removed ones are still served** — see #39.

The pattern has spread to the newer features, though. Each of these is one capability at two or three paths:

| Feature | Published at |
|---|---|
| Token refresh | `/auth/refresh/`, `/auth/token/refresh/`, `/token/refresh/` |
| Login & security settings (8 operations) | `/users/settings/security/…` and `/auth/settings/security/…` |
| Follow requests (list, accept, reject, cancel) | `/users/follow-requests/…` and `/auth/follow-requests/…`, plus by-user-id forms `/{users,auth}/{user_id}/follow/{accept,confirm,reject,cancel}/` — `accept` and `confirm` being the same thing |
| Block a follower | `/users/followers/{id}/block/`, `/users/settings/followers/{id}/block/`, `/users/settings/blocked-users/followers/{id}/`, and two more under `/auth/settings/` |
| Admin logs (6 operations) | `/gyms/admin-logs/…` and `/gyms/logs/admin/…` |
| Comments (7 operations) | `/posts/{post_id}/comments/…` and `/comments/…` |
| Reactions (4 operations × post, comment, story) | `/{target}/{id}/reactions/…` and `/reactions/{target}/{id}/…`, plus a third for comments under `/posts/{post_id}/comments/{comment_id}/reactions/` and a generic `POST /reactions/` |
| Member joining requests | `/members/requests/…` and `/gyms/{gym_id}/member-requests/…`; submitting is also `POST /gyms/{gym_id}/join-request/` |
| Feed | `/posts/` and `/posts/feed/`; repost at `/posts/{id}/repost/` and `/posts/repost/` |
| Gym search / public profile | `/gyms/nearby/` and `/gyms/search/`; `/gyms/{id}/public/` and `/gyms/{id}/detail/` |

Of the 291 operations, [coverage.md](./coverage.md) counts the ones this client never needs to call because a
twin already does the job (`duplicate` and `superseded`), and a further share of the `handwritten` ones exist
only as fallbacks in a chain. Every one is a surface that has to stay in sync, and the docs can't tell a
reader which is canonical.

*Client:* each family is a fallback chain (`lib/api/fallback.ts`), preferred path first.

### 6. Pagination is documented as a bare array — partly fixed

`GET /members/`, `/leads/`, `/plans/` and `/posts/` are now typed as envelopes (`PaginatedMemberListList`, …),
matching `/access-control/roles/` and `/staff/`. Nine list operations still accept `page` / `page_size` while
documenting a bare array: `/routine-templates/`, `/gyms/followed/`, `/gyms/{gym_id}/followers/`,
`/gyms/{gym_id}/members/`, `/users/{user_id}/following/`, `/users/follow-requests/` (and its `/auth/` twin),
`/members/requests/` and `/gyms/{gym_id}/member-requests/`.

For those, a generated client still cannot know whether to read `response` or `response.results`.

*Client:* `asArray()` in `lib/api/adapters.ts` accepts either shape.

### 7. ~~`GET /posts/` is marked public but is not usable publicly~~ — fixed in the API

**Resolved.** An anonymous `GET /api/v1/posts/` now answers `200` with a paginated envelope of public posts
(checked 2026-11-16), and `feed_type` selects the personalised views for a signed-in caller. What follows is
the earlier behaviour, kept for the record.

The operation has no security requirement, implying anonymous access. In practice it used to answer:

```
GET /api/v1/posts/           → 400 {"code":"VALIDATION_ERROR",
                                    "message":"An active Gym context token or 'gym_id' parameter is required."}
GET /api/v1/posts/?gym_id=1  → 404 {"code":"RESOURCE_NOT_FOUND","message":"Gym not found."}
```

`gym_id` is a UUID, so no guessable value works. The endpoint is only usable by someone who already knows a
gym's UUID — which is not what "public" implies.

### 8. Responses documented with no schema

The original ten have been given schemas — `GET /access-control/permissions/` is now
`SystemPermissionsByTopicResponse`, and the catalog, health and both metrics endpoints are typed too. Ten
*different* operations declare a `2xx` with no body schema today: `PUT /enquiries/{id}/`,
`POST /gyms/{gym_id}/followers/{user_id}/block/`, `GET /gyms/{gym_id}/following/`, both admin-log `export/`
routes (a file download, so reasonable), `POST /messaging/conversations/{id}/read/`, the two messaging
key-registration routes, and the education and social-link `DELETE`s.

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

**Update:** `/follow/` has left the schema (though it is still served — #39). Its surviving twin,
`DELETE /follows/`, now documents an optional `target_id` **query** parameter, which answers the original
complaint for the one route that is still published.

Confirmed live: `DELETE /api/v1/follow/` with a valid gym-context token returns
`400 VALIDATION_ERROR "Validation failed for the submitted data."` — the route exists but is unusable, exactly as
the schema suggested.

*Client:* both directions now go through the target-in-path routes (`POST|DELETE /gyms/{id}/follow/`,
`/users/{id}/follow/`) — the ones that report `status` / `request_id` for follow approval — with the unified
`POST /follows/` (`action: "follow" | "unfollow"`) as the fallback. The bare `DELETE`s stay last in the chain.

### 16. ~~`/plans/metrics/` has no response schema~~ — fixed in the API

**Resolved.** It is now typed as `MembershipPlanMetrics` (and `/members/metrics/` as `MemberMetrics`).

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

## 30. Deleting a gym needs two fields the schema does not declare

`GymAccessControlActionRequest` declares a single required property, `action`. The destructive actions need
more than that, and you only discover each one by hitting the error:

```
POST /api/v1/gyms/settings/access-control/
  {"action": "delete"}                                    → 400 "Password is required to delete gym."
  {"action": "delete", "password": "…"}                   → 400 "Confirmation text is required. Please type 'delete'"
  {"action": "delete", "password": "…", "confirmation": "delete"}  → 200
```

Requiring a password and a typed confirmation to destroy a gym is good design. The problem is only that
neither field appears in the schema, so no generated client can offer them and no reader knows they exist.

## 31. A deleted gym stays in `accessible_gyms` but 404s when opened

After a successful delete, `GET /auth/me/` keeps listing the gym:

```
GET  /api/v1/auth/me/              → accessible_gyms still contains the deleted gym
POST /api/v1/auth/switch-context/  {"gym_id": "<deleted>"}  → 404 "Gym not found."
```

The list is the only way a client knows which gyms an account can use, so a stale entry is worse than a
missing one: any UI built from it offers a gym that cannot be opened.

This had a sharp edge. A client that signs people into `accessible_gyms[0]` — the obvious implementation —
**locks the account out entirely** the moment the first entry is a deleted gym, even while its other gyms are
perfectly healthy. That is exactly what happened here after deleting two unused gyms.

*Client:* sign-in tries each gym in turn and stops at the first that opens, falling back to personal context
if none do; `AuthProvider` decides onboarding from the gym the token actually carries rather than the length
of the list; and a gym that 404s on switch is dropped from the cached profile so the switcher stops offering
it.

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
| Gym posts have no pinning | The Studio UI has a pin; it is local-only and resets on reload. (Likes and comments are now real: the reactions and comments APIs.) |
| `MemberList` omits `subscriptions` | Directory rows rely on the server's precomputed `membership_status` / `payment_status`; detail screens must call `GET /members/{id}/` |
| Plan instalments are an untyped JSON blob (`installment_schedule_config`) | The client shape-checks each entry rather than trusting it |

---

## 32. A page number past the end answers `404`, not an empty page

`GET /members/?gym_id=…&page=99999` → `404 NOT_FOUND`. So do `page=0`, `page=-1` and `page=abc`. A client
walking pages has to treat a late `404` as "end of list" rather than an error, which `collect()` in
`lib/api/adapters.ts` does.

## 33. The same list endpoint answers two different shapes

Without a `page` parameter, `/members/` and `/plans/` answer a **bare array** while `/leads/`, `/posts/` and
`/access-control/staff/` answer a `{count, next, previous, results}` envelope. Passing `page` switches every
one of them to the envelope. The bare form carries no `count`, so a truncated list cannot be told apart from
a complete one — which is why every list call now passes `page`/`page_size` explicitly.

## 34. ~~`/plans/` paginates, but the schema does not say so~~ — fixed in the API

**Resolved:** the schema now documents `page` / `page_size` and a `PaginatedMembershipPlanListList` response,
and the client's signature matches. Previously: `plansList` documented no `page` or `page_size`, yet `GET /plans/?page=1&page_size=100` returns a full
paginated envelope (`count: 7, total_pages: 1`). The generated signature therefore needs a cast at the one
call site that pages through plans.

## 35. A non-UUID path id returns Django's HTML 404 page

`GET /members/abc/` answers `404` with an HTML body (`<!doctype html>…Not Found`) instead of the API's JSON
envelope — unlike a well-formed but unknown UUID, which correctly returns `RESOURCE_NOT_FOUND`. `request()`
already falls back to a status-based message when the body will not parse, so the UI shows "Member not
found" rather than raw markup.

## 36. `gym_id` is validated but not used for scoping

With a gym-context token, `GET /members/?gym_id=<a different gym you can access>` returns the **token's**
gym's members, not that gym's. A malformed or unknown `gym_id` still answers `404 Gym not found`, so the
parameter is checked and then ignored. Nothing leaks across accounts, but the parameter cannot be relied on
to select a gym — only the token context does that.

## 37. Gyms deleted through the API are still listed in `accessible_gyms`

Two gyms deleted earlier in this integration still appear in `GET /auth/me/`. See `lib/auth.ts`, which prunes
them client-side on the first `404`.

## 38. Unnamed twin operations

Six operations have no `summary`, no description of their own and — for the `PUT`s — no documented request or
response: `PUT /enquiries/{enquiry_id}/`, `PUT /users/profile/about/`, and the `DELETE` forms of the four
follow-request cancel routes (`DELETE /{users,auth}/follow-requests/{request_id}/cancel/`,
`DELETE /{users,auth}/{user_id}/follow/cancel/`), which answer `204` beside a documented `POST` that answers
`200`. They look like framework defaults that were never switched off. They also carry lowercase catch-all
tags (`enquiries`, `users`, `auth`, `posts`, `comments`, `stories`) instead of their feature's tag, so they
land in their own groups in generated docs and collections.

*Client:* the `PATCH` forms are used; the `PUT`s are declared variants of them in
`scripts/check-api-coverage.mjs`. The cancel routes are not called at all — withdrawing a follow request goes
through `DELETE /users/{user_id}/follow/`, which the follow guide documents for both unfollow and cancel.

## 39. Routes removed from the schema are still served

23 operations present in the earlier schema are gone from the current one — the `/follow/`, `/users/follow/`
and `/auth/follow/` families, `/auth/{user_id}/follow|followers|following/`, and the `/users/` twins of
register, the OTP routes and the password routes. Probed unauthenticated on 2026-11-16, **every one still
answers with the API's own error envelope** (`401 AUTHENTICATION_REQUIRED`, or `400 VALIDATION_ERROR` for the
public ones); a route that does not exist answers a bare HTML `404`. They are undocumented, not removed.

If they are meant to be gone, they should stop routing; if they are kept for older clients, the schema should
mark them `deprecated` rather than omit them. The per-route record is the `RETIRED` table in
`scripts/check-api-conformance.mjs`.

*Client:* the generated functions for them are kept as the tail of the fallback chains, so nothing breaks
whichever way this is settled.

## 40. `GET /reactions/items/` is documented as an array and answers an envelope

The schema types the `200` as `[ReactionItem]`. Live, unauthenticated, it answers
`{"count": 13, "results": [ … ]}` — neither the documented array nor the standard pagination envelope (there is
no `next`, `previous`, `total_pages` or `current_page`). It is the mirror image of #6.

*Client:* `lib/api/reactions.ts` accepts either shape.

## 41. ~~`messaging/keys` responses are documented as arrays~~ — fixed in the local contract

Authenticated messaging integration confirmed that `GET /messaging/keys/user/{user_id}/` and
`/messaging/keys/gym/{gym_id}/` answer wrapper objects containing the recipient ID and `devices`. The local
OpenAPI contract now declares `UserKeyBundleResponse` and `GymKeyBundleResponse`, matching the client.

## 42. ~~Notifications: the spec and the deployment disagree in four places~~ — three fixed in the API

First checked against `v0.manygym.com` without a session (route existence, CORS, the published schema).
**Re-checked the same way on 2026-11-19: three of the four are resolved.** The response bodies of the
authenticated routes are still unconfirmed.

- ~~**`X-Gym-Context` cannot be sent from a browser.**~~ **Resolved** — the preflight's
  `access-control-allow-headers` now includes `x-gym-context`. The client still does not send it: it always
  holds a token minted for the context it is showing, and the header is optional.
- ~~**Three documented routes are not served.**~~ **Resolved** — `POST /notifications/batch-read/`,
  `DELETE /notifications/clear-read/` and the `…/{id}/mark-read/` alias now answer the API's own
  `401 AUTHENTICATION_REQUIRED` instead of Django's HTML `404`, and all three are in the published schema.
- ~~**The list is documented two ways.**~~ **Resolved** — the published schema now types `GET /notifications/`
  as `NotificationPaginatedResponse`, the envelope the integration spec shows. It also documents two filters
  the integration spec does not mention, `target_type` and `target_id`, and a 100-id cap on `batch-read/`.
- **The socket event is not in the messaging spec.** Still open. `notification.alert` arrives on `/ws/chat/`
  alongside the chat events, with no `actor`, `actor_gym` or `gym`.

Smaller things in the published schema: `POST …/{id}/read/`, `POST …/{id}/mark-read/` and
`POST /notifications/devices/unregister/` declare a `200` with no body schema (the `PATCH` twins are typed),
and `DELETE /notifications/devices/unregister/` is documented as `204` where the integration spec shows a
`200` with `{unregistered, message}` for both methods.

*Client:* `lib/api/notifications.ts` sends no `X-Gym-Context`, calls `batch-read/` (100 ids at a time) and
`clear-read/` first and keeps the per-notification routes as a fallback, uses `PATCH …/read/` and
`POST devices/unregister/`, and accepts either list shape. The bell treats a socket alert as a cue to re-read
the count and the first page rather than trusting the event's own fields.

### Checked and correct

Worth recording because each of these is a common place for an API to go wrong, and this one does not:

- `POST /auth/forgot-password/` answers `200` with the same neutral message for a registered and an
  unregistered address — no user enumeration.
- Validation is enforced server-side at every boundary tried: 500-character names (`max 100`), negative and
  non-numeric prices, zero durations, blank and null required fields, malformed emails, duplicate member
  emails (`409 RESOURCE_CONFLICT`).
- Search accepts `<script>` tags, SQL fragments, 500-character strings and emoji without error — each simply
  matches nothing. No `dangerouslySetInnerHTML` exists anywhere in the client, so stored markup cannot
  execute.
- A missing, malformed, empty or wrong-scheme `Authorization` header all answer `401 AUTHENTICATION_REQUIRED`.
