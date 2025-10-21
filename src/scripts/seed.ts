import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '../common/enums';
import * as bcrypt from 'bcryptjs';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  // Create Bank Admin
  const adminExists = await userRepository.findOne({
    where: { email: 'admin@oaabank.com' },
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const admin = userRepository.create({
      email: 'admin@oaabank.com',
      password: hashedPassword,
      firstName: 'Bank',
      lastName: 'Administrator',
      role: UserRole.BANK_ADMIN,
      isActive: true,
      emailVerified: true,
    });
    await userRepository.save(admin);
    console.log('✅ Bank Admin created: admin@oaabank.com / password123');
  }

  // Create Account Manager
  const managerExists = await userRepository.findOne({
    where: { email: 'manager@oaabank.com' },
  });

  if (!managerExists) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const manager = userRepository.create({
      email: 'manager@oaabank.com',
      password: hashedPassword,
      firstName: 'Account',
      lastName: 'Manager',
      role: UserRole.ACCOUNT_MANAGER,
      isActive: true,
      emailVerified: true,
    });
    await userRepository.save(manager);
    console.log(
      '✅ Account Manager created: manager@oaabank.com / password123',
    );
  }

  // Create Auditor
  const auditorExists = await userRepository.findOne({
    where: { email: 'auditor@oaabank.com' },
  });

  if (!auditorExists) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const auditor = userRepository.create({
      email: 'auditor@oaabank.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Auditor',
      role: UserRole.AUDITOR,
      isActive: true,
      emailVerified: true,
    });
    await userRepository.save(auditor);
    console.log('✅ System Auditor created: auditor@oaabank.com / password123');
  }

  // Create Test Client
  const clientExists = await userRepository.findOne({
    where: { email: 'client@example.com' },
  });

  if (!clientExists) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const client = userRepository.create({
      email: 'client@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    });
    await userRepository.save(client);
    console.log('✅ Test Client created: client@example.com / password123');
  }

  // Create Demo Admin
  const demoAdminExists = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (!demoAdminExists) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const demoAdmin = userRepository.create({
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'Admin',
      role: UserRole.BANK_ADMIN,
      isActive: true,
      emailVerified: true,
    });
    await userRepository.save(demoAdmin);
    console.log('✅ Demo Admin created: admin@example.com / password123');
  }

  await app.close();
  console.log('🌱 Database seeded successfully!');
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
