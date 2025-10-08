
## **Project Title: JobSync – Unified Job Application Hub**

### **Overview**

Job hunting shouldn’t mean juggling 10 tabs and endless forms. **JobSync** brings major job portals like *Naukri, Internshala, Glassdoor, and Unstop* into one place.

Users can link their existing accounts, manage profiles, and push updates (like resumes or profile info) to all connected platforms — all from a single dashboard.

This is a **collaborative open-source project** built with **Express + React + JWT Auth**, designed for students and developers to learn and contribute while solving a real-world problem.

---

### **Key Features / Modules**

1. **Unified Dashboard:**
    
    View all your connected job portals in one interface.
    
2. **Multi-Platform Integration:**
    
    Connect APIs of Naukri, Internshala, Glassdoor, Unstop, etc.
    
3. **Profile Sync:**
    
    Update resume, profile, and preferences once — sync everywhere.
    
4. **Smart Notifications:**
    
    Get alerts about new job matches or application updates from all sources.
    
5. **Analytics & Insights:**
    
    Track job application progress, response rates, and profile strength.
    
6. **Community Contributions:**
    
    Open source-friendly — developers can add new integrations or UI modules.
    
7. **Secure Authentication:**
    
    JWT-based login, OAuth for third-party platforms.
    
8. **Admin Control Panel:**
    
    Manage platform integrations, monitor API health, and handle user feedback.
    

---

### **User Roles**

| Role | Description | Permissions |
| --- | --- | --- |
| **User (Job Seeker)** | Regular user who connects job portals and manages applications. | Create/edit profile, sync data, apply to jobs, view analytics. |
| **Admin** | Manages integrations, oversees API usage, and handles reports. | Access dashboard, edit integrations, manage users. |
| **Guest** | Unregistered visitor exploring the platform. | View limited demo pages and documentation. |

---

### **Page / Screen List (Frontend)**

1. **Landing Page** – Intro, features, and call-to-action to sign up.
2. **Login / Signup Page** – JWT-based authentication with OAuth options.
3. **Dashboard** – Overview of connected platforms and sync status.
4. **Profile Page** – Edit personal info, resume, and preferences.
5. **Connections Page** – Manage and link/unlink job portal accounts.
6. **Applications Page** – View job listings and track application statuses.
7. **Admin Panel** – Integration management, logs, and user control.
8. **Settings Page** – Account preferences, theme, and notifications.

---

### **Database Schema (Rough Draft)**

### **Users Table**

| Field | Type | Description |
| --- | --- | --- |
| user_id | INT (PK) | Unique user identifier |
| name | VARCHAR | User’s full name |
| email | VARCHAR | Unique email |
| password_hash | VARCHAR | Encrypted password |
| role | ENUM(user, admin) | Role type |
| created_at | TIMESTAMP | Account creation date |

### **Connections Table**

| Field | Type | Description |
| --- | --- | --- |
| connection_id | INT (PK) | Unique connection record |
| user_id | INT (FK → Users.user_id) | Linked user |
| platform_name | VARCHAR | e.g., “Naukri”, “Internshala” |
| api_token | VARCHAR | Auth token for connected platform |
| last_sync | TIMESTAMP | Last sync time |

### **Jobs Table**

| Field | Type | Description |
| --- | --- | --- |
| job_id | INT (PK) | Unique job record |
| user_id | INT (FK → Users.user_id) | Associated user |
| platform_name | VARCHAR | Source platform |
| job_title | VARCHAR | Job position |
| status | ENUM(applied, shortlisted, rejected, etc.) | Application status |
| applied_on | DATE | Application date |

---

### **Tech Stack (Tentative)**

**Frontend:** React, Tailwind CSS, Axios

**Backend:** Express.js, Node.js

**Database:** MySQL or PostgreSQL (via Prisma ORM)

**Authentication:** JWT, OAuth2 (for third-party portals)

**APIs / Integrations:** RESTful APIs (Naukri, Internshala, etc.)

**Version Control:** Git + GitHub (open source)

**Deployment:** Vercel (frontend), Render / Railway (backend)

---

### **Workflow (Simplified)**

1. **User logs in / signs up** → JWT token issued.
2. **User connects job portals** → OAuth or API token stored securely.
3. **Dashboard displays all connections** → syncs data from APIs.
4. **User updates profile/resume** → pushes changes across linked platforms.
5. **System fetches and tracks job applications** → displays analytics.

---

### **Expected Outcomes**

- A working prototype that syncs user data across multiple job platforms.
- Clean and responsive frontend UI.
- Secure backend with JWT + API integration logic.
- Contributor-friendly open-source structure for future integrations.
- Real learning experience in full-stack dev, APIs, and authentication flows.

---

### **Bonus Ideas (Future Roadmap)**

- Resume parsing & AI-based profile optimization.
- Job recommendation engine using ML.
- Browser extension for quick apply.
- Mobile app version (React Native).