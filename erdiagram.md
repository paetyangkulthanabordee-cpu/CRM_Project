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

    documents {
        SERIAL doc_id PK
        VARCHAR50 doc_type "quotation | invoice | receipt | purchase_order"
        VARCHAR100 doc_no
        INT customer_id FK "-> customers.customer_id"
        DATE issue_date
        DATE due_date
        INT ref_doc_id FK "self-reference -> documents.doc_id"
        VARCHAR100 ref_doc_no
        DECIMAL15_2 amount
        TEXT note
        INT created_by FK "-> users.user_id"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    document_sequences {
        VARCHAR20 doc_type PK,FK
        INT year PK
        INT last_no "เลขล่าสุดที่ใช้"
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
    }

    product_unit {
        SERIAL id PK
        VARCHAR255 name
    }

    product {
        SERIAL id PK
        VARCHAR255 name
        VARCHAR100 sku_code UK
        INT category_id FK "-> category.id"
        TEXT description
        DECIMAL15_2 price
        INT product_unit_id FK "-> product_unit.id"
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
        DECIMAL15_2 amount
        TEXT note
    }

    issue_order_detail {
        SERIAL id PK
        INT product_id FK "-> product.id"
        INT issue_order_id FK "-> issue_order.id"
    }

    users ||--o{ customers : "assigned_id"
    users ||--o{ documents : "created_by"
    customers ||--o{ documents : "customer_id"
    documents ||--o{ documents : "ref_doc_id (self)"
    customers ||--o{ issue_order : "customer_id"
    order_pipeline ||--o{ issue_order : "order_pipeline_id"
    issue_order ||--o{ issue_order_detail : "issue_order_id"
    product ||--o{ issue_order_detail : "product_id"
    category ||--o{ product : "category_id"
    product_unit ||--o{ product : "product_unit_id"
```

## รายละเอียดตาราง

### `users`

ตารางผู้ใช้งานระบบ มี 3 บทบาท: ADMIN, MANAGER, SALES

### `customers`

ตารางลูกค้า เก็บข้อมูลบริษัท/ลูกค้า สามารถกำหนดผู้รับผิดชอบ (assigned_id) ได้ และมี is_active สำหรับ soft delete

### `pipeline_stages`

ตารางขั้นตอนคำสั่งซื้อ (Order Pipeline) กำหนด stage_key, label, color และลำดับการแสดงผล

### `documents`

ตารางเอกสาร รองรับหลายประเภท: quotation, invoice, receipt, purchase_order
สามารถอ้างอิงเอกสารอื่นได้ (ref_doc_id) เช่น ใบแจ้งหนี้อ้างอิงใบเสนอราคา

### `document_sequences`

ตารางเก็บเลขลำดับเอกสาร แยกตามประเภทและปี ใช้สำหรับสร้างเลขที่เอกสารอัตโนมัติ

### `role_permissions`

ตารางสิทธิ์การเข้าถึง แยกตาม role และ permission_key เช่น dashboard, customers, documents

### `category`

ตารางกลุ่มสินค้า เก็บ id, name (ชื่อกลุ่ม) และ description (รายละเอียด)
(เดิมชื่อ `product_type` → `product_group` → ปัจจุบันคือ `category`)

### `product_unit`

ตารางหน่วยสินค้า เก็บ id และ name (ชื่อหน่วย เช่น ชิ้น, กล่อง, แพ็ก)

### `product`

ตารางสินค้า เก็บ id, name (ชื่อสินค้า), sku_code (รหัสสินค้า), category_id (กลุ่มสินค้า), description (รายละเอียด), price (ราคา) และ product_unit_id (หน่วยสินค้า)

### `order_pipeline`

ตารางขั้นตอนของใบสั่งซื้อ เก็บ id, stage_key, label, color, position และ timestamp
หมายเหตุ: เป็นตารางแยกจาก `pipeline_stages` (ตารางเดิมที่ฝั่ง Kanban ของลูกค้าใช้อยู่)

### `issue_order`

ตารางใบสั่งซื้อ เก็บ id, customer_id (ลูกค้า), order_pipeline_id (ขั้นตอน), amount (ยอดรวม) และ note

### `issue_order_detail`

ตารางรายละเอียดสินค้าในใบสั่งซื้อ เก็บ id, product_id (สินค้า) และ issue_order_id (ใบสั่งซื้อ)
เมื่อลบใบสั่งซื้อ รายละเอียดจะถูกลบตาม (ON DELETE CASCADE)

## ความสัมพันธ์หลัก

| ความสัมพันธ์  | รายละเอียด                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| users → customers        | ผู้ใช้ 1 คนรับผิดชอบลูกค้าหลายรายการ (assigned_id)      |
| users → documents        | ผู้ใช้ 1 คนสร้างเอกสารหลายฉบับ (created_by)                   |
| customers → documents    | ลูกค้า 1 รายมีเอกสารหลายฉบับ                                    |
| documents → documents    | เอกสารอ้างอิงเอกสารอื่น (ref_doc_id)                              |
| customers → issue_order  | ลูกค้า 1 รายมีใบสั่งซื้อหลายใบ (customer_id)                      |
| order_pipeline → issue_order | ขั้นตอน 1 ขั้นมีใบสั่งซื้อหลายใบ (order_pipeline_id)          |
| issue_order → issue_order_detail | ใบสั่งซื้อ 1 ใบมีรายละเอียดสินค้าหลายรายการ (issue_order_id) |
| product → issue_order_detail | สินค้า 1 รายปรากฏในรายละเอียดหลายรายการ (product_id) |
| category → product       | กลุ่ม 1 กลุ่มมีสินค้าหลายรายการ (category_id)                   |
| product_unit → product  | หน่วย 1 หน่วยมีสินค้าหลายรายการ (product_unit_id)      |
