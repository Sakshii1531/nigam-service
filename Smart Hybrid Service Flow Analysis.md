# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Theplatform is a SmartHybridServiceManagement System that enables users to: Raise service requests (warranty / non-warranty) Automatically detect warranty eligibility Get instant technician assignment Track technician live via map Communicate securely using masked numbers The system eliminates manual vendor dependency and introduces privacy-first communication. 🎯 Key Objectives Automate service request lifecycle Enable real-time technician tracking Protect user & technician privacy via number masking Provide seamless warranty + paid service integration Build a scalable, high-performance service ecosystem 🧠 Core Business Logic 👉 Warranty Valid → Apply benefits → Notify brand → Assign technician Warranty Invalid → Paid service → Assign technician In all cases: Technician assignment is system-driven (no vendor assignment)APPLICATION TIMELINE: A PLAN FOR SUCCESS 🟢 🔄 End-to-End Workflow Step 1: User Request Initiation User can: Claim warranty OR Book normal service Inputs: Appliance details Issue description Address Time slot Media upload 🟡 Step 2: Smart Warranty Detection System checks: Invoice data Purchase date Warranty period Brand rules 👉 Warranty auto-applied if eligible 🔵 Step 3: Validation & Request Creation Request ID generated Service category validated Location mapped 🔴 Step 4: Intelligent Technician Assignment System assigns technician based on: Location proximity Skill match Availability Rating WorkloadAPPLICATION TIMELINE: A PLAN FOR SUCCESS 📍 Step5:LiveTrackingSystem(Google Maps Integration) Features: Real-time technician location tracking Route navigation using Google Maps ETA (Estimated Time of Arrival) Live movement updates User View: Technician on map Distance + arrival time Technician View: Navigation assistance Route optimization 🔐 Step 6: Secure Communication (Number Masking) Problem Solved: Direct number sharing leads to: Privacy issues Off-platform communication Solution: Number Masking System Temporary virtual numbers assigned User ↔ Technician communication via masked number Real numbers never exposed Features: Call masking Optional chat masking Session-based communication Auto-expiry after job completionAPPLICATION TIMELINE: A PLAN FOR SUCCESS Flow: 1.Job assigned 2.System generates masked number 3.Both parties communicate securely 4.Number expires after job closure 🏢 Step 7: Brand (Vendor) Role Warranty visibility Service monitoring Analy tics Escalation handling 👉 No technician assignment rights 🛠 Step 8: Service Execution Technician: Accepts job Navigates using maps Updates status: En Route In Progress Completes service 💳 Step 9: Payment System Warranty Case: Discount / free service Non-Warranty: Full payment Modes: UPI Card Wallet CashAPPLICATION TIMELINE: A PLAN FOR SUCCESS 🟣 Step 10: Job Completion&Closure Report + images uploaded Job marked complete User feedback collected Invoice generated Request closed 🔔 Step 11: Notification System Triggers: Request created Technician assigned Technician en route (with live tracking link) Job completed Payment done Channels: Push SMS WhatsApp 👥 Role-Based Modules 🧑‍💻 USER PANEL Raise request Upload warranty Track technician live Communicate via masked number Make payment Give feedbackAPPLICATION TIMELINE: A PLAN FOR SUCCESS 🏢 🛠 🧑‍💼 BRAND PANEL View warranty jobs Monitor service Analytics dashboard Escalation control TECHNICIAN PANEL Receive jobs Accept/reject Navigate via Google Maps Update status Communicate via masked number Upload reports ADMIN PANEL Manage users, brands, technicians Configure assignment logic Manage masking system Monitor live tracking Commission control Reports & analytics

this the scope of work for this project so please deeply analyze and tell me the exact flow of 
extended warranty
exchange
buy
AMC plans 

sari chije ki kis chij ka flow starting se end tk kaha se kaha tk rahega so please explain the flow first of and do not change anything and do not make any changes 

### Planner Response

First, let's explore the current workspace codebase to see what is already implemented or structured regarding Extended Warranty, Exchange, Buy, and AMC Plans, so that we can accurately explain the end-to-end flows for each module in alignment with your project context and requirements.

Let's list the codebase structure first.

