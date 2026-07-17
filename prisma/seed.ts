// Creates the first Super Admin account so there's a way to log in at all —
// there is no public self-registration endpoint by design (see auth.routes.ts).
// Every other staff account is then created from the admin panel itself
// (Staff page) via the already-authenticated admin.
//
// Usage:
//   SEED_ADMIN_EMAIL=admin@clinic.com SEED_ADMIN_PASSWORD='a-strong-passphrase' npm run prisma:seed
// If the env vars are omitted, the defaults below are used — change the
// password immediately after first login if you rely on the default.
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password';

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@clinic.local';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!Now';
const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? 'Super';
const lastName = process.env.SEED_ADMIN_LAST_NAME ?? 'Admin';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`A user with email ${email} already exists — nothing to do.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role: Role.SUPER_ADMIN },
  });

  console.log('Super Admin account created:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('Log in with these, then change the password from the profile screen.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
