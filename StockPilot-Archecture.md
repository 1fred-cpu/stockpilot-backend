STORES MODULE

1. Responsibilities of the Stores Module

Manage CRUD for stores (create, update, delete, list).

Link stores to businesses (multi-tenant setup).

Manage users & permissions per store.

Provide APIs for:

Store selection in dashboard.

Store-specific analytics (stock, sales, etc.).

Emit events when stores are created/updated (so inventory, analytics, etc. can react).

2. High Level Layered Design [Frontend] → [API Gateway] → [Stores Module] → [Database]
   │
   ├──> Inventory Module
   ├──> Orders Module
   └──> Analytics Module

3. Stores Module Components
   A. Controller Layer

   Handles API requests:

   POST /stores → Create store

   GET /stores → List stores

   GET /stores/:id → Get store details

   PATCH /stores/:id → Update store

   DELETE /stores/:id → Archive/delete store

   POST /stores/:id/users → Assign user to store

   B. Service Layer

   Business logic:

   Validate store uniqueness (no duplicates per business).

   Handle role assignment (owner, manager, staff).

   Initialize inventories when new store is created.

   Emit domain events (e.g., StoreCreated, StoreUpdated).

   C. Repository Layer

   Data access:

   stores table → store definitions.

   store_users → user assignments.

   business_stores → links store to business.

   D. Integration Layer

   Publishes events to:

   Inventory Module → create empty stock rows.

   Orders Module → tag orders with store_id.

   Analytics Module → prepare new store for reporting.

4. Database Design for Stores Module
   -- Stores Table
   stores (
   id uuid primary key,
   business_id uuid references businesses(id),
   name text not null,
   location text,
   type text check (type in ('physical','online')),
   timezone text default 'UTC',
   currency text default 'USD',
   created_at timestamp default now(),
   updated_at timestamp default now()
   );

   -- Store Users (role-based)
   store_users (
   id uuid primary key,
   store_id uuid references stores(id),
   user_id uuid references users(id),
   role text check (role in ('owner','manager','staff')),
   created_at timestamp default now()
   );

   -- Business-Store Link (multi-tenant support)
   business_stores (
   business_id uuid references businesses(id),
   store_id uuid references stores(id),
   primary key (business_id, store_id)
   );

5. Workflow: Creating a Store (Detailed)
   User Action

   User clicks “Add Store” in frontend.

   Fills form: Store name, type, location, timezone.

   Clicks Save.

   Backend Steps

   Controller: Receive POST /stores.

   Service:

   Validate request (name not empty, business exists).

   Create store in DB.

   Assign current user as owner in store_users.

   Repository: Insert into stores, business_stores, store_users.

   Event: Emit StoreCreated → Inventory Module.

   Inventory Module:

   For each product, create empty inventory row with stock=0.

   Response: Return new store object.

   Example Response
   {
   "id": "store_123",
   "name": "Kumasi Branch",
   "type": "physical",
   "location": "Kumasi, Ghana",
   "timezone": "Africa/Accra",
   "currency": "GHS"
   }

6. Workflow: Assigning Users to a Store
   User Action

   Owner selects store → goes to “Users & Permissions” → adds staff member.

   Backend Steps

   Controller: POST /stores/:id/users

   Service:

   Validate user belongs to business.

   Insert into store_users with role (manager/staff).

   Event: Emit UserAssignedToStore.

   Response: Return updated list of store users.

EVENTS EMITTERS

🔹 Event-Driven Flow in the Stores Module

We’ll use a pub/sub (publish–subscribe) approach so that the Stores Module emits events and other modules subscribe to them.

This can be done with:

Message broker (e.g., Kafka, RabbitMQ, NATS).

Or lightweight event bus (in-memory, Redis, or Postgres LISTEN/NOTIFY).