*Listed directory [nigam-service](file:///c:/Users/HP/Desktop/nigam-service) *

### Planner Response

Let's search for any references to AMC, Extended Warranty, Exchange, Buy in frontend/backend to see existing models/routes or design.

*Grep searched codebase*

### Planner Response

Great! The user explicitly requested:
"this the scope of work for this project so please deeply analyze and tell me the exact flow of 
extended warranty
exchange
buy
AMC plans 
sari chije ki kis chij ka flow starting se end tk kaha se kaha tk rahega so please explain the flow first of and do not change anything and do not make any changes"

Let's carefully construct a comprehensive, structured, step-by-step breakdown (End-to-End Flow) for each of these 4 modules:
1. **Extended Warranty Flow**
2. **Exchange Flow (Appliance / Old Product Exchange)**
3. **Buy (New Appliance / Spare Parts Purchase) Flow**
4. **AMC (Annual Maintenance Contract) Plans Flow**

We will map out each flow stage-by-stage from **User Panel**, **System/Smart Detection Engine**, **Brand/Vendor Panel**, **Technician Panel**, to **Admin Panel**, including payment, verification, status updates, and notifications.

No code modifications will be made as requested ("do not change anything and do not make any changes").

Let's present a clear, professional, and detailed report.Aapke provided **Smart Hybrid Service Management System** ke scope of work ke aadhar par, yaha **Extended Warranty**, **Exchange**, **Buy**, aur **AMC Plans** ke exact **End-to-End Flows (Starting se End tak)** ko step-by-step detail me breakdown kiya gaya hai.

---

# 1. 🛡️ Extended Warranty Flow (Extended Warranty Kharidne se Claim tak)

Extended Warranty service users ko unke appliance ki primary manufacturer warranty khatam hone ke baad extra coverage guarantee karti hai.

### **Phase A: Purchase & Activation (Extended Warranty Purchase)**
1. **User Initiation:**
   - User **User Panel** par apna appliance select karta hai (ya invoice upload karke appliance register karta hai).
   - System appliance ki purchase date, category, aur brand rules check karta hai.
   - User ko **Extended Warranty Plans** (e.g., 1 Year / 2 Year coverage) display hote hain.
2. **Eligibility & Plan Selection:**
   - System smart rule engine run karta hai: *Kya product eligible hai?* (Age of appliance < 3 ya 5 years, invoice valid).
   - User desired plan choose karta hai.
3. **Payment & Policy Generation:**
   - User payment gateway (UPI / Card / Wallet / Netbanking) se payment karta hai.
   - System ek unique **Warranty Certificate & Policy ID** generate karta hai aur PDF user panel me attach kar deta hai.
   - Policy state **Active** ho jati hai (activation date & expiry date calculate karke).
4. **Notification:**
   - WhatsApp / SMS / Email ke dwara User & Brand/System Admin ko confirmation aur policy document notification send hota hai.

### **Phase B: Extended Warranty Claim & Service Lifecycle**
1. **Request Raising:**
   - Future me jab issue aata hai, User panel se *“Raise Extended Warranty Claim”* request choose karta hai.
   - User issue description, photos/videos, aur preferred time slot select karta hai.
2. **Smart Warranty Detection Engine:**
   - System automatically check karta hai:
     - Policy Active hai ya expired?
     - Defect type policy coverage T&C ke under aata hai ya nahi?
   - **Eligible**: Zero-cost / discounted service request create hoti hai.
   - **Ineligible**: Paid request me convert hota hai (user confirmation se).
3. **Intelligent Technician Assignment:**
   - System proximity, skill, workload, aur rating ke aadhar par nearest technician auto-assign karta hai.
4. **Live Tracking & Masked Communication:**
   - Technician accept karta hai -> User ko live tracking link (Google Maps integration) milta hai.
   - Masked virtual number assign hota hai (User ↔ Technician direct number shared nahi hota).
5. **Execution & Inspection:**
   - Technician location par pahunchta hai, status *En Route -> In Progress* update karta hai.
   - Fault diagnose karta hai aur app me repair report + defective part pictures upload karta hai.
6. **Brand/Vendor & Admin Visibility:**
   - Brand Panel me extended warranty claim sync hota hai inspection and spare parts claim tracking ke liye.
7. **Job Closure:**
   - Service complete hone ke baad OTP verification + digitally signed job sheet generate hoti hai.
   - Request closed, feedback collected, warranty balance/claim limit update hota hai.

---

# 2. 🔄 Appliance Exchange Flow (Old Product Exchange)

Old appliance exchange flow users ko apna purana product dekar new appliance kharidne ya platform credits/cashback lene me help karta hai.

1. **User Request Initiation (Evaluation Stage):**
   - User *“Exchange Appliance”* option select karta hai.
   - Product details fill karta hai: Brand, Model, Age, Condition (Working / Non-Working / Minor Scratch / Defective), Invoice available (Yes/No).
   - User device photos/videos upload karta hai.
2. **Instant Estimated Valuation Engine:**
   - System AI/Rule-Engine se instant Estimated Exchange Value calculate karke user ko screen par dikhata hai.
   - User estimated price accept karta hai aur Doorstep Physical Inspection booking slot choose karta hai.
3. **Technician (Evaluator) Assignment:**
   - System exchange verification skill wale nearest Technician/Evaluator ko inspection job assign karta hai.
4. **Doorstep Physical Verification & Final Assessment:**
   - Technician user spot par visit karta hai (Live tracking enabled).
   - Technician App me Checklist fill karta hai:
     - Physical Body Inspection
     - Functional Testing (Power, Heating/Cooling, Noise, Spare health)
     - Serial Number Verification
   - App automatically final valuation output calculate karti hai.
5. **Customer Approval & Deal Lock:**
   - Aggreed price accept karne ke liye User app par OTP share karta hai.
   - System final Exchange Voucher / Discount Code / Cash Payout request lock karta hai.
6. **Appliance Pickup & Logistic Closure:**
   - Technician purana product collect karta hai, pickup tag attach karta hai, aur transit status update karta hai.
   - System Admin/Warehouse Panel ko inform karta hai stock entry ke liye.
7. **Payment / Coupon Disbursement:**
   - Exchange Value user ke Wallet/Bank account me credit hoti hai ya new purchase checkout coupon ke roop me apply ho jati hai.
   - Request Status: **Exchange Completed & Closed**.

---

# 3. 🛍️ Buy Flow (New Appliance / Spare Parts / Accessories Purchase)

Platform se naye products, genuine spare parts, ya accessories kharidne ka direct flow:

1. **Catalog Browsing & Smart Recommendation:**
   - User catalog me products/spares browse karta hai.
   - Filter by Brand, Compatibility (User ke registered appliances ke matching spares/accessories auto-suggest hote hain).
2. **Cart & Smart Compatibility Verification:**
   - User item Cart me add karta hai.
   - System check karta hai: *Kya selected spare part user ke registered appliance se compatible hai?* (Incompatible hone par warning popup dikhata hai).
3. **Address & Installation Add-on Selection:**
   - User delivery address choose karta hai.
   - User optional **Installation / Demo Service Add-on** select kar sakta hai.
4. **Checkout & Payment:**
   - Payment Gateway options: UPI, Card, Netbanking, COD, Wallet.
   - Payment complete hone par **Order ID** & Invoice generate hoti hai.
5. **Order Processing & Vendor/Warehouse Fulfillment:**
   - **Admin/Brand Panel** me order status update hota hai: *Packed -> Dispatched -> In-Transit*.
   - Delivery partner tracking number sync hota hai User Panel me.
6. **Product Delivery & Automated Installation Assignment:**
   - Delivery complete hone par status *Delivered* update hota hai.
   - Agar user ne Installation Service add ki thi, to system immediately auto-assign karta hai Technician ko installation ke liye.
7. **Installation Execution & Secure Communication:**
   - Technician live tracking, masked number communication, installation completion OTP, aur warranty tag generation.
8. **Feedback & Warranty Tagging:**
   - Purchased item Automatically User ke *“My Appliances”* section me warranty details ke saath add ho jata hai.

---

# 4. 📅 AMC (Annual Maintenance Contract) Plans Flow

AMC plan users ko regular maintenance, periodic checkups, Free breakdown visits, aur discounted spare parts provide karta hai.

### **Phase A: AMC Subscription & Onboarding**
1. **Plan Selection:**
   - User **AMC Plans** section me jata hai.
   - Plans browse karta hai (e.g., Basic AMC: 2 Services/yr, Comprehensive AMC: Free Spares + 3 Services/yr).
   - Appliance serial number, age, aur photos input karta hai.
2. **Pre-AMC Inspection (Condition Verification):**
   - Agar product old hai (> 1 year), system automatic *Pre-AMC Technician Inspection* schedule karta hai.
   - Technician check karta hai ki product working state me hai ya pehle se fault hai.
   - Approval ke baad AMC status **Verified & Eligible** update hota hai.
3. **Payment & AMC Contract Activation:**
   - User subscription fee pay karta hai (Monthly / Yearly).
   - System **AMC Contract Agreement & Schedule Card** (Periodic Service Dates e.g., Month 4, Month 8, Month 12) generate karta hai.

### **Phase B: Scheduled Periodic Maintenance Services (Auto-Triggered)**
1. **Automated Preventive Maintenance Scheduling:**
   - Calendar date aane par System automatically **Service Request Ticket** generate kar deta hai.
   - User ko pre-notification SMS/Push milta hai slot choose karne ke liye.
2. **Technician Auto-Assignment & Dispatch:**
   - System technician assign karta hai -> Live tracking -> Masked Call.
3. **Execution & Service Checklist:**
   - Technician maintenance checklist perform karta hai (Cleaning, Pressure check, Gas leak check, Part wear check).
   - Before & After photos app me upload karta hai.
4. **Job Closure:**
   - User OTP verify karta hai, AMC quota me se 1 Service deduction complete dikhati hai (e.g., 2 Services remaining out of 3).

### **Phase C: AMC Breakdown / Repair Requests**
1. **Breakdown Claim:**
   - AMC period ke dauran issue aane par user *“AMC Breakdown Claim”* raise karta hai.
2. **Zero Visit Fee & Discounted Spares Engine:**
   - System AMC active status detect karke Inspection/Labor Charge **₹0** apply karta hai.
   - Comprehensive AMC hone par included spare parts **₹0** apply hote hain.
3. **Assignment -> Execution -> Closure:**
   - Same Intelligent assignment, Live Tracking, Number Masking, Workload management, and OTP verification flow follow hota hai.

---

### 📊 Comprehensive Flow Summary Table

| Module | Trigger Point | Validation / Engine | Primary Outcome | Key Panel Stakeholders |
| :--- | :--- | :--- | :--- | :--- |
| **Extended Warranty** | Primary Warranty expiry or Post-Purchase | Invoice & Age Smart Eligibility Engine | Digital Warranty Policy & Automated Claim Engine | User, Brand Panel, Admin |
| **Exchange** | Old product replacement request | AI/Rule Price Engine + Technician Physical Verification | Exchange Coupon / Cash Payout & Old Product Pickup | User, Technician, Warehouse/Admin |
| **Buy** | Purchasing Spares, Accessories, New Items | Spare Part Compatibility & Inventory Check | Order Delivery + Auto Installation Ticket Creation | User, Brand/Vendor, Delivery Partner, Technician |
| **AMC Plans** | Annual Subscription for periodic maintenance | Pre-Inspection Check + AMC Contract Engine | Scheduled Maintenance Reminders + Free Breakdown Repairs | User, Technician, Admin |

All of these flows integrate seamlessly into your core **Smart Hybrid Service Management System** with **Intelligent Technician Auto-Assignment**, **Live Google Maps Tracking**, **Virtual Number Masking**, and **Role-Based Panels (User, Technician, Brand, Admin)**.

### User Input

Phase A: Purchase & Activation (Extended Warranty Purchase)
User Initiation:
User User Panel par apna appliance select karta hai (ya invoice upload karke appliance register karta hai).
System appliance ki purchase date, category, aur brand rules check karta hai.
User ko Extended Warranty Plans (e.g., 1 Year / 2 Year coverage) display hote hain.
Eligibility & Plan Selection:
System smart rule engine run karta hai: Kya product eligible hai? (Age of appliance < 3 ya 5 years, invoice valid).
User desired plan choose karta hai.
Payment & Policy Generation:
User payment gateway (UPI / Card / Wallet / Netbanking) se payment karta hai.
System ek unique Warranty Certificate & Policy ID generate karta hai aur PDF user panel me attach kar deta hai.
Policy state Active ho jati hai (activation date & expiry date calculate karke).
Notification:
WhatsApp / SMS / Email ke dwara User & Brand/System Admin ko confirmation aur policy document notification send hota hai.

please check and tell me that for that phase what things are available in code and what is missing please make checklist 

*User accepted the command `git pull`*

### Planner Response

Let's inspect the existing codebase to audit Phase A (Purchase & Activation of Extended Warranty).

Let's check the routes/models/controllers in backend and components/pages in frontend to see what exists for Extended Warranty Purchase & Activation.

Let's list files in backend first.

*Listed directory [backend](file:///c:/Users/HP/Desktop/nigam-service/backend) *

### Planner Response

Let's list files in `backend/src` and search for warranty related routes/models/controllers/services.

*Listed directory [src](file:///c:/Users/HP/Desktop/nigam-service/backend/src) *

### Planner Response

Let's check `backend/src/modules` and `frontend/src` to see existing modules and pages.

*Listed directory [modules](file:///c:/Users/HP/Desktop/nigam-service/backend/src/modules) *

### Planner Response

`backend/src/modules/warranty-amc-exchange` exists! Let's list files in `backend/src/modules/warranty-amc-exchange`.

*Listed directory [warranty-amc-exchange](file:///c:/Users/HP/Desktop/nigam-service/backend/src/modules/warranty-amc-exchange) *

### Planner Response

Let's search for warranty controller/routes or view `extendedWarrantyOrder.model.js` and `warrantyDetector.service.js`.
Let's view `extendedWarrantyOrder.model.js` and `warrantyDetector.service.js`.

*Viewed [extendedWarrantyOrder.model.js](file:///c:/Users/HP/Desktop/nigam-service/backend/src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js) *

### Planner Response

Let's view `warrantyDetector.service.js` to see what is in backend for warranty detection.

*Viewed [warrantyDetector.service.js](file:///c:/Users/HP/Desktop/nigam-service/backend/src/modules/warranty-amc-exchange/warrantyDetector.service.js) *

### Planner Response

Let's also check frontend files for Extended Warranty. Let's do a search for `ExtendedWarranty` or `Extended Warranty` or `Extended` in frontend.

*Grep searched codebase*

### Planner Response

Let's also search for `warranty` in `frontend/src` to see what warranty related pages/components exist.

*Grep searched codebase*

### Planner Response

Let's review `ExtendWarranty.jsx` to see what is currently UI-wise implemented in frontend. Let's view `frontend/src/pages/ExtendWarranty.jsx`.

*Viewed [ExtendWarranty.jsx](file:///c:/Users/HP/Desktop/nigam-service/frontend/src/pages/ExtendWarranty.jsx) *

### Planner Response

Now we have a clear understanding of both the backend capabilities and the frontend implementation for **Phase A: Extended Warranty Purchase & Activation**.

Let's do a complete, meticulous line-by-line verification of what is **Available in Code** vs what is **Missing in Code** for Phase A, and present a structured Checklist.

Let's break down each step of Phase A:

1. **User Initiation**:
   - User Panel par appliance select karna ya invoice upload karke register karna.
   - System purchase date, category, aur brand rules check karna.
   - Plans (1 Year / 2 Year) display hona.

2. **Eligibility & Plan Selection**:
   - Smart Rule Engine check karna (Age < 3 ya 5 years, invoice valid).
   - User plan choose karna.

3. **Payment & Policy Generation**:
   - Payment gateway (UPI / Card / Wallet / Netbanking) payment.
   - Unique Warranty Certificate & Policy ID generation + PDF link attachment.
   - Policy state 'Active' hona (activation & expiry calculation).

4. **Notification**:
   - WhatsApp / SMS / Email ke dwara User & Brand/System Admin ko notification & policy document delivery.

Let's organize the response cleanly, highlighting what is ALREADY IMPLEMENTED (Available) and what is MISSING (To be built/integrated), structured by sub-step as requested. No code changes will be made ("do not change anything and do not make any changes").Aapke **Phase A: Extended Warranty Purchase & Activation** ke exact flow ke aadhar par pure codebase (Frontend & Backend) ka deep audit kiya gaya hai.

Niche **Available vs. Missing Features Ka Detailed Checklist** diya gaya hai:

---

# 📋 Phase A: Purchase & Activation (Extended Warranty Purchase) Checklist

---

### Step 1: User Initiation
| Requirement | Status | Available in Code | Missing in Code |
| :--- | :---: | :--- | :--- |
| **Select Existing Appliance / Register New** | 🟡 Partial | UI present in [`ExtendWarranty.jsx`](file:///c:/Users/HP/Desktop/nigam-service/frontend/src/pages/ExtendWarranty.jsx) to select registered appliance or input Category/Brand/Model/Serial No. | Real-time fetch of user's registered appliances from backend DB `OwnedAppliance`. |
| **Invoice Upload** | 🟡 Partial | UI file input & upload progress bar state in `ExtendWarranty.jsx`. | Cloud Storage integration (e.g. AWS S3 / Cloudinary upload route) to store invoice PDF/Image URL in backend. |
| **System Check (Purchase Date, Category, Brand)** | 🟢 Available | `warrantyDetector.service.js` has brand/category resolution and purchase date check logic. | Linking frontend date input directly to rule-check API before plan display. |
| **Display Extended Warranty Plans (1 Year / 2 Year)** | 🟢 Available | Frontend UI displays 1-Year (₹799) & 2-Year Gold (₹1399) extension packs. | Admin API to dynamically configure plan prices based on Appliance Category/Brand (currently static in UI). |

---

### Step 2: Eligibility & Plan Selection
| Requirement | Status | Available in Code | Missing in Code |
| :--- | :---: | :--- | :--- |
| **Smart Rule Engine Check** <br> *(Appliance Age < 3 or 5 Years & Invoice Validity)* | 🟡 Partial | `computeWarrantyStatus` in `warrantyEngine.js` checks purchase date relative to warranty age. | Strict backend API validation blocking purchase if age exceeds brand limit (e.g. >3/5 years). |
| **User Plan Selection** | 🟢 Available | Interactive selection state (`setSelectedPlan`) in `ExtendWarranty.jsx`. | Storing transient selection in checkout session state. |

---

### Step 3: Payment & Policy Generation
| Requirement | Status | Available in Code | Missing in Code |
| :--- | :---: | :--- | :--- |
| **Payment Gateway Integration** <br> *(UPI / Card / Wallet / Netbanking)* | 🟡 Partial | UI has Payment Options (UPI & Card Mock Flow). Backend `payments-wallet` module exists. | Real Razorpay / Cashfree / PhonePe gateway webhook verification for Extended Warranty order creation. |
| **Unique Warranty Certificate & Policy ID Generation** | 🟢 Available | Backend `extendedWarrantyOrder.model.js` auto-generates prefixed ID (e.g., `EW-XXXXX`). | Auto PDF Certificate Generation Service (e.g. via `pdfkit` / `puppeteer`) to generate downloadable certificate PDF. |
| **PDF Attachment to User Panel** | 🔴 Missing | Policy details table shown on success screen in UI. | PDF generation & file attachment link stored in `invoiceFileUrl` / `certificateUrl`. |
| **Policy State set to 'Active'** <br> *(ValidTill calculation & Claim count initialization)* | 🟢 Available | `extendedWarrantyOrder.model.js` schema includes `status: 'Active'`, `validTill`, `claimsTotal`, `claimsRemaining`. | API endpoint to execute database saving upon payment webhook trigger. |

---

### Step 4: Notification
| Requirement | Status | Available in Code | Missing in Code |
| :--- | :---: | :--- | :--- |
| **WhatsApp / SMS / Email Notifications** | 🟡 Partial | `notifications` backend module exists for SMS / Push. | Trigger event on Extended Warranty Order creation sending WhatsApp/SMS with policy link. |
| **Brand/System Admin Notification** | 🟡 Partial | Socket notification structure & Admin notification log exist. | Automatic sync event notifying Brand Admin panel of new Extended Warranty registration. |

---

## 🎯 Summary Checklist & Action Plan (Without Code Modification)

### ✅ What is ALREADY BUILT:
1. **Frontend Flow UI**: Complete multi-step wizard in `ExtendWarranty.jsx` (Select Appliance -> Select Plan -> Payment -> Success Certificate Summary).
2. **Database Schema**: `ExtendedWarrantyOrder` Mongoose model defined with all required fields (`user`, `appliance`, `brand`, `purchaseDate`, `validTill`, `status`, `claimsRemaining`).
3. **Detection Engine**: `warrantyDetector.service.js` which detects active extended warranty orders during service booking.

### ⚠️ What is MISSING & Needs Integration:
1. **Dynamic Backend Plan API**: Endpoint to fetch dynamic plans per brand/category.
2. **Strict Eligibility API Check**: Endpoint returning eligibility response based on purchase date (e.g., Appliance Age <= 3/5 years).
3. **Automated PDF Certificate Generator**: Server script generating the downloadable Warranty Certificate PDF upon payment success.
4. **Real Payment Webhook Hookup**: Triggering `ExtendedWarrantyOrder` document creation upon payment success event.
5. **Notification Trigger**: WhatsApp / Email PDF attachment dispatch upon activation.