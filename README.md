# GarageBuddy - Proprietary Garage Management SaaS

**GarageBuddy** is a modern SaaS platform built to cater to the needs of auto mechanics and workshops. It simplifies the process of managing service records, jobs, customers, and vehicles.

Everything can be easily tracked and organized within the application, utilizing a highly scalable, fully serverless architecture.

## Architecture

GarageBuddy has been modernized from a legacy .NET monolith to a cutting-edge serverless SaaS stack:

- **Frontend**: Next.js (App Router), React 18, TypeScript
- **Backend & Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Data Isolation**: Multi-tenant architecture enforced via PostgreSQL Row-Level Security (RLS) policies.

## Key Features

- **Cloud-Based SaaS Solution**: GarageBuddy is a fully-featured, cloud-based application. Mechanics can access the system from anywhere without any complex installations.
- **Multi-Tenant Data Isolation**: The system supports multiple distinct garages (tenants). Data is completely isolated via database-level RLS, ensuring maximum security and privacy between different businesses.
- **Interactive Kanban Job Board**: Effortlessly manage repair orders with a drag-and-drop workflow (Pending, In Progress, Waiting on Parts, Done).
- **Service & Customer Tracking**: Keep a detailed log of every customer and their vehicles. Track complete service histories to ensure premium customer service.

## Install and Run (Development)

To get started with GarageBuddy locally:

### 1. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of the `supabase_schema.sql` file provided in this repository and run it. This will automatically set up the 10 core tables and apply all necessary Row-Level Security policies.

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

