# Firestore Security Specifications

This document defines the strict, mathematically verifiable security specifications for the PrintDesk Mission application's Firestore database.

## 1. Data Invariants

1. **Identity Isolation (Zero-Trust User Data)**: A user can only read, create, update, or delete their own user profile document, transactions, presets, and activity logs. The `{userId}` path parameter must exactly match `request.auth.uid`.
2. **Strict Email Verification**: All standard write operations require `request.auth.token.email_verified == true`.
3. **Data Type and Range Constraints**:
   - `User` profile: `email` must match the auth email. `theme` must be either "light" or "dark".
   - `Transaction` entity: `amount` must be a valid number. `type` must be "income" or "expense".
   - `Preset` entity: `name` must be a string <= 100 characters. `sheetSize` must be standard.
   - `ActivityLog` entity: `message` must be a non-empty string.
4. **Timestamp Integrity**: All timestamp fields (`createdAt`, `timestamp`) must match `request.time` exactly.
5. **No Shadow Fields**: Document schemas must be strictly defined, rejecting any unknown fields on document creation or update.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads are designed to attack the system but must always be rejected with `PERMISSION_DENIED`.

### Attack Vector 1: Identity Spoofing (Impersonation)
* **Payload 1 (Attacker attempts to create user profile for a victim)**:
  `path: /users/victim_uid`, `auth: attacker_uid`
  ```json
  {
    "uid": "victim_uid",
    "email": "victim@example.com",
    "displayName": "Imposter",
    "theme": "light",
    "createdAt": "2026-07-09T11:30:00Z"
  }
  ```
* **Payload 2 (Attacker attempts to write a preset into a victim's workspace)**:
  `path: /users/victim_uid/presets/preset_123`, `auth: attacker_uid`
  ```json
  {
    "id": "preset_123",
    "name": "Hacked Preset",
    "layoutType": "passport-max",
    "sheetSize": "A3",
    "createdAt": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 2: Unverified Email Write Escalation
* **Payload 3 (User with unverified email attempts to create transaction)**:
  `path: /users/unverified_uid/transactions/t1`, `auth: unverified_uid` (unverified email)
  ```json
  {
    "id": "t1",
    "title": "Malicious Tx",
    "category": "Groceries",
    "amount": 100,
    "type": "expense",
    "timestamp": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 3: Type and Boundary Poisoning
* **Payload 4 (String injection in amount field)**:
  `path: /users/user_123/transactions/t1`, `auth: user_123`
  ```json
  {
    "id": "t1",
    "title": "Normal Title",
    "category": "Groceries",
    "amount": "ONE_MILLION_DOLLARS",
    "type": "expense",
    "timestamp": "2026-07-09T11:30:00Z"
  }
  ```
* **Payload 5 (Extreme value injection to exhaust server resources or corrupt state)**:
  `path: /users/user_123/presets/preset1`, `auth: user_123`
  ```json
  {
    "id": "preset1",
    "name": "A".repeat(10000), 
    "layoutType": "passport-max",
    "sheetSize": "A3",
    "createdAt": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 4: State & Integrity Shortcutting (Unenforced Enumerations)
* **Payload 6 (Invalid Transaction type enumeration)**:
  `path: /users/user_123/transactions/t1`, `auth: user_123`
  ```json
  {
    "id": "t1",
    "title": "Normal Title",
    "category": "Groceries",
    "amount": 50,
    "type": "robbery", 
    "timestamp": "2026-07-09T11:30:00Z"
  }
  ```
* **Payload 7 (Invalid Theme enumeration in user profile)**:
  `path: /users/user_123`, `auth: user_123`
  ```json
  {
    "uid": "user_123",
    "email": "user@example.com",
    "displayName": "User",
    "theme": "nebula-glow", 
    "createdAt": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 5: Shadow Field & Schema Poisoning (Malicious Additions)
* **Payload 8 (Adding ghost fields like `isAdmin` to gain administrative access)**:
  `path: /users/user_123`, `auth: user_123`
  ```json
  {
    "uid": "user_123",
    "email": "user@example.com",
    "displayName": "User",
    "theme": "light",
    "isAdmin": true, 
    "createdAt": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 6: Timestamp Manipulation
* **Payload 9 (Forging future/past timestamps rather than Server Timestamps)**:
  `path: /users/user_123/transactions/t1`, `auth: user_123`
  ```json
  {
    "id": "t1",
    "title": "Normal Title",
    "category": "Groceries",
    "amount": 50,
    "type": "expense",
    "timestamp": "1999-01-01T00:00:00Z" 
  }
  ```

### Attack Vector 7: Missing Required Keys
* **Payload 10 (Creating a Transaction without required `category` key)**:
  `path: /users/user_123/transactions/t1`, `auth: user_123`
  ```json
  {
    "id": "t1",
    "title": "Missing category",
    "amount": 50,
    "type": "expense",
    "timestamp": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 8: Resource Poisoning via Path Malformation
* **Payload 11 (Extremely long document ID poisoning to trigger Denial of Wallet)**:
  `path: /users/user_123/transactions/` + "A".repeat(2000), `auth: user_123`
  ```json
  {
    "id": "t1",
    "title": "ID poisoning",
    "category": "Standard",
    "amount": 10,
    "type": "expense",
    "timestamp": "2026-07-09T11:30:00Z"
  }
  ```

### Attack Vector 9: Blanket Query Scraping (No Relational Constraint)
* **Payload 12 (An authenticated user attempting a blanket collection group query or non-userId query to scrape all transactions)**:
  `path: /users/other_user/transactions`, `auth: user_123`
  `Query: getDocs(collectionGroup("transactions"))` (should be securely blocked on rule level)

---

## 3. The Test Runner Reference

These conditions are enforced inside `firestore.rules` and validated by our automated deployment checks.
