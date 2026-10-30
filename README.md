# APAAR SETU — AICTE Student Data Management & Verification Platform

**Tagline:** *One ID. One Seat. One Verified Truth.*  
**Smart India Hackathon 2026 Problem Statement ID:** `SIH26263`  
**Problem Statement Title:** Development of an APAAR ID-based Student Data Management and Verification Platform for AICTE-Approved Institutions.

---

## 1. Project Overview

**APAAR Setu** is a full-stack digital governance and academic verification prototype designed for AICTE-approved institutions. It enables institutions to upload, validate, and monitor student-level admission records using synthetic 12-digit **APAAR IDs** as the unique academic identifier, while providing AICTE administrators with real-time duplicate detection, seat capacity enforcement, and tamper-evident digital credential verification.

> **Important Prototype Notice:** This application is a Smart India Hackathon technical demonstration prototype using strictly synthetic demo data. It does not connect to live production government databases and does not issue official AICTE certificates.

---

## 2. Technology Stack

- **Frontend:** React 19 + TypeScript, Tailwind CSS v4, React Router v7, Recharts, Lucide React Icons, `qrcode.react`, `papaparse`.
- **Backend:** Node.js + Express REST API (`server.ts`), TypeScript (`tsx`).
- **Cryptography & Security:**
  - **HMAC-SHA256 (`node:crypto`):** Server-side privacy-preserving tokenization of 12-digit APAAR identifiers so cross-institutional duplicate enrolments are detected without exposing plaintext APAAR numbers in tables or browser payloads.
  - **Ed25519 Digital Signatures (`node:crypto` RFC 8032):** Server-side asymmetric signing and public-key verification of QR student credentials.
  - **Role & Institution Isolation:** Server-enforced middleware isolating AICTE Admin, Institute Admin, Student, and Employer / Verifier data scopes.
- **AI Anomaly Summarization:** Deterministic 6-rule pattern engine on the server + optional server-side `@google/genai` (`gemini-3.8-flash`) summarization on anonymized aggregate metrics (zero PII or raw APAAR IDs sent to Gemini).

---

## 3. Folder Structure

```text
/
├── server.ts                                  # Express REST API server, RBAC, HMAC & Ed25519 crypto, Gemini route
├── data/db.json                               # Server-side persistent JSON database (auto-seeded on startup)
├── src/
│   ├── types/domain.ts                        # Domain interfaces & enums for all 4 roles and modules
│   ├── lib/
│   │   ├── engine.ts                          # Pure validation, HMAC-SHA256, Duplicate Shield, Seat Ledger & Ed25519 logic
│   │   ├── engine.test.ts                     # Automated Node unit test suite (node:test) for all 7 SIH test cases
│   │   └── seedData.ts                        # Realistic synthetic demo dataset (6 institutions, 10 programmes, 60/60 CSE ledger)
│   ├── context/PlatformContext.tsx            # End-to-end API client, role switcher, and toast notifications
│   ├── components/Layout.tsx                  # Collapsible sidebar, top bar, breadcrumbs, and role switcher
│   └── pages/
│       ├── LoginPage.tsx                      # Login form + 4 instant DEMO ACCESS buttons
│       ├── DashboardsPage.tsx                 # AICTE Central, Institute, Student, and Verifier dashboards
│       ├── StudentManagementPage.tsx          # Registration form, SIH test presets, and Central Student Repository
│       ├── BulkUploadPage.tsx                 # CSV drag-and-drop upload, row-level validation & inline correction
│       ├── DuplicateShieldPage.tsx            # Cross-institution HMAC duplicate comparison & resolution workflow
│       ├── ApaarValidationPage.tsx            # 6-status APAAR Validation Engine & Exception Queue resubmission
│       ├── SeatLedgerPage.tsx                 # Live Seat Ledger (Regular vs Supernumerary counters + TEST 2 trigger)
│       ├── AiIntelligencePage.tsx             # Deterministic anomaly detector + server-side Gemini brief
│       ├── CredentialsAndQrPage.tsx           # Ed25519 QR Certificate generator, verifier, tamper simulator & consent
│       ├── InstitutionsPage.tsx               # Institution Directory & Programme Capacity configuration
│       ├── ReportsPage.tsx                    # 10 standardized AICTE analytics reports with CSV export & print
│       └── GovernanceAndArchitecturePage.tsx  # Audit Logs, System Integrations, Architecture Diagram & Settings
```

---

## 4. How to Run the Application

```bash
# 1. Install dependencies
npm install

# 2. Run fast unit tests (verifies HMAC, Seat Ledger, Ed25519, and CSV validation)
npm test

# 3. Start full-stack Express + Vite server on port 3000
npm run dev
```

---

## 5. Demo Login Instructions

On the Login screen (`/login`), use the **DEMO ACCESS — INSTANT ROLE SWITCHING** buttons (or switch roles anytime from the top navigation bar):

1. **Login as AICTE Admin:** `admin@aicte-demo.gov.in` (National Monitoring, All 6 Institutions, Central Repository, Duplicate Shield, Audit Logs)
2. **Login as Institute Admin:** `registrar@abcengg-demo.edu.in` (ABC Engineering College `AICTE-DL-101` — Student Registration, Bulk CSV Upload, Live Seat Ledger)
3. **Login as Student:** `rahul.sharma@student-demo.edu.in` (Rahul Sharma, Student ID `221901`, APAAR Demo ID `123456789012` — My Credential, QR Code, Consent Management)
4. **Login as Employer / Verifier:** `verifier@bharattech-demo.in` (Least-privilege QR & Credential ID verification without student database access)

---

## 6. Executing the 7 SIH Demonstration Scenarios

- **TEST 1 (Duplicate Student):** Go to **Student Management** -> click `TEST 1: Duplicate Student (123456789012)` -> click `Save Student` -> inspect the cross-institution match in **Duplicate Shield**.
- **TEST 2 (Excess Admission):** Go to **Seat Ledger** (where ABC Engineering College CSE Regular Intake is `60/60 FULL`) -> click `Run TEST 2: Attempt 61st Regular Admission` -> observe the excess admission alert and flag.
- **TEST 3 (Missing APAAR):** Go to **Student Management** -> click `TEST 3: Missing APAAR ID` -> click `Save Student` -> verify the record is routed to the **APAAR Validation Exception Queue**.
- **TEST 4 (Invalid Credential Signature):** Go to **Credential Verification / Scan QR** -> click `TEST 4: Modify QR Payload (Invalid Signature)` -> verify Ed25519 tamper detection.
- **TEST 5 (Student Consent):** Go to **Credential Verification** -> click `TEST 5: Verify Credential Requiring Consent` -> request consent -> switch to **Student** role -> approve or revoke in **Consent Management**.
- **TEST 6 (Seat Utilization):** Open **Seat Ledger** to view separate counters for Approved Regular Intake (`60/60`) and Supernumerary Seats (`2/5`).
- **TEST 7 (Data Inconsistency in Bulk CSV):** Open **Bulk Upload** -> click `Load Sample CSV (TEST 7 Demo)` -> inspect row-level errors, fix a row inline, revalidate, and commit.
