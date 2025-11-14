# OAA Banking System - Backend

Financial system for demonstrating orchestration of authentication and authorization processes in WEB applications.

## Architecture

### User Roles:

- **Bank Admin** - full access to the system
- **Account Manager** - management of client accounts
- **Client** - banking operations with own accounts
- **Auditor** - viewing audit logs and reports

### Main Features:

- ✅ JWT authentication with refresh tokens
- ✅ Role-Based Access Control (RBAC)
- ✅ Multi-level authorization
- ✅ Audit of all user actions
- ✅ Rate limiting for security
- ✅ KYC (Know Your Customer) verification
- ✅ Fraud detection system
- ✅ 2FA readiness
- ✅ Transaction logs

## Technology Stack

- **NestJS** - Backend framework
- **TypeORM** - ORM for PostgreSQL
- **PostgreSQL** - Database
- **JWT** - Access tokens
- **bcryptjs** - Password hashing
- **Swagger** - API documentation
- **class-validator** - Data validation

## Setup

### 1. PostgreSQL Database

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb oaa_web_app

# Create user (optional)
sudo -u postgres createuser --interactive
```

### 2. Install dependencies

```bash
cd oaa-web-server
npm install
```

### 3. Configuration

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=oaa_web_app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
PORT=3001
NODE_ENV=development

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### 4. Run

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Seed initial data
npm run seed
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout

### Banking operations

- `POST /banking/accounts` - Create account
- `GET /banking/accounts` - List user accounts
- `GET /banking/accounts/:id` - Account details
- `POST /banking/transfer` - Transfer funds
- `GET /banking/accounts/:id/transactions` - Transaction history

### Administration

- `POST /banking/accounts/:id/approve` - Approve account (Admin/Manager)

## Test Users

After running `npm run seed`, the following users will be created:

1. **Bank Admin**
   - Email: admin@oaabank.com
   - Password: Admin123!

2. **Account Manager**
   - Email: manager@oaabank.com
   - Password: Manager123!

3. **System Auditor**
   - Email: auditor@oaabank.com
   - Password: Auditor123!

4. **Test Client**
   - Email: client@example.com
   - Password: Client123!

## API Documentation

After starting the server, Swagger documentation is available at:
`http://localhost:3001/api/docs`

  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