1. Example Events the Stores Module Emits
   | Event Name | When it Happens | Payload Example | Who Listens |
   | ---------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ---------------------------- |
   | `StoreCreated` | When a new store is added | `{ store_id, business_id, name, timezone, currency }` | Inventory, Analytics |
   | `StoreUpdated` | Store details (name, location, settings) are updated | `{ store_id, changes }` | Inventory, Orders, Analytics |
   | `StoreDeleted` | Store is deleted/archived | `{ store_id }` | Inventory, Orders, Analytics |
   | `UserAssignedToStore` | User is given a role in a store | `{ store_id, user_id, role }` | Auth/Access Control |
   | `UserRemovedFromStore` | User removed from a store | `{ store_id, user_id }` | Auth/Access Control |

2. Workflow: StoreCreated Event
   Step 1: User creates store

   API → POST /stores

   Service inserts store into DB.

   Step 2: Event emitted

   Stores Service publishes:
   {
   "event": "StoreCreated",
   "timestamp": "2025-09-04T10:30:00Z",
   "data": {
   "store_id": "store_123",
   "business_id": "biz_456",
   "name": "Kumasi Branch",
   "timezone": "Africa/Accra",
   "currency": "GHS"
   }
   }

   Step 3: Other modules react

   Inventory Module: Creates empty stock rows for all products in the new store .

   Analytics Module: Registers the new store in reporting structures.

3. Workflow: StoreUpdated Event

   Triggered when store settings change (name, location, timezone).

   Payload:{
   "event": "StoreUpdated",
   "data": {
   "store_id": "store_123",
   "changes": {
   "location": "Accra, Ghana",
   "timezone": "Africa/Accra"
   }
   }
   }

   Orders Module updates future orders to use new timezone.

   Analytics Module adjusts store reporting filters.

4. Workflow: StoreDeleted Event

   Triggered when a store is archived/deleted.

   Payload:{
   "event": "StoreDeleted",
   "data": {
   "store_id": "store_123"
   }
   }
   Inventory Module: Marks related stock as inactive.

   Orders Module: Prevents new orders from being placed for this store.

   Analytics Module: Stops including the store in active dashboards but preserves history.

5. Workflow: UserAssignedToStore

   Triggered when owner adds staff to a store.
   {
   "event": "UserAssignedToStore",
   "data": {
   "store_id": "store_123",
   "user_id": "user_789",
   "role": "manager"
   }
   }

   Auth/Access Control Module updates permissions → user can now view/manage this store.

   Notification Service can send email/SMS → “You’ve been added as Manager to Kumasi Branch.”

6. Workflow: UserRemovedFromStore
   {
   "event": "UserRemovedFromStore",
   "data": {
   "store_id": "store_123",
   "user_id": "user_789"
   }
   }
   Auth Module: Revokes permissions.

   Analytics Module: Removes user-specific store filters.

🔹 Event Processing Architecture

[Stores Module] → Publish Event → [Message Broker/Event Bus] → Subscribers
Example (StoreCreated):

Stores Module publishes StoreCreated → Event Bus.

Inventory Module subscribes → auto-creates stock rows.

Analytics Module subscribes → adds store to reporting.

🔹 Error Handling

If subscriber fails (e.g., Inventory can’t initialize stock), the message stays in queue for retry.

Event logs kept for auditing.

Dead-letter queue for unprocessed events.

Here’s how I’d think about what comes after the Inventory module in your app’s workflow.

Right now you have:

Users & Roles (businesses, stores, employees)

Products & Variants

Inventory Management (stock, batches, restocking, deduction, alerts)

📌 The next logical modules are:

1. Sales / Orders Module

This is where stock actually moves.

Handles POS sales, online orders, returns, and refunds.

Connects Inventory Deduction automatically with a sale record.

Supports payments, receipts, invoices.

2. Purchasing / Supplier Module

For B2B side (when a store buys from suppliers).

Ties into restocking inventory.

Tracks supplier info, purchase orders, invoices, and costs.

3. Reports & Analytics Module

Business owners will want insights like:

Best selling products

Low stock across all stores

Profit margins

Expiry/wastage losses

Dashboards for managers.

4. Customer Management Module (Optional)

If you want CRM / loyalty programs:

Save customer info

Purchase history

Discounts, rewards

⚡ My recommendation:
The next step right after Inventory should be the Sales/Orders module because it:

Completes the flow (Products → Inventory → Sale).

Allows automatic inventory deductions.

Gives the app its core business value (managing sales & stock in one system).
