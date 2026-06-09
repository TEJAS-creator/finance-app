# AuraFinance — Premium Personal Finance Analyzer

AuraFinance is a beautiful, secure, and high-performance financial tracking application. Built with a stunning design, it enables users to seamlessly upload bank statements (CSV or PDF), extract transaction ledgers using instant client-side parsers or advanced Gemini AI model calls, visualize spending habits with interactive charts, and convert global currencies in real-time.

---

## 🌟 Core Features

### 1. Secure Multi-Method Authentication
* **Firebase Auth Integration**: Includes pre-configured email-password registration and login with comprehensive error handling (e.g., weak password detection, email already in use, invalid credentials).
* **One-Click Google Sign-In**: Quick Google account login through a secure pop-up window with automatic account selection.
* **Persistent Sessions**: Real-time state listener (`onAuthStateChange`) automatically redirects authenticated users to their personal dashboard or back to login.

### 2. High-Fidelity Interactive Dashboard
* **Dynamic Financial Health Score**: Instantly calculates monthly financial performance (`debit` to `credit` ratio) and rates it as **Excellent**, **Good**, or **Caution** on the fly.
* **Key KPI Metric Widgets**: Shows visual summaries of **Total Credits (Income)**, **Total Expenses**, and **Estimated Savings** with custom localized formatting (Rupee `₹` and Dollar `$`).
* **Interactive Data Visualization**: Renders an interactive Recharts Donut/Pie chart highlighting expense categories with premium glassmorphic tooltips and active segment mouse tracking.
* **Granular Transaction Ledger**: Displays a chronological list of transactions complete with dynamic merchant icons, confidence levels, category markers, and debit/credit styling.
* **Firestore Data Purge**: Clear the entire ledger database securely at any time using the one-click database reset action.

### 3. Dual Statement Parsing Engine
* **Local High-Performance Parser (`<20ms`)**:
  * **Dynamic CSV Scanning**: Skip metadata fields, auto-detect columns (date, merchant, type, amount, category), and accurately process thousands of transaction rows entirely in-browser.
  * **Lazy-Loaded PDF Text Extraction**: Uses an asynchronous CDN injection of the `PDF.js` library to extract raw text content from multi-page PDF statements without bloating local Node bundle sizes.
  * **Rules-Based Keyword Matcher**: Instantly parses and classifies transactions into 9 major buckets (Food, Transport, Shopping, Subscription, Essentials, Entertainment, Healthcare, Education, Miscellaneous) using strict regex matching.
* **Gemini 2.5 Flash AI Parser**:
  * Leverages Google's `gemini-2.5-flash` model to analyze complex statement dumps.
  * Employs structural JSON schema mode (`RESPONSE_SCHEMA`) to reliably construct transaction nodes, clean merchant descriptions, and categorize items.
  * Generates a custom summary paragraph of cash flows along with **3 bespoke, highly tactical optimization insights** tailored to the user's spending habits.

