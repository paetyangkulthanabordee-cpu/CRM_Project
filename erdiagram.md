# Entity Relationship Diagram — CRM System

ฐานข้อมูล PostgreSQL สำหรับระบบ CRM

```mermaid
erDiagram
    users {
        SERIAL user_id PK
        VARCHAR255 name
        VARCHAR255 email UK "unique"
        VARCHAR255 password
        VARCHAR50 role "ADMIN | MANAGER | SALES"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    customers {
        SERIAL customer_id PK
        VARCHAR255 company_name
        VARCHAR255 email
        VARCHAR50 phone
        VARCHAR50 status "lead | qualified | send_quotation | payment | contract"
        BOOLEAN is_active "soft delete"
        INT assigned_id FK "-> users.user_id"
        INT purchase_count "จำนวนใบเสร็จที่ completed"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    pipeline_stages {
        SERIAL stage_id PK
        VARCHAR50 stage_key UK "unique"
        VARCHAR255 label
        VARCHAR50 color "hex color"
        INT position "ลำดับการแสดงผล"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    document_type {
        SERIAL id PK
        VARCHAR50 document_type UK "unique"
    }

    role_permissions {
        SERIAL id PK
        VARCHAR20 role "ADMIN | MANAGER | SALES"
        VARCHAR100 permission_key
        BOOLEAN granted
        TIMESTAMPTZ updated_at
    }

    category {
        SERIAL id PK
        VARCHAR255 name
        TEXT description
        INT product_group_id FK "-> product_group.id"
    }

    product_unit {
        SERIAL id PK
        VARCHAR255 name
    }

    product {
        SERIAL id PK
        VARCHAR255 name
        VARCHAR100 sku_code
        INT category_id FK "-> category.id"
        TEXT description
        DECIMAL15_2 price
        INT product_unit_id FK "-> product_unit.id"
    }

    product_group {
        SERIAL id PK
        VARCHAR255 name
        TEXT description
    }

    order_pipeline {
        SERIAL id PK
        VARCHAR50 stage_key UK "unique"
        VARCHAR100 label
        VARCHAR20 color "hex color"
        INT position "ลำดับการแสดงผล"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    issue_order {
        SERIAL id PK
        INT customer_id FK "-> customers.customer_id"
        INT order_pipeline_id FK "-> order_pipeline.id"
        INT user_id FK "ผู้รับผิดชอบ (assignee), nullable"
        DECIMAL15_2 amount
        TEXT note
        BOOLEAN is_archived "true = ถูกซ่อนจากบอร์ด (Archive) — ไม่มีการลบข้อมูล"
        TIMESTAMPTZ updated_at "กิจกรรมล่าสุด = จุดเริ่มต้นนับอายุการ์ด (Aging Rules)"
    }

    issue_order_detail {
        SERIAL id PK
        INT product_id FK "-> product.id"
        INT issue_order_id FK "-> issue_order.id"
    }

    workflow_rules {
        SERIAL id PK
        VARCHAR150 rule_name
        INT from_stage_id FK "-> order_pipeline.id"
        INT to_stage_id FK "-> order_pipeline.id"
        VARCHAR30 condition_type "attachment | field | document | payment"
        JSONB condition_config "{minFiles[,docType]} | {field} | {docType}"
        INT document_type_id FK "-> document_type.id, nullable"
        BOOLEAN is_required "ไม่ผ่านแล้วบล็อกการย้าย"
        BOOLEAN is_active "ปิดอยู่จะไม่ถูกตรวจ"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    issue_order_attachment {
        SERIAL id PK
        INT issue_order_id FK "-> issue_order.id"
        VARCHAR255 original_name "ชื่อไฟล์ตามที่อัปโหลด"
        VARCHAR255 stored_name UK "ชื่อไฟล์บนดิสก์ (uuid)"
        VARCHAR100 mime_type
        INT size_bytes
        INT uploaded_by FK "-> users.user_id (คนแนบไฟล์), nullable"
        INT document_type_id FK "-> document_type.id, nullable"
        TIMESTAMPTZ created_at
    }

    aging_rules {
        SERIAL id PK
        VARCHAR150 rule_name
        INT warning_after_days "ไม่มี activity ครบกำหนด -> การ์ดสีเหลือง"
        INT critical_after_days "ไม่มี activity ครบกำหนด -> การ์ดสีแดง (ต้อง > warning)"
        BOOLEAN is_active "ปิดอยู่จะไม่นำไปคิดสีการ์ด"
        VARCHAR20 board_type "order_pipeline / customers = บอร์ดที่มีผล"
        VARCHAR50 stage_key "คอลัมน์บนบอร์ดboard_type, NULL = ทุกคอลัมน์"
        VARCHAR20 action_type "none / auto_archive / edit_lock"
        INT archive_after_days "จำนวนวันที่ซ่อนการ์ด (NULL = ไม่ใช้ action นี้)"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    users ||--o{ customers : "assigned_id"
    users ||--o{ issue_order : "user_id (assignee)"
    customers ||--o{ issue_order : "customer_id"
    order_pipeline ||--o{ issue_order : "order_pipeline_id"
    issue_order ||--o{ issue_order_detail : "issue_order_id"
    product ||--o{ issue_order_detail : "product_id"
    order_pipeline ||--o{ workflow_rules : "from_stage_id"
    order_pipeline ||--o{ workflow_rules : "to_stage_id"
    document_type ||--o{ workflow_rules : "document_type_id"
    issue_order ||--o{ issue_order_attachment : "issue_order_id"
    users ||--o{ issue_order_attachment : "uploaded_by (คนแนบไฟล์)"
    document_type ||--o{ issue_order_attachment : "document_type_id"
    category ||--o{ product : "category_id"
    product_unit ||--o{ product : "product_unit_id"
    product_group ||--o{ category : "product_group_id"
```

