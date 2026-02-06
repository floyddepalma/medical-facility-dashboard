# Contributing to Medical Facility Dashboard

Thank you for your interest in contributing! This project follows spec-driven development methodology.

## Development Process

### 1. Review Specifications

Before making changes, review the relevant documentation:

- **Requirements**: `.kiro/specs/medical-facility-dashboard/requirements.md`
- **Design**: `.kiro/specs/medical-facility-dashboard/design.md`
- **Tasks**: `.kiro/specs/medical-facility-dashboard/tasks.md`

### 2. Choose a Task

Open `tasks.md` and select an unchecked task. Tasks are organized bottom-up:
- Data models and database schema
- Backend API endpoints
- Integration with external systems
- Frontend components
- Real-time features
- Testing and optimization

### 3. Write Tests First

Follow the dual testing approach:

#### Unit Tests
```typescript
// Example: packages/backend/src/services/facility-status.test.ts
describe('FacilityStatus', () => {
  it('should calculate room occupancy correctly', () => {
    const rooms = [
      { id: '1', status: 'occupied' },
      { id: '2', status: 'available' },
      { id: '3', status: 'occupied' }
    ];
    
    const occupancy = calculateOccupancy(rooms);
    expect(occupancy).toBe(66.67);
  });
});
```

#### Property Tests
```typescript
// Example: packages/backend/src/services/facility-status.property.test.ts
import fc from 'fast-check';

test('Feature: medical-facility-dashboard, Property 7: Occupancy rate calculation', () => {
  fc.assert(
    fc.property(
      fc.array(roomArbitrary(), { minLength: 1 }),
      (rooms) => {
        const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
        const expectedRate = (occupiedCount / rooms.length) * 100;
        
        const calculatedRate = calculateOccupancyRate(rooms);
        
        expect(calculatedRate).toBeCloseTo(expectedRate, 2);
      }
    ),
    { numRuns: 100 }
  );
});
```

### 4. Implement the Feature

- Follow TypeScript strict mode (no `any` types)
- Use consistent error handling patterns
- Add JSDoc comments for public APIs
- Follow naming conventions in `structure.md`

### 5. Ensure Tests Pass

```bash
# Run all tests
npm test

# Run property tests
npm run test:property

# Check coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

### 6. Update Documentation

- Update task checkboxes in `tasks.md`
- Add API documentation if new endpoints
- Update README if user-facing changes

## Code Style

### TypeScript
- Use strict mode
- Prefer interfaces over types for objects
- Use Zod for runtime validation
- No `any` types

### Naming Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase`
- Functions/Variables: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database tables: `snake_case`

### Error Handling
```typescript
// Consistent error response format
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    retryable: boolean;
    timestamp: Date;
  };
}
```

## Testing Requirements

- Unit test coverage: 80% minimum
- All 30 correctness properties must pass
- Property tests: minimum 100 iterations
- Integration tests for critical workflows
- Tag property tests: `Feature: medical-facility-dashboard, Property {number}: {description}`

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/task-name`
2. Make your changes with tests
3. Ensure all tests pass
4. Update documentation
5. Commit with clear messages
6. Push and create a pull request
7. Reference the task number in PR description

## Commit Message Format

```
feat: Add room status API endpoint

- Implement GET /api/rooms endpoint
- Add room status filtering
- Include unit and property tests
- Validates Requirements 1.1, 1.2

Task: 7.1
```

## Questions?

- Review the design document for architecture decisions
- Check existing code for patterns
- Open an issue for clarification

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Prioritize patient safety and data security
