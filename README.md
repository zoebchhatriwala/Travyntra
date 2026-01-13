# Travyntra — Corporate Travel Infrastructure

Travyntra is a modern, multi-tenant travel management ecosystem that bridges the gap between Travel Agencies, Corporations, and their Staff. It facilitates seamless journey planning, hierarchical approval workflows, and centralized financial operations.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Dedicated portals for multiple companies (`/company/[slug]`).
- **Agency Fulfillment Console**: Specialized dashboard for travel agencies to bid on and fulfill requests.
- **Hierarchical Workflows**: customizable approval chains (Manager -> Finance -> Agency).
- **Real-time Collaboration**: Slack-like discussion threads for every travel request with file attachments.
- **Role-Based Access**: Granular permissions for Super Admins, Company Admins, Employees, and Agents.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: Tailwind CSS & Vanilla CSS Modules
- **Validation**: Zod & React Hook Form

## ⚡️ Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local database)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/zoebchhatriwala/Travyntra.git
    cd Travyntra
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    Copy the example env file and update if necessary:
    ```bash
    cp .env.example .env
    ```

4.  **Start Database**
    Use Docker Compose to spin up a local PostgreSQL instance:
    ```bash
    docker-compose up -d
    ```

5.  **Initialize Database**
    Push the schema and seed initial data:
    ```bash
    npx prisma db push
    npm run seed
    # Or: npx prisma migrate dev
    ```

6.  **Run Development Server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Default Login Credentials (Seeded)

The seed script creates a complete ecosystem for testing:

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | `admin@travyntra.com` | `password` |
| **Agency Agent** | `john@premiumtravel.com` | `password` |
| **Company Admin** | `alice@acme.com` | `password` |
| **Employee** | `charlie@acme.com` | `password` |

## 📂 Project Structure

- `/src/app`: App Router pages and layouts.
- `/src/components`: UI components (clean separation of concerns).
- `/src/lib`: Utilities, database clients, and shared logic.
- `/prisma`: Database schema and seed scripts.
- `/SPECS.md`: Detailed technical specifications and roadmap.

## 🤝 Contributing

Please read `SPECS.md` and `BRANDING.md` before making changes to ensure alignment with the technical and design vision.
