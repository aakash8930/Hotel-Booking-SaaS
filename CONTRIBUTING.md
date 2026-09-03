# Hotel Booking SaaS — Contributing Guide

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/Hotel-Booking-SaaS.git
cd Hotel-Booking-SaaS

# Add upstream remote
git remote add upstream https://github.com/aakash8930/Hotel-Booking-SaaS.git
```

### 2. Create a Feature Branch

```bash
# Always branch from main
git checkout main
git pull upstream main

# Create your feature branch
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**

- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Adding tests

### 3. Make Your Changes

Follow the coding standards:

- **TypeScript:** Use strict mode, avoid `any`, prefer interfaces over types
- **React:** Use functional components with hooks
- **NestJS:** Follow the module/service/controller pattern
- **Prisma:** Always create migrations for schema changes
- **Go:** Follow standard Go formatting (`gofmt`)

### 4. Test Your Changes

```bash
# Run tests
make test

# Run linter
make lint

# Build everything
make build
```

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
# Good
git commit -m "feat: add room availability calendar component"
git commit -m "fix: prevent double-booking race condition"
git commit -m "docs: update API endpoint documentation"

# Bad
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

**Commit message format:**

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Formatting, no code change
- `refactor` — Code refactoring
- `test` — Adding tests
- `chore` — Maintenance tasks

### 6. Push and Create a Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

**Pull Request Guidelines:**

- Use a clear, descriptive title
- Explain what you changed and why
- Include screenshots for UI changes
- Link related issues
- Request review from maintainers

### 7. Address Review Feedback

- Respond to comments promptly
- Make requested changes
- Re-request review after updates

## Code Standards

### TypeScript / JavaScript

```typescript
// ✅ Good
interface Booking {
  id: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
}

// ❌ Bad
type Booking = any;
```

### React Components

```typescript
// ✅ Good — Functional component with hooks
export function BookingCard({ booking }: BookingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="card">
      {/* ... */}
    </div>
  );
}

// ❌ Bad — Class component (avoid unless necessary)
export class BookingCard extends Component {
  // ...
}
```

### NestJS Services

```typescript
// ✅ Good — Dependency injection, clear separation
@Injectable()
export class BookingService {
  constructor(
    @InjectPrisma() private prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    // Business logic here
  }
}
```

### Database Schema

```prisma
// ✅ Good — Clear naming, proper constraints
model Booking {
  id        String   @id @default(uuid()) @db.Uuid
  roomId    String   @map("room_id") @db.Uuid
  checkIn   DateTime @map("check_in") @db.Date
  checkOut  DateTime @map("check_out") @db.Date
  
  room Room @relation(fields: [roomId], references: [id])
  
  @@map("bookings")
}
```

## Testing

### Unit Tests

Write tests for:

- Business logic in services
- Utility functions
- Data transformations

```typescript
describe('BookingService', () => {
  it('should prevent overlapping bookings', async () => {
    // Arrange
    const room = await createTestRoom();
    await createBooking(room.id, '2026-10-15', '2026-10-18');

    // Act & Assert
    await expect(
      createBooking(room.id, '2026-10-16', '2026-10-19')
    ).rejects.toThrow();
  });
});
```

### Integration Tests

Test:

- API endpoints
- Database interactions
- External service integrations

### E2E Tests

Test:

- Complete user flows
- Critical business paths

## Documentation

Update documentation when:

- Adding new features
- Changing APIs
- Modifying database schema
- Updating dependencies

**Documentation locations:**

- `README.md` — Project overview
- `SETUP.md` — Setup guide
- `docs/` — Detailed documentation
- Code comments — Inline explanations

## Getting Help

- **Questions:** Open a [Discussion](https://github.com/aakash8930/Hotel-Booking-SaaS/discussions)
- **Bugs:** Open an [Issue](https://github.com/aakash8930/Hotel-Booking-SaaS/issues)
- **Security:** Email security@example.com (don't open public issues)

## Recognition

Contributors will be added to the `CONTRIBUTORS.md` file after their first merged PR.

Thank you for contributing! 🎉
