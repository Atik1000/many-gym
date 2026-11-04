# Messaging

10 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/messaging/conversations/`

**List Conversations**

- **Auth:** Bearer JWT
- **operationId:** `messaging_conversations_list`

Lists active conversations for the authenticated user or active gym context with zero N+1 queries.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym context UUID |
| `limit` | integer | no | Optional pagination limit (1-100) |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of ConversationList |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `conversation_type` | enum: `user_to_user` \| `user_to_gym` \| `gym_to_gym` |  |
| `user_a` | string(uuid) \| null |  |
| `user_b` | string(uuid) \| null |  |
| `gym_a` | string(uuid) \| null |  |
| `gym_b` | string(uuid) \| null |  |
| `participants` | array of ConversationParticipant | read-only. |
| `other_party` | object | read-only. |
| `last_message_at` | string(date-time) \| null |  |
| `last_message_preview` | string |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/messaging/conversations/`

**Create / Get Conversation**

- **Auth:** Bearer JWT
- **operationId:** `messaging_conversations_create`

Initiates or retrieves an encrypted conversation across supported channel types.

**Request body** — `application/json` (ConversationCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `conversation_type` | string | no | Optional: 'user_to_user', 'user_to_gym', 'gym_to_user', 'gym_to_gym'. Auto-detected if omitted. |
| `target_user_id` | string(uuid) \| null | no |  |
| `target_gym_id` | string(uuid) \| null | no |  |
| `source_gym_id` | string(uuid) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | ConversationList |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `conversation_type` | enum: `user_to_user` \| `user_to_gym` \| `gym_to_gym` |  |
| `user_a` | string(uuid) \| null |  |
| `user_b` | string(uuid) \| null |  |
| `gym_a` | string(uuid) \| null |  |
| `gym_b` | string(uuid) \| null |  |
| `participants` | array of ConversationParticipant | read-only. |
| `other_party` | object | read-only. |
| `last_message_at` | string(date-time) \| null |  |
| `last_message_preview` | string |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/messaging/conversations/{conversation_id}/`

**Get Conversation Detail**

- **Auth:** Bearer JWT
- **operationId:** `messaging_conversations_retrieve`

Retrieves full details for a conversation.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `conversation_id` | string | yes | UUID of the conversation |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym context UUID |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ConversationList |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `conversation_type` | enum: `user_to_user` \| `user_to_gym` \| `gym_to_gym` |  |
| `user_a` | string(uuid) \| null |  |
| `user_b` | string(uuid) \| null |  |
| `gym_a` | string(uuid) \| null |  |
| `gym_b` | string(uuid) \| null |  |
| `participants` | array of ConversationParticipant | read-only. |
| `other_party` | object | read-only. |
| `last_message_at` | string(date-time) \| null |  |
| `last_message_preview` | string |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/messaging/conversations/{conversation_id}/messages/`

**Get Encrypted Message History**

- **Auth:** Bearer JWT
- **operationId:** `messaging_conversations_messages_list`

Retrieves chronological encrypted messages for the conversation.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `conversation_id` | string | yes | UUID of the conversation |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym context UUID |
| `limit` | integer | no | Pagination limit for message history (max 100, default 50) |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of EncryptedMessage |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `conversation_id` | string(uuid) | read-only. |
| `sender_type` | enum: `user` \| `gym` |  |
| `sender_user_id` | string(uuid) \| null | read-only. |
| `sender_user_full_name` | string \| null | read-only. |
| `sender_gym_id` | string(uuid) \| null | read-only. |
| `sender_gym_name` | string | read-only. |
| `sender_device_id` | string |  |
| `ciphertext` | string | Base64 ciphertext of the encrypted message |
| `nonce` | string | Base64 initialization vector / nonce |
| `ephemeral_public_key` | string | Sender ephemeral X25519 public key (Base64) |
| `recipient_key_fingerprint` | string | Fingerprint of recipient's public key used |
| `encrypted_keys` | any | Multi-device or gym staff wrapped session keys: {participant_or_device_id: encrypted_key} |
| `delivery_status` | enum: `sent` \| `delivered` \| `read` |  |
| `sent_at` | string(date-time) |  |
| `delivered_at` | string(date-time) \| null |  |
| `read_at` | string(date-time) \| null |  |

</details>

---

## POST `/api/v1/messaging/conversations/{conversation_id}/messages/`

**Send Encrypted Message**

- **Auth:** Bearer JWT
- **operationId:** `messaging_conversations_messages_create`

Sends an E2EE encrypted message to the conversation with real-time broadcast.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `conversation_id` | string | yes | UUID of the conversation |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym context UUID |

**Request body** — `application/json` (SendMessageRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `ciphertext` | string | yes | Base64 ciphertext string |
| `nonce` | string | yes | Base64 nonce / IV |
| `ephemeral_public_key` | string | no |  |
| `recipient_key_fingerprint` | string | no |  |
| `sender_device_id` | string | no |  |
| `encrypted_keys` | object | no |  |
| `sender_type` | enum: `user` \| `gym` | no |  |
| `sender_gym_id` | string(uuid) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | EncryptedMessage |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `conversation_id` | string(uuid) | read-only. |
| `sender_type` | enum: `user` \| `gym` |  |
| `sender_user_id` | string(uuid) \| null | read-only. |
| `sender_user_full_name` | string \| null | read-only. |
| `sender_gym_id` | string(uuid) \| null | read-only. |
| `sender_gym_name` | string | read-only. |
| `sender_device_id` | string |  |
| `ciphertext` | string | Base64 ciphertext of the encrypted message |
| `nonce` | string | Base64 initialization vector / nonce |
| `ephemeral_public_key` | string | Sender ephemeral X25519 public key (Base64) |
| `recipient_key_fingerprint` | string | Fingerprint of recipient's public key used |
| `encrypted_keys` | any | Multi-device or gym staff wrapped session keys: {participant_or_device_id: encrypted_key} |
| `delivery_status` | enum: `sent` \| `delivered` \| `read` |  |
| `sent_at` | string(date-time) |  |
| `delivered_at` | string(date-time) \| null |  |
| `read_at` | string(date-time) \| null |  |

</details>

---

## POST `/api/v1/messaging/conversations/{conversation_id}/read/`

**Mark Conversation Read**

- **Auth:** Bearer JWT
- **operationId:** `messaging_conversations_read_create`

Marks messages in a conversation as read, resetting unread badges and broadcasting read receipts.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `conversation_id` | string | yes | UUID of the conversation |

**Request body** — `application/json` (MarkReadRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `gym_id` | string(uuid) \| null | no |  |
| `up_to_message_id` | string(uuid) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Read count confirmed |

---

## POST `/api/v1/messaging/keys/gym/register/`

**Register Gym E2EE Key Bundle**

- **Auth:** Bearer JWT
- **operationId:** `messaging_keys_gym_register_create`

Registers public cryptographic keys for a Gym entity to enable encrypted messaging with users and gyms.

**Request body** — `application/json` (GymDeviceKeyRegisterRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |
| `device_id` | string | yes |  |
| `device_name` | string | no |  |
| `identity_key` | string | yes |  |
| `signed_prekey` | string | yes |  |
| `signed_prekey_signature` | string | no |  |
| `one_time_prekeys` | array of string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Gym E2EE keys registered successfully. |

---

## GET `/api/v1/messaging/keys/gym/{gym_id}/`

**Get Gym E2EE Public Key Bundle**

- **Auth:** Bearer JWT
- **operationId:** `messaging_keys_gym_list`

Fetches public keys for recipient gym.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | yes | UUID of recipient Gym entity |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of PublicKeyBundle |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `device_id` | string |  |
| `device_name` | string |  |
| `algorithm` | string |  |
| `identity_key` | string |  |
| `signed_prekey` | string |  |
| `signed_prekey_signature` | string |  |
| `one_time_prekeys` | array of string |  |

</details>

---

## POST `/api/v1/messaging/keys/register/`

**Register User Device E2EE Key Bundle**

- **Auth:** Bearer JWT
- **operationId:** `messaging_keys_register_create`

Registers public Identity Key, Signed Prekey, and One-Time Prekeys for client-side E2EE.

**Request body** — `application/json` (UserDeviceKeyRegisterRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `device_id` | string | yes |  |
| `device_name` | string | no |  |
| `identity_key` | string | yes |  |
| `signed_prekey` | string | yes |  |
| `signed_prekey_signature` | string | no |  |
| `one_time_prekeys` | array of string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Device E2EE keys registered successfully. |

---

## GET `/api/v1/messaging/keys/user/{user_id}/`

**Get User E2EE Public Key Bundle**

- **Auth:** Bearer JWT
- **operationId:** `messaging_keys_user_list`

Fetches public keys for recipient user's registered devices.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | Account UUID or Profile UUID of recipient user |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of PublicKeyBundle |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `device_id` | string |  |
| `device_name` | string |  |
| `algorithm` | string |  |
| `identity_key` | string |  |
| `signed_prekey` | string |  |
| `signed_prekey_signature` | string |  |
| `one_time_prekeys` | array of string |  |

</details>

---
