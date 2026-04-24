<div align="center">

# 💊 ระบบจัดการยาใกล้หมดอายุ
### Exp.BB — Expiry Drug Management System

**ห้องจ่ายยาผู้ป่วยนอก · โรงพยาบาลอุตรดิตถ์**

---

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=20232A)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 🌟 ภาพรวมระบบ

ระบบติดตามและจัดการยาใกล้หมดอายุสำหรับงานเภสัชกรรม ช่วยให้ทีมงานสามารถบันทึก ติดตาม และรายงานสถานะของยาที่ใกล้หมดอายุได้อย่างมีประสิทธิภาพ รองรับการจัดการ workflow ได้ครบทุกรูปแบบ ตั้งแต่การติด Sticker ไปจนถึงการทำลาย

```
📦 บันทึกยา  →  📊 ติดตามสถานะ  →  ✅ จัดการ & รายงาน
```

---

## ✨ ฟีเจอร์หลัก

### 📝 Tab 1 — เพิ่มรายการ

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 🔍 ค้นหายา | ค้นหาจากฐานข้อมูลยาแบบ real-time |
| 📅 บันทึกวันหมดอายุ | ระบุวัน / เลข Lot No. พร้อมจำนวน |
| 🎯 Action Cards | เลือก workflow: Sticker / Transfer / แยกเก็บ / คืนคลัง / ทำลาย ฯลฯ |
| 💾 บันทึกลง Firestore | อัปเดต real-time ไม่ต้อง refresh |

### 📊 Tab 2 — จัดการรายการ

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 🚨 Dashboard Cards | แยกหมวด: เร่งด่วน (≤30 วัน) / เตรียมแผน / ติดตาม / ยังไม่เร่งด่วน |
| 🔎 ค้นหา & กรอง | กรองตามช่วงเวลา / ประเภท Action / คำค้น |
| 👁️ 2 มุมมอง | แบบ Lot (รายชิ้น) และแบบจัดกลุ่มยา |
| ✏️ จัดการรายการ | แก้ไข / Split Stock / ปรับจำนวน / ลบ (ต้องใส่ PIN) |
| 📜 ประวัติการจัดการ | ดู Action Log แยกตามชื่อยา |
| 📤 Export CSV | ส่งออกรายการที่กรองแล้วเป็นไฟล์ CSV |

### 💊 Tab 3 — บัญชียา

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| ➕ เพิ่มยาใหม่ | ระบุชื่อยา / Generic / ความแรง / หน่วย |
| ✏️ แก้ไข | แก้ไขข้อมูลยาได้ทันที |
| 🗑️ ลบ | ลบพร้อม confirm dialog |
| 🔍 ค้นหา | ค้นหาทุก field แบบ real-time |
| 📄 Pagination | แสดง 20 รายการต่อหน้า รองรับยาหลักพันรายการ |
| 📥 Import | นำเข้าจาก Google Sheets เดิมได้ในคลิกเดียว |

---

## 🗂️ โครงสร้าง Firestore

```
firestore/
├── 💊 drugs/            ← ฐานข้อมูลยา (master data)
│   └── {docId}
│       ├── drugName     : string
│       ├── generic      : string
│       ├── strength     : string
│       └── unit         : string
│
├── 📦 items/            ← รายการยาที่บันทึก (stock entries)
│   └── {docId}
│       ├── drugName     : string
│       ├── qty          : number
│       ├── expiryDate   : string  (YYYY-MM-DD)
│       ├── action       : string  (Sticker | Transfer | ...)
│       ├── subDetails   : string
│       ├── notes        : string
│       ├── lotNo        : string
│       └── createdAt    : Timestamp
│
└── 📋 actionLog/        ← ประวัติการดำเนินการ (audit trail)
    └── {docId}
        ├── drugName     : string
        ├── qty          : string
        ├── action       : string
        ├── details      : string
        └── timestamp    : Timestamp
```

---

## 🎨 Action Types

