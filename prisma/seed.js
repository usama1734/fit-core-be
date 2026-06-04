import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hash(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('Seeding FitCore database...');

  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.member.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.user.deleteMany();

  const plans = await Promise.all([
    prisma.membershipPlan.create({
      data: {
        name: 'Basic',
        description: 'Gym floor access, off-peak hours',
        price: 29.99,
        durationDays: 30,
        features: ['Floor access', 'Locker room', 'Off-peak hours'],
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: 'Standard',
        description: 'Full access plus group classes',
        price: 49.99,
        durationDays: 30,
        features: ['All Basic features', 'Group classes', 'Sauna'],
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: 'Premium',
        description: 'Unlimited access, PT session, priority booking',
        price: 79.99,
        durationDays: 30,
        features: ['All Standard features', '1 PT session/month', 'Priority booking'],
      },
    }),
  ]);

  const [basicPlan, standardPlan, premiumPlan] = plans;

  const adminHash = await hash('Admin@123');
  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      passwordHash: adminHash,
      firstName: 'FitCore',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  });

  const trainerDefs = [
    { email: 'trainer1@gmail.com', firstName: 'Alex', lastName: 'Stone', specialty: 'Strength' },
    { email: 'trainer2@gmail.com', firstName: 'Jordan', lastName: 'Reed', specialty: 'Cardio' },
    { email: 'trainer3@gmail.com', firstName: 'Sam', lastName: 'Brooks', specialty: 'HIIT' },
  ];

  const trainerPassword = await hash('Trainer@123');
  const trainers = [];

  for (const t of trainerDefs) {
    const trainer = await prisma.trainer.create({
      data: {
        specialty: t.specialty,
        phone: '+15550001001',
        user: {
          create: {
            email: t.email,
            passwordHash: trainerPassword,
            firstName: t.firstName,
            lastName: t.lastName,
            role: 'TRAINER',
          },
        },
      },
    });
    trainers.push(trainer);
  }

  const memberPassword = await hash('Member@123');
  const planRotation = [basicPlan, standardPlan, premiumPlan];
  const members = [];

  for (let i = 1; i <= 10; i++) {
    const plan = planRotation[(i - 1) % 3];
    const trainer = trainers[Math.floor((i - 1) / 4) % 3];
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);

    const member = await prisma.member.create({
      data: {
        phone: `+15550002${String(i).padStart(3, '0')}`,
        trainer: { connect: { id: trainer.id } },
        membershipPlan: { connect: { id: plan.id } },
        membershipStart: start,
        membershipEnd: end,
        paymentStatus: 'PAID',
        user: {
          create: {
            email: `member${i}@gmail.com`,
            passwordHash: memberPassword,
            firstName: `Member`,
            lastName: `${i}`,
            role: 'MEMBER',
          },
        },
      },
    });
    members.push(member);
  }

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() - (i % 5));
    checkIn.setHours(8 + (i % 4), 0, 0, 0);

    const checkOut = new Date(checkIn);
    checkOut.setHours(checkIn.getHours() + 1);

    await prisma.attendance.create({
      data: {
        memberId: member.id,
        checkInAt: checkIn,
        checkOutAt: i % 3 === 0 ? null : checkOut,
        method: i % 2 === 0 ? 'QR' : 'MANUAL',
      },
    });
  }

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const plan = planRotation[i % 3];
    await prisma.payment.create({
      data: {
        member: { connect: { id: member.id } },
        membershipPlan: { connect: { id: plan.id } },
        amount: plan.price,
        status: i < 8 ? 'COMPLETED' : 'PENDING',
        paidAt: i < 8 ? new Date() : null,
      },
    });
  }

  await prisma.gymCheckInConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', token: `FC-GYM-${randomUUID()}` },
    update: {},
  });

  console.log('Seed complete.');
  console.log('Admin: admin@gmail.com / Admin@123');
  console.log('Trainers: trainer1-3@gmail.com / Trainer@123');
  console.log('Members: member1-10@gmail.com / Member@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