## รายละเอียดตาราง

### `users`

ตารางผู้ใช้งานระบบ มี 3 บทบาท: ADMIN, MANAGER, SALES

### `customers`

ตารางลูกค้า เก็บข้อมูลบริษัท/ลูกค้า สามารถกำหนดผู้รับผิดชอบ (assigned_id) ได้ และมี is_active สำหรับ soft delete

### `pipeline_stages`

ตารางขั้นตอนคำสั่งซื้อ (Order Pipeline) กำหนด stage_key, label, color และลำดับการแสดงผล

### `document_type`

ตาราง lookup ประเภทเอกสาร เก็บ id และ document_type (ชื่อประเภท เช่น quotation, invoice, receipt, purchase_order) — ใช้เป็น master list ของประเภทเอกสารในระบบ

- (เดิม) ตาราง `documents` และ `document_sequences` ถูกยกเลิกแล้วโดย migration `024_drop_documents_and_create_document_type.sql`

### `role_permissions`

ตารางสิทธิ์การเข้าถึง แยกตาม role และ permission_key เช่น dashboard, customers, documents

### `category`

ตารางหมวดหมู่สินค้า เก็บ id, name (ชื่อหมวด), description (รายละเอียด) และ product_group_id (กลุ่มสินค้า)

- ชื่อเมนู UI คือ **Categories / หมวดหมู่สินค้า** (หน้า `/categories`)
- (เดิมชื่อ `product_type` → `product_group` → ปัจจุบันคือ `category`)
- หมวดหมู่ผูกกลุ่มสินค้าผ่านคอลัมน์ `product_group_id` (FK → `product_group.id`)

### `product_unit`

ตารางหน่วยสินค้า เก็บ id และ name (ชื่อหน่วย เช่น ชิ้น, กล่อง, แพ็ก)

### `product`

ตารางสินค้า เก็บ id, name (ชื่อสินค้า), sku_code (รหัสสินค้า), category_id (หมวดหมู่สินค้า), description (รายละเอียด), price (ราคา) และ product_unit_id (หน่วยสินค้า)
หมายเหตุ: กลุ่มสินค้าไม่ได้ผูกกับสินค้าโดยตรง แต่ผูกผ่าน `category.product_group_id`

### `product_group`

ตารางกลุ่มสินค้า (master list) เก็บแค่ id, name (ชื่อกลุ่ม) และ description (รายละเอียด) — ไม่มี FK ไปตารางอื่น