### 4. Global Foreign Exchange Center (Dedicated View)
* **Dedicated Forex Workspace**: Accessible via a sleek sidebar navigation button below the dashboard.
* **Bank-Grade Real-Time Converter**: Supports ~160 world currencies with up-to-date daily exchange rates fetched from a secure Open Exchange API (https://open.er-api.com/v6/latest/USD).
* **Dual-Dropdown Selector & Auto-Swapper**: Swap from/to currencies instantly or key in custom numbers to see computed conversions in real time.
* **Interactive Global Hotlist**: Displays popular trading pairs (USD to EUR, GBP, INR, JPY, AUD, CAD, CHF, CNY) with custom country flag emojis and daily price trend statuses.

---

## 🛠️ Technology Stack & Libraries

### Frontend Framework & Styling
* **React 19** + **Vite**: Ultra-fast next-generation development server and compiler.
* **Tailwind CSS v4** & **Custom Glassmorphic CSS**: Delivers modern, premium dark UI aesthetics using CSS custom properties, backdrop filters, rich gradients, and smooth animation keyframes.
* **Framer Motion**: Powering fluid transitions, fading alerts, and sliding modal overlays.
* **Lucide React**: Clean, modern vector icon set.

### State Management & Visualization
* **Recharts**: Responsive vector chart rendering engine.
* **React Router DOM v7**: Fast client-side routing, protected routes, and custom layouts.

### Backend Infrastructure
* **Firebase v12**:
  * **Firebase Authentication**: For user access token exchange, verification, and session persistence.
  * **Cloud Firestore**: Real-time NoSQL cloud database storing isolated transaction documents under `/users/{uid}/transactions` and custom analysis under `/users/{uid}/insights/latest`.
  * **Firebase Firestore Rules**: Configured for complete data isolation (users can only access documents matching their authenticated Firebase UID).

---

## 📂 Project Architecture

The directory tree is clean, modular, and organized into functional layers:

```
personal-finance-analyzer/
├── public/                    # Static assets
├── src/
│   ├── components/            # Reusable UI widgets
│   │   ├── CurrencyConverter.jsx     # Currency conversion panel
│   │   ├── CurrencyConverter.css     # CSS rules for converter layout
│   │   ├── DashboardLayout.jsx       # Standard sidebar/navigation wrapper
│   │   ├── DashboardLayout.css       # Core shell visual rules
│   │   └── StatementUpload.jsx       # Drag & drop CSV/PDF file uploader
│   ├── firebase/              # Firebase client SDK initialization
│   │   └── config.js                 # App configuration & instance exports
│   ├── pages/                 # Full routing view screens
│   │   ├── Auth.css                  # Styling sheet for signup/login
│   │   ├── CurrencyConverterPage.jsx # Dedicated FX view workspace
│   │   ├── CurrencyConverterPage.css # CSS styling sheet for FX views
│   │   ├── Dashboard.jsx             # Main dashboard analytics platform
│   │   ├── Dashboard.css             # Complex layout rules for dashboard panels
│   │   ├── Login.jsx                 # Guest login portal
│   │   └── Signup.jsx                # Guest registration portal
│   ├── services/              # API and data abstraction layers
│   │   ├── authService.js            # Sign up, Login, Logout, Google popup functions
│   │   ├── dbService.js              # Firestore batch writes, queries, and resets
│   │   ├── geminiService.js          # Gemini model prompt builder & JSON parsers
│   │   └── localParserService.js     # Client-side heuristic parser & validator
│   ├── utils/                 # Extraneous processing modules
│   │   ├── parserEngine.js           # Categories regex ruleset list
│   │   └── pdfExtractor.js           # Dynamic PDF.js text extractor
│   ├── App.jsx                # Router config, guest redirects & auth loader
│   ├── App.css                # Global layouts and brand theme variables
│   ├── index.css              # Custom font bindings and browser overrides
│   └── main.jsx               # React DOM hydration root
├── .env                       # Local developer secrets (Gemini API keys)
├── firebase.json              # Firebase Hosting configuration properties
├── firestore.rules            # Secure Firestore database isolation rules
└── package.json               # Package configurations and scripts
```

---

## 🔄 Core Application Workflows

### A. Statement Processing & Storage Pipeline

1. **User Input**: User drops a CSV or PDF bank statement in the dashboard dropzone.
2. **File Validation**: System reads the file header properties and validates banking keyword signatures to block unsupported documents.
3. **Text Extraction**: CSV text is parsed in-memory, while PDF text is lazy-extracted page-by-page through browser-based `PDF.js`.
4. **Engine Parsing Routing**: 
   * *Local Heuristics*: Categorizes descriptions using custom business rules.
   * *Gemini AI Model*: Structures raw narrative blocks into standardized JSON schemas, cleans merchant names, and generates customized financial behavioral summaries.
5. **Database Transaction Batching**: Formats transactions with confidence attributes and pushes them to Firestore using optimized batches in chunk sizes of 400.
6. **Dashboard State Updates**: Triggers responsive React page refetches to seamlessly update charts, ledger logs, and KPI scores.

### B. Security & Data Isolation Architecture
Every read and write request to Cloud Firestore is strictly validated. The project employs standard document-based protection:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lock down user records
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
*Users can never view, edit, or purge financial records belonging to another account.*

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18.x or above) installed on your system.

### 2. Clone and Setup Environment
Navigate to the `personal-finance-analyzer` subdirectory and create a local environment configuration file named `.env`:

```env
# Frontend environment injection
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Backend environment injection
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 3. Install Dependencies
Run the package installer from your terminal:
```bash
npm install
```

### 4. Boot Local Development Server
Launch the Vite development runtime environment:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

---

## 💎 Features Walkthrough

### 1. User Dashboard Screen
* Check key indicator blocks at the top of the viewport.
* Use the **Interactive Chart** widget in the center to view category splits; click different categories in the list to highlight their corresponding segments.
* Scroll through the **Transaction ledger table** to see live categorization flags, dates, and amounts. 
* Press the **AI Sparkle** button or review the **AI Advisory Summary card** in the analytics column to read specific, tactical recommendations.

### 2. Dedicated Currency Exchange Workspace
* Navigate to the **Currency Converter** option in the sidebar menu.
* Use the primary panel to calculate instant conversions between any currency pair worldwide.
* Tap the exchange button to swap **from** and **to** currencies instantly.
* Monitor the **Global Hotlist** cards to get a quick visual snapshot of key currencies relative to the US dollar.
