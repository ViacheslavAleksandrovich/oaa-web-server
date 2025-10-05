# OAA Banking System - Backend

Фінансова система для демонстрації оркестрації процесів аутентифікації та авторизації у WEB додатках.

## Архітектура

### Ролі користувачів:

- **Bank Admin** - повний доступ до системи
- **Account Manager** - управління рахунками клієнтів
- **Client** - банківські операції зі своїми рахунками
- **Auditor** - перегляд аудит-логів та звітів

### Основний функціонал:

- ✅ JWT аутентифікація з refresh токенами
- ✅ Role-Based Access Control (RBAC)
- ✅ Багаторівнева авторизація
- ✅ Аудит всіх дій користувачів
- ✅ Rate limiting для безпеки
- ✅ KYC (Know Your Customer) верифікація
- ✅ Fraud detection система
- ✅ 2FA готовність
- ✅ Транзакційні логи

## Технологічний стек

- **NestJS** - Backend framework
- **TypeORM** - ORM для PostgreSQL
- **PostgreSQL** - База даних
- **JWT** - Токени доступу
- **bcryptjs** - Хешування паролів
- **Swagger** - API документація
- **class-validator** - Валідація даних

## Налаштування

### 1. База даних PostgreSQL

```bash
# Встановити PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Створити базу даних
sudo -u postgres createdb oaa_web_app

# Створити користувача (опціонально)
sudo -u postgres createuser --interactive
```

### 2. Встановлення залежностей

```bash
cd oaa-web-server
npm install
```

### 3. Конфігурація

Створіть файл `.env` з наступними змінними:

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

### 4. Запуск

```bash
# Development режим
npm run start:dev

# Production режим
npm run build
npm run start:prod

# Заповнення початкових даних
npm run seed
```

## API Endpoints

### Аутентифікація

- `POST /auth/register` - Реєстрація користувача
- `POST /auth/login` - Логін користувача
- `POST /auth/refresh` - Оновлення токенів
- `POST /auth/logout` - Вихід з системи

### Банківські операції

- `POST /banking/accounts` - Створення рахунку
- `GET /banking/accounts` - Список рахунків користувача
- `GET /banking/accounts/:id` - Детальна інформація рахунку
- `POST /banking/transfer` - Переказ коштів
- `GET /banking/accounts/:id/transactions` - Історія транзакцій

### Адміністрування

- `POST /banking/accounts/:id/approve` - Затвердження рахунку (Admin/Manager)

## Тестові користувачі

Після виконання `npm run seed` будуть створені:

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

## API Документація

Після запуску сервера, документація Swagger доступна за адресою:
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

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