- ชื่อเมนู UI คือ **Product Group / กลุ่มสินค้า** (หน้า `/product-groups` ในกลุ่ม Product Management)
- หมวดหมู่ผูกกลุ่มผ่านคอลัมน์ `category.product_group_id` (FK → `product_group.id`)
- 1 กลุ่มมีหมวดหมู่ได้หลายรายการ / หมวดหมู่ 1 รายการอยู่ในกลุ่มเดียว
- สินค้าสืบค้นกลุ่มสินค้าผ่าน `product.category_id` → `category.product_group_id`

### `order_pipeline`

ตารางขั้นตอนของใบสั่งซื้อ เก็บ id, stage_key, label, color, position และ timestamp
หมายเหตุ: เป็นตารางแยกจาก `pipeline_stages` (ตารางเดิมที่ฝั่ง Kanban ของลูกค้าใช้อยู่)

### `issue_order`

ตารางใบสั่งซื้อ เก็บ id, customer_id (ลูกค้า), order_pipeline_id (ขั้นตอน), user_id (ผู้รับผิดชอบ/assignee), amount (ยอดรวม), note และ `updated_at` (เวลาแก้ไขล่าสุด)
- `user_id` nullable: ข้อมูลเดิมเป็น NULL / ลบ user แล้วค่ากลายเป็น NULL (ON DELETE SET NULL)
- `updated_at` = จุดเริ่มต้นนับอายุการ์ดของ Aging Rules — TypeORM อัปเดตเป็นเวลาปัจจุบัน (reset timer) ทุกครั้งที่มีกิจกรรม: สร้างใบสั่งซื้อ / ย้ายขั้นตอน / แก้ไขข้อมูล / อัปโหลดไฟล์ (คอลัมน์ `last_activity_at` ถูกยกเลิกใน migration 028)
- `is_archived` = การ์ดถูก **ซ่อน**ออกจาก Order Pipeline โดย Aging Rule (`action_type = 'auto_archive'`, migration 032) — ⚠ **ไม่มีการลบข้อมูล** แถว/รายละเอียด/ไฟล์แนบ/ไฟล์ อยู่ครบและเข้าถึงได้จากหน้าอื่น (เช่น ตารางคำสั่งซื้อในหน้ารายละเอียดลูกค้า ที่ไม่ได้ส่ง `archived`); บอร์ดยิง `GET /api/issue-orders?archived=false` จึงไม่แสดงใบนั้นเลย

### `issue_order_detail`

ตารางรายละเอียดสินค้าในใบสั่งซื้อ เก็บ id, product_id (สินค้า) และ issue_order_id (ใบสั่งซื้อ)
เมื่อลบใบสั่งซื้อ รายละเอียดจะถูกลบตาม (ON DELETE CASCADE)

### `workflow_rules`

ตารางกฎควบคุมการย้ายการ์ดบนบอร์ด Order Pipeline แต่ละ rule กำหนดคู่ From Stage → To Stage, เงื่อนไข (`condition_type` + `condition_config`), บังคับ/ไม่บังคับ (`is_required`) และ เปิด/ปิด (`is_active`)
- `attachment` = ต้องแนบไฟล์อย่างน้อย `minFiles` ไฟล์ (rule ที่ระบุ `document_type_id` → นับเฉพาะไฟล์แนบประเภทนั้น / ไม่ระบุ → นับรวมไฟล์ทุกประเภท) / `field` = ต้องกรอกฟิลด์ที่กำหนด / `document` = ต้องมีไฟล์แนบของใบสั่งซื้อที่ `document_type_id` ตรงกับที่ rule ระบุ / `payment` = ต้องมีใบเสร็จของลูกค้ารายนั้น
- `document_type_id` nullable: ใช้เฉพาะ rule ประเภท `document` (rule อื่นเป็น NULL), ลบ `document_type` แล้วกลายเป็น NULL (ON DELETE SET NULL)
- `condition_config.docType` (string) เก็บไว้เป็น fallback เท่านั้น — แหล่งความจริงคือคอลัมน์ `document_type_id`
- เมื่อลบขั้นตอนใน `order_pipeline` rule ของขั้นตอนนั้นจะถูกลบตาม (ON DELETE CASCADE)

