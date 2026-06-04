# FitCore Backend

Express API with Prisma (PostgreSQL), JWT auth, RBAC, Stripe Checkout.

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

## Seed credentials

| Role    | Email                                   | Password    |
| ------- | --------------------------------------- | ----------- |
| Admin   | admin@gmail.com                         | Admin@123   |
| Trainer | trainer1@gmail.com … trainer3@gmail.com | Trainer@123 |
| Member  | member1@gmail.com … member10@gmail.com  | Member@123  |

## API modules

| Module     | Base path         |
| ---------- | ----------------- |
| Auth       | `/api/auth`       |
| Trainers   | `/api/trainers`   |
| Members    | `/api/members`    |
| Plans      | `/api/plans`      |
| Attendance | `/api/attendance` |
| Payments   | `/api/payments`   |
| Dashboard  | `/api/dashboard`  |

Stripe webhook (raw body): `POST /api/payments/webhook`

## Architecture

Controllers → Services → Prisma. See `.cursor/rules/fitcore.mdc`.
