# Budget Service

The budget service provides API client methods for interacting with the budget management backend.

## Usage

### Import the service

```typescript
import budgetService, { 
  TimePeriodType, 
  BudgetStatus, 
  ThresholdType, 
  AlertPosition, 
  ChannelType 
} from './services/budget.service';
```

### Create a budget

```typescript
const newBudget = await budgetService.createBudget({
  categoryId: 1,
  amount: 1000,
  timePeriod: TimePeriodType.MONTHLY,
  status: BudgetStatus.ACTIVE,
  alerts: [
    {
      thresholdType: ThresholdType.PERCENTAGE,
      thresholdValue: 80,
      position: AlertPosition.BEFORE_LIMIT,
      channels: [
        { type: ChannelType.IN_APP, enabled: true },
        { type: ChannelType.EMAIL, enabled: true },
      ],
    },
  ],
});
```

### List budgets

```typescript
// Get all budgets
const budgets = await budgetService.listBudgets();

// Get budgets with filters
const activeBudgets = await budgetService.listBudgets({
  status: BudgetStatus.ACTIVE,
});
```

### Get budget details

```typescript
const budget = await budgetService.getBudget(budgetId);
console.log(`Spent: ${budget.currentSpending} / ${budget.amount}`);
console.log(`Percentage used: ${budget.percentageUsed}%`);
```

### Update a budget

```typescript
const updatedBudget = await budgetService.updateBudget(budgetId, {
  amount: 1500,
  status: BudgetStatus.INACTIVE,
});
```

### Delete a budget

```typescript
await budgetService.deleteBudget(budgetId);
```

### Configure alerts

```typescript
await budgetService.configureAlerts(budgetId, [
  {
    thresholdType: ThresholdType.PERCENTAGE,
    thresholdValue: 50,
    position: AlertPosition.BEFORE_LIMIT,
    channels: [
      { type: ChannelType.IN_APP, enabled: true },
    ],
  },
  {
    thresholdType: ThresholdType.PERCENTAGE,
    thresholdValue: 100,
    position: AlertPosition.BEFORE_LIMIT,
    channels: [
      { type: ChannelType.IN_APP, enabled: true },
      { type: ChannelType.EMAIL, enabled: true },
    ],
  },
  {
    thresholdType: ThresholdType.PERCENTAGE,
    thresholdValue: 110,
    position: AlertPosition.AFTER_LIMIT,
    channels: [
      { type: ChannelType.IN_APP, enabled: true },
      { type: ChannelType.EMAIL, enabled: true },
      { type: ChannelType.SMS, enabled: true },
    ],
  },
]);
```

### Get budget status

```typescript
const status = await budgetService.getBudgetStatus(budgetId);
if (status.isExceeded) {
  console.log(`Budget exceeded by ${status.exceededAmount}`);
} else {
  console.log(`Remaining: ${status.remainingAmount}`);
}
```

### Get archived periods

```typescript
const history = await budgetService.getArchivedPeriods(budgetId);
history.forEach(period => {
  console.log(`Period: ${period.periodStartDate} - ${period.periodEndDate}`);
  console.log(`Final spending: ${period.finalSpendingAmount}`);
  console.log(`Percentage used: ${period.percentageUsed}%`);
});
```

## Authentication and Organization Context

The budget service automatically handles:
- **Authentication**: Auth tokens are added to requests via the base API client
- **Organization Context**: The user's organization is automatically included in requests

All API calls are scoped to the authenticated user's organization, ensuring proper multi-tenant isolation.

## Error Handling

The service uses the base API client which handles:
- 401 Unauthorized responses (clears auth data)
- Network errors
- Timeout errors

You should wrap service calls in try-catch blocks:

```typescript
try {
  const budget = await budgetService.getBudget(budgetId);
  // Handle success
} catch (error) {
  // Handle error
  console.error('Failed to fetch budget:', error);
}
```

## Type Definitions

All types are exported from the service:

- `Budget` - Budget entity
- `BudgetWithStatus` - Budget with current spending information
- `Alert` - Alert entity
- `BudgetHistory` - Archived budget period
- `CreateBudgetDTO` - Data for creating a budget
- `UpdateBudgetDTO` - Data for updating a budget
- `UpdateAlertDTO` - Data for updating an alert
- `AlertConfig` - Alert configuration
- `AlertChannel` - Alert channel configuration
- `BudgetFilters` - Filters for listing budgets

### Enums

- `TimePeriodType` - DAILY, WEEKLY, MONTHLY, ANNUAL, CUSTOM
- `BudgetStatus` - ACTIVE, INACTIVE, ARCHIVED
- `ThresholdType` - FIXED_AMOUNT, PERCENTAGE
- `AlertPosition` - BEFORE_LIMIT, AFTER_LIMIT
- `ChannelType` - IN_APP, EMAIL, SMS