### `aging_rules`

ตาราง Time-based Workflow Rules (Aging Rules) — เก็บ Threshold ที่ Admin กำหนดเอง เพื่อเปลี่ยนสีการ์ด Kanban เมื่อไม่มี activity ตามจำนวนวันที่กำหนด แยกจาก `workflow_rules` เพราะไม่มีคู่ From/To Stage
- `warning_after_days` = จำนวนวันที่เริ่มแสดงสีเหลือง (Warning) / `critical_after_days` = จำนวนวันที่เปลี่ยนเป็นสีแดง (Overdue/Critical)
- CHECK constraint: `critical_after_days > warning_after_days >= 1`
- `is_active` = เปิด/ปิด rule รายละใบได้โดยไม่ต้องลบ
- **Scope ของ rule**: `board_type` = บอร์ดที่มีผล (`order_pipeline` = ใบสั่งซื้อ / `customers` = ลูกค้า) และ `stage_key` = เจาะคอลัมน์บนบอร์ดนั้น (`stage_key` เป็น `NULL` = มีผลกับ **ทุกคอลัมน์** ของบอร์ดดังกล่าว)
  - ไม่ทำ FK เพราะเป็น polymorphic อ้าง 2 ตารางต่าง entity — แต่ฝั่ง backend ตรวจว่า `stage_key` มีอยู่จริงในตารางของ `board_type` ที่เลือกตอนสร้าง/แก้ไข
  - ใช้ `stage_key` (ไม่ใช่ id) เพราะ unique ทั้ง `order_pipeline` และ `pipeline_stages` และหน้า frontend มีค่านี้อยู่แล้ว (`order.orderPipeline.stageKey` / `customer.status`)
  - ถ้าคอลัมน์ถูกลบ `stage_key` จะค้าง → rule ไม่ match ใบไหน (หน้า Administration ขึ้นป้าย "ไม่พบคอลัมน์")
- **การกระทำ (`action_type`)** เลือกได้อย่างเดียวต่อ 1 rule:
  - `none` = "Color mark" — แค่เปลี่ยนสีการ์ดตามวัน (พฤติกรรมเดิม)
  - `auto_archive` = **"ซ่อนการ์ด"** ออก Order Pipeline เมื่อ `updated_at` เก่ากว่า **`archive_after_days`** (จำนวนวันที่ Admin กำหนดเอง แยกจาก Warning/Critical) — ทำงานโดย scheduler ฝั่ง backend (`AgingAutoArchiveService`) ทุก 10 นาที + รอบแรก 15 วินาทีหลัง boot (ปรับด้วย env `AUTO_ARCHIVE_INTERVAL_MS`); DB มี CHECK บังคับว่า `action='auto_archive'` ต้องมีค่านี้
    - **ใช้ได้เฉพาะ `board_type = 'order_pipeline'`** (backend validate ตอนสร้าง/แก้ rule) — เรียก `IssueOrdersService.archive(id)` ซึ่ง **แค่ตั้ง `is_archived = true`**: ไม่ลบแถว ไม่ลบไฟล์ ไม่ตรวจ edit-lock
    - บอร์ดยิง API ด้วย `archived=false` → ใบนั้น **ไม่ถูกส่งมาแสดงเลย** (server-side filter)
    - ปลดการซ่อน: `PATCH /api/issue-orders/:id {isArchived: false}` หรือ `UPDATE issue_order SET is_archived = false ...` (ไม่มี UI)
  - `edit_lock` = ห้ามแก้ไขข้อมูล/อัปโหลด-ลบไฟล์/ลบรายการ เมื่อการ์ดอยู่ในคอลัมน์นี้ (บังคับจริงฝั่ง backend ด้วย `403 errorCode EDIT_LOCKED` ที่ `assertNotEditLocked`) แต่ **ย้ายคอลัมน์ได้เสมอ** (`PATCH /issue-orders/:id/stage` และ `PATCH /customers/:id` ที่มีแค่ `{status}` ไม่ถูกบล็อก) — **ต้องเจาะคอลัมน์** (ฟอร์มซ่อน "ทุกคอลัมน์" และ backend ปฏิเสธ `stage_key = NULL`)
  - ฟอร์ม Add/Edit: ช่วง `Warning after / Critical after` + แถบ preview **แสดงเฉพาะ `action = none`** — `auto_archive` มีช่อง "Archive หลังจาก (วัน)" ของตัวเอง, `edit_lock` มีเฉพาะตัวเลือกบอร์ด/คอลัมน์
  - **จำนวนการ์ดในหัวคอลัมน์** นับเฉพาะ `is_archived = false` ให้ตรงกับที่แสดง ส่วนการ "ลบคอลัมน์" ยังนับรวมใบ archive (กัน FK `order_pipeline_id` NOT NULL)