| Action | สี | ความหมาย |
|--------|----|---------|
| 🏷️ **Sticker** | 🟠 ส้ม | ติด Sticker แจ้งเตือน |
| 🔄 **Transfer** | 🔵 น้ำเงิน | ส่งต่อหน่วยอื่น |
| 📦 **Separate** | 🔴 แดง | แยกเก็บ |
| 📞 **ContactWH** | 🟢 เขียวน้ำทะเล | ติดต่อคลังยา |
| 🚚 **ReturnWH** | 💚 เขียว | คืนคลัง |
| ✅ **UsedUp** | 🍋 เหลืองอ่อน | ใช้หมดแล้ว |
| 🔥 **Destroy** | ⚫ เทาเข้ม | ทำลาย |
| 💬 **Other** | ⬜ เทา | อื่นๆ |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Database** | Firebase Firestore |
| **Styling** | Tailwind CSS 3 |
| **UI / Alerts** | SweetAlert2 |
| **Icons** | Font Awesome 6 |

</div>

---

## 🚀 วิธีติดตั้งและรันโปรเจกต์

### 1. Clone & Install

```bash
git clone <repo-url>
cd Exp.BB
npm install
```

### 2. Firebase Setup

โปรเจกต์นี้เชื่อมกับ Firebase project `expmanage-bb738` แล้ว
config อยู่ใน [`src/lib/firebase.ts`](src/lib/firebase.ts)

> ⚠️ **Firestore Rules** — ต้องตั้งค่า Security Rules ให้อ่าน/เขียนได้ก่อนใช้งาน

### 3. รัน Development Server

```bash
npm run dev
# เปิด http://localhost:5173
```

### 4. Build สำหรับ Production

```bash
npm run build
npm run preview   # ทดสอบ build ก่อน deploy
```

---

## 📥 Migration จาก Google Sheets

หากมีข้อมูลเดิมใน Google Sheets สามารถ import ได้ผ่านหน้า **"เพิ่มรายการ"**:

```
1. กด "นำเข้ารายการยาจาก Google Sheets"   ← import drugs collection
2. กด "นำเข้าข้อมูลที่บันทึกไว้ทั้งหมด"   ← import items collection
```

> ⚡ ควรทำ Step 1 ก่อน เพราะ Step 2 จะ lookup `generic` จาก `drugs` collection

---

## 📁 โครงสร้างโปรเจกต์

```
src/
├── api/
│   └── firestoreApi.ts       ← Firestore operations ทั้งหมด
├── components/
│   ├── common/               ← LoadingOverlay, BackToTop, StateCard
│   ├── drugs/
│   │   └── DrugManager.tsx   ← จัดการบัญชียา (CRUD)
│   ├── entry/
│   │   ├── ActionCards.tsx   ← การ์ดเลือก Action
│   │   ├── DrugSearch.tsx    ← ค้นหายา
│   │   └── EntryForm.tsx     ← ฟอร์มบันทึกรายการ
│   ├── layout/
│   │   └── Header.tsx        ← Header + Tab navigation
│   ├── modals/
│   │   └── ManageModal.tsx   ← Modal จัดการ / แก้ไข / ลบรายการ
│   └── report/
│       ├── DashboardCards.tsx
│       ├── FilterBar.tsx
│       ├── GroupedCard.tsx
│       ├── ItemCard.tsx
│       ├── Pagination.tsx
│       └── ReportView.tsx
├── constants/index.ts        ← ค่า constant ทั้งหมด
├── lib/
│   └── firebase.ts           ← Firebase config & init
├── types/index.ts            ← TypeScript interfaces
└── utils/
    ├── csvUtils.ts           ← Export CSV
    ├── dateUtils.ts          ← จัดการวันที่ (Thai locale)
    ├── stockUtils.ts         ← Logic คำนวณ stock / กรอง / จัดกลุ่ม
    └── swal.ts               ← SweetAlert2 theme config
```

---

## 🔐 ความปลอดภัย

- การ **ลบรายการ** ต้องใส่ PIN `1234` ยืนยัน
- ควรตั้งค่า **Firestore Security Rules** ให้เหมาะสมก่อน deploy จริง
- Firebase config ที่อยู่ใน source code เป็น client-side key (ปกติสำหรับ Firebase web apps) — ความปลอดภัยจริงอยู่ที่ Firestore Rules

---

<div align="center">

**ห้องจ่ายยาผู้ป่วยนอก · โรงพยาบาลอุตรดิตถ์**

Built with ❤️ using React + Firebase

</div>
