# SaaS Manager - Billing & Collections System

Internal web application for managing customer payments, service periods, operational status, and fiscal data for invoice preparation.

## Features

- **Customer Management**: Track commercial and fiscal information
- **Payment Processing**: Register payments and automatically generate service periods
- **Status Tracking**: Real-time calculation of financial, operational, and relationship statuses
- **Collections Management**: Monitor overdue accounts and grace periods
- **Informative Billing**: Prepare fiscal data for external invoice generation

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (simple username/password)
- **UI**: Tailwind CSS with custom components
- **State Management**: React Server Components

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## Setup

1. **Clone and install dependencies**:
   ```bash
   # Using npm
   npm install
   
   # Or using yarn
   yarn install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   # Database Connection (Prisma reads this from environment)
   # Replace USERNAME, PASSWORD, HOST, PORT, and DATABASE_NAME with your PostgreSQL credentials
   DATABASE_URL="postgresql://user:password@localhost:5432/saas_manager?schema=public"
   
   # NextAuth Configuration
   NEXTAUTH_URL="http://localhost:3000"
   
   # NextAuth Secret Key - Generate with: openssl rand -base64 32
   NEXTAUTH_SECRET="your-secret-key-here"
   ```
   
   **Important**: 
   - The `DATABASE_URL` is used by both Prisma (for migrations) and the application (for database connections)
   - Prisma reads this from `process.env.DATABASE_URL` as configured in `prisma.config.ts`
   - Replace the placeholder values with your actual PostgreSQL credentials
   - Generate a secure secret key:
     ```bash
     openssl rand -base64 32
     ```

3. **Set up the database**:
   ```bash
   # Step 1: Generate Prisma client (required before migrations and seeding)
   npm run db:generate    # or: yarn db:generate
   
   # Step 2: Run migrations (creates database tables)
   npm run db:migrate     # or: yarn db:migrate
   
   # Step 3: Seed initial data (creates admin user)
   # Note: Run this AFTER db:generate and db:migrate
   npm run db:seed        # or: yarn db:seed
   ```
   
   **Important**: 
   - Always run `db:generate` first, then `db:migrate`, then `db:seed`
   - The Prisma client must be generated before you can run migrations or seed scripts
   - Prisma 7 requires the PostgreSQL adapter (`@prisma/adapter-pg`) which is already included in dependencies
   
   Default admin credentials:
   - Username: `admin`
   - Password: `admin123`
   (Change this in production!)

4. **Run the development server**:
   ```bash
   npm run dev    # or: yarn dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
saas-manager/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seed script
│   └── migrations/         # Database migrations
├── src/
│   ├── app/
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Main application pages
│   │   └── api/            # API routes
│   ├── components/         # React components
│   ├── lib/                # Utilities and business logic
│   └── types/              # TypeScript type definitions
└── public/                 # Static assets
```

## Key Concepts

### Status Types

- **Financial Status**: PAID, PENDING, OVERDUE, NO_ACTIVE_AGREEMENT
- **Operational Status**: ACTIVE, ACTIVE_WITH_DEBT, SUSPENDED, CANCELLED, LOST_CUSTOMER
- **Relationship Status**: ACTIVE, UNDER_FOLLOW_UP, SUSPENDED_NON_PAYMENT, etc.

### Business Rules

1. Service periods are automatically generated when payments are registered
2. Statuses are calculated based on service period dates and grace periods
3. The system does NOT generate invoices - it only prepares fiscal data
4. All statuses are color-coded for quick visual identification

## Development

```bash
# Development server
npm run dev          # or: yarn dev

# Build for production
npm run build        # or: yarn build

# Start production server
npm start            # or: yarn start

# Run linter
npm run lint         # or: yarn lint

# Database commands
npm run db:generate  # or: yarn db:generate    # Generate Prisma client
npm run db:migrate   # or: yarn db:migrate      # Run migrations
npm run db:seed      # or: yarn db:seed         # Seed database
```

## Important Notes

- This system **does not** generate CFDI invoices
- This system **does not** connect to SAT
- This system **does not** replace an ERP
- It only centralizes information for manual invoice generation

## License

Private - Internal use only