- ไม่มี FK ไปตารางอื่น: บอร์ดฝั่ง frontend ดึง Threshold ผ่าน `GET /api/aging-rules` แล้วกรองตาม `board_type` + `stage_key` แล้วคำนวณสถานะจาก `issue_order.updated_at` / `customers.updated_at` เอง (คำนวณใหม่ทุก ~1 นาที ไม่ต้องกด Refresh)

### `issue_order_attachment`

ตาราง metadata ของไฟล์แนบใบสั่งซื้อ (ไฟล์จริงเก็บบนดิสก์ที่ `uploads/attachments`) ใช้ตรวจเงื่อนไข "ต้องแนบไฟล์" ของ Workflow Rule
- `uploaded_by` = ใครเป็นคนอัปโหลดไฟล์ (nullable, ON DELETE SET NULL)
- `document_type_id` = ประเภทเอกสารของไฟล์แนบ (FK → `document_type.id`, nullable, ON DELETE SET NULL)
เมื่อลบใบสั่งซื้อ ไฟล์แนบจะถูกลบตาม (ON DELETE CASCADE)

## ความสัมพันธ์หลัก

| ความสัมพันธ์          | รายละเอียด                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| users → customers                | ผู้ใช้ 1 คนรับผิดชอบลูกค้าหลายรายการ (assigned_id)                  |
| users → issue_order              | ผู้ใช้ 1 คนเป็นผู้รับผิดชอบใบสั่งซื้อหลายใบ (user_id / assignee) |
| customers → issue_order          | ลูกค้า 1 รายมีใบสั่งซื้อหลายใบ (customer_id)                              |
| order_pipeline → issue_order     | ขั้นตอน 1 ขั้นมีใบสั่งซื้อหลายใบ (order_pipeline_id)                    |
| issue_order → issue_order_detail | ใบสั่งซื้อ 1 ใบมีรายละเอียดสินค้าหลายรายการ (issue_order_id) |
| order_pipeline → workflow_rules | ขั้นตอน 1 ขั้นเป็นต้นทาง/ปลายทางของ Rule ได้หลายฉบับ (from_stage_id / to_stage_id) |
| document_type → workflow_rules | ประเภทเอกสาร 1 ประเภทถูกอ้างโดย Rule ได้หลายฉบับ (document_type_id) |
| issue_order → issue_order_attachment | ใบสั่งซื้อ 1 ใบมีไฟล์แนบได้หลายไฟล์ (issue_order_id) |
| users → issue_order_attachment | ผู้ใช้ 1 คนอัปโหลดไฟล์แนบได้หลายไฟล์ (uploaded_by = คนแนบไฟล์) |
| document_type → issue_order_attachment | ประเภทเอกสาร 1 ประเภทใช้กับไฟล์แนบได้หลายไฟล์ (document_type_id) |
| product → issue_order_detail     | สินค้า 1 รายปรากฏในรายละเอียดหลายรายการ (product_id)             |
| category → product               | หมวดหมู่ 1 อันมีสินค้าหลายรายการ (category_id)                          |
| product_group → category         | กลุ่ม 1 กลุ่มมีหมวดหมู่หลายรายการ (product_group_id)                   |
| product_unit → product           | หน่วย 1 หน่วยมีสินค้าหลายรายการ (product_unit_id)                        |
