# Design Document: Budget Management

## Overview

The budget management system enables users to create spending limits for categories with configurable time periods and multi-threshold alerts. The system tracks expenses in real-time, triggers notifications when spending reaches configured thresholds, and provides visual feedback on budget status across mobile and web platforms.

The design follows a layered architecture with clear separation between data models, business logic, and presentation layers. The system integrates with the existing transaction flow to perform real-time budget calculations and alert checks whenever transactions are created or modified.

### Key Design Principles

1. **Real-time Processing**: Budget calculations and alert checks occur synchronously with transaction creation to ensure immediate feedback
2. **Multi-tenant Isolation**: All budget data is scoped to organizations to ensure proper data isolation
3. **Idempotent Alert Delivery**: Alert triggers are tracked to prevent duplicate notifications within the same budget period
4. **Platform Consistency**: Shared API contracts ensure consistent behavior across mobile and web platforms
5. **Timezone Awareness**: All date/time calculations respect organization timezone settings

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │   Mobile App (RN)    │    │   Web Frontend       │      │
│  │  - Budget UI         │    │  - Budget UI         │      │
│  │  - Alert Config      │    │  - Alert Config      │      │
│  │  - Visualizations    │    │  - Visualizations    │      │
│  └──────────────────────┘    └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Backend)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Budget API Endpoints                     │  │
│  │  - CRUD operations for budgets                        │  │
│  │  - Alert configuration                                │  │
│  │  - Budget status queries                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Budget Service   │  │ Alert Service    │               │
│  │ - Calculations   │  │ - Threshold      │               │
│  │ - Validation     │  │   checks         │               │
│  │ - Period mgmt    │  │ - Notification   │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Transaction Integration Hook                  │  │
│  │  - Triggered on transaction create/update             │  │
│  │  - Calculates budget impact                           │  │
│  │  - Checks alert thresholds                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (PostgreSQL)                    │  │
│  │  - budgets table                                      │  │
│  │  - budget_alerts table                                │  │
│  │  - alert_triggers table (deduplication)               │  │
│  │  - budget_history table (archiving)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Notification Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   In-App     │  │    Email     │  │     SMS      │     │
│  │ Notification │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Budget Creation Flow**:
   - User creates budget via mobile/web UI
   - API validates input and creates budget record
   - Alert configurations are stored with the budget
   - Budget becomes active and ready for tracking

2. **Transaction Processing Flow**:
   - User creates/updates transaction
   - Transaction service triggers budget calculation hook
   - Budget service identifies active budgets for the transaction's category
   - For each active budget:
     - Calculate current spending in budget period
     - Check if any alert thresholds are crossed
     - If threshold crossed and not previously triggered:
       - Mark alert as triggered
       - Send notifications via enabled channels

3. **Budget Query Flow**:
   - User requests budget list/detail
   - API retrieves budget records
   - Budget service calculates current spending
   - Response includes budget data with calculated metrics

## Components and Interfaces

### Backend Components

#### Budget Service

Responsible for budget lifecycle management and spending calculations.

```typescript
interface BudgetService {
  // Budget CRUD operations
  createBudget(data: CreateBudgetDTO): Promise<Budget>
  updateBudget(id: string, data: UpdateBudgetDTO): Promise<Budget>
  deleteBudget(id: string): Promise<void>
  getBudget(id: string): Promise<BudgetWithStatus>
  listBudgets(organizationId: string, filters?: BudgetFilters): Promise<BudgetWithStatus[]>
  
  // Budget calculations
  calculateSpending(budgetId: string): Promise<SpendingCalculation>
  getBudgetPeriodDates(budget: Budget, referenceDate: Date): Promise<PeriodDates>
  
  // Budget period management
  archiveBudgetPeriod(budgetId: string): Promise<void>
  createNextPeriod(budgetId: string): Promise<Budget>
}

interface SpendingCalculation {
  totalSpent: number
  budgetAmount: number
  percentageUsed: number
  remainingAmount: number
  exceededAmount: number
  isExceeded: boolean
}

interface PeriodDates {
  startDate: Date
  endDate: Date
}
```

#### Alert Service

Manages alert configuration and threshold checking.

```typescript
interface AlertService {
  // Alert configuration
  configureAlerts(budgetId: string, alerts: AlertConfig[]): Promise<void>
  updateAlert(alertId: string, data: UpdateAlertDTO): Promise<Alert>
  deleteAlert(alertId: string): Promise<void>
  
  // Alert checking and triggering
  checkAlerts(budgetId: string, currentSpending: number): Promise<TriggeredAlert[]>
  triggerAlert(alert: Alert, spending: SpendingCalculation): Promise<void>
  markAlertTriggered(alertId: string, budgetPeriodId: string): Promise<void>
  
  // Alert state management
  resetAlertTriggers(budgetId: string): Promise<void>
  hasAlertBeenTriggered(alertId: string, budgetPeriodId: string): Promise<boolean>
}

interface TriggeredAlert {
  alert: Alert
  thresholdAmount: number
  currentSpending: number
}
```

#### Notification Service

Handles multi-channel notification delivery.

```typescript
interface NotificationService {
  sendBudgetAlert(
    userId: string,
    alert: Alert,
    budget: Budget,
    spending: SpendingCalculation
  ): Promise<void>
  
  sendInAppNotification(userId: string, notification: NotificationPayload): Promise<void>
  sendEmailNotification(email: string, notification: NotificationPayload): Promise<void>
  sendSMSNotification(phone: string, notification: NotificationPayload): Promise<void>
}

interface NotificationPayload {
  title: string
  message: string
  data: {
    categoryName: string
    currentSpending: number
    budgetLimit: number
    percentageUsed: number
    remainingAmount?: number
    exceededAmount?: number
  }
}
```

#### Transaction Integration Hook

Integrates budget tracking into transaction flow.

```typescript
interface TransactionBudgetHook {
  // Called after transaction create/update
  onTransactionChange(transaction: Transaction): Promise<void>
  
  // Internal methods
  findAffectedBudgets(transaction: Transaction): Promise<Budget[]>
  processAffectedBudgets(budgets: Budget[], transaction: Transaction): Promise<void>
}
```

### Frontend Components

#### Mobile App (React Native)

```typescript
// Budget List Screen
interface BudgetListScreen {
  // Displays all budgets with status
  // Shows progress bars and visual indicators
  // Allows navigation to budget detail
}

// Budget Detail Screen
interface BudgetDetailScreen {
  // Shows detailed budget information
  // Displays spending visualization
  // Shows alert configurations
  // Allows editing budget and alerts
}

// Budget Form Screen
interface BudgetFormScreen {
  // Create/edit budget form
  // Category selection
  // Time period configuration
  // Amount input
  // Status toggle
}

// Alert Configuration Screen
interface AlertConfigScreen {
  // Configure up to 3 alerts
  // Set threshold (amount or percentage)
  // Select notification channels
  // Enable/disable channels
}
```

#### Web Frontend (React)

Similar component structure to mobile with responsive design adaptations.

## Data Models

### Budget

```typescript
interface Budget {
  id: string
  organizationId: string
  categoryId: string
  amount: number
  currency: string
  timePeriod: TimePeriodType
  customStartDate?: Date
  customEndDate?: Date
  status: BudgetStatus
  createdAt: Date
  updatedAt: Date
}

enum TimePeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  CUSTOM = 'custom'
}

enum BudgetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
```

### Alert

```typescript
interface Alert {
  id: string
  budgetId: string
  thresholdType: ThresholdType
  thresholdValue: number
  position: AlertPosition
  channels: AlertChannel[]
  createdAt: Date
  updatedAt: Date
}

enum ThresholdType {
  FIXED_AMOUNT = 'fixed_amount',
  PERCENTAGE = 'percentage'
}

enum AlertPosition {
  BEFORE_LIMIT = 'before_limit',
  AFTER_LIMIT = 'after_limit'
}

interface AlertChannel {
  type: ChannelType
  enabled: boolean
}

enum ChannelType {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms'
}
```

### Alert Trigger (Deduplication)

```typescript
interface AlertTrigger {
  id: string
  alertId: string
  budgetPeriodId: string
  triggeredAt: Date
  spendingAmount: number
}
```

### Budget History

```typescript
interface BudgetHistory {
  id: string
  budgetId: string
  periodStartDate: Date
  periodEndDate: Date
  finalSpendingAmount: number
  percentageUsed: number
  alertsTriggered: string[] // Array of alert IDs
  createdAt: Date
}
```

### DTOs

```typescript
interface CreateBudgetDTO {
  categoryId: string
  amount: number
  timePeriod: TimePeriodType
  customStartDate?: Date
  customEndDate?: Date
  status?: BudgetStatus
  alerts?: AlertConfig[]
}

interface UpdateBudgetDTO {
  amount?: number
  timePeriod?: TimePeriodType
  customStartDate?: Date
  customEndDate?: Date
  status?: BudgetStatus
}

interface AlertConfig {
  thresholdType: ThresholdType
  thresholdValue: number
  position: AlertPosition
  channels: AlertChannel[]
}

interface BudgetWithStatus extends Budget {
  currentSpending: number
  percentageUsed: number
  remainingAmount: number
  exceededAmount: number
  isExceeded: boolean
  alerts: Alert[]
}
```

## Database Schema

```sql
-- Budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  time_period VARCHAR(20) NOT NULL,
  custom_start_date TIMESTAMP WITH TIME ZONE,
  custom_end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_period CHECK (time_period IN ('daily', 'weekly', 'monthly', 'annual', 'custom')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT valid_custom_dates CHECK (
    (time_period = 'custom' AND custom_start_date IS NOT NULL AND custom_end_date IS NOT NULL)
    OR (time_period != 'custom' AND custom_start_date IS NULL AND custom_end_date IS NULL)
  ),
  CONSTRAINT end_after_start CHECK (custom_end_date IS NULL OR custom_end_date > custom_start_date)
);

CREATE INDEX idx_budgets_org_category ON budgets(organization_id, category_id);
CREATE INDEX idx_budgets_status ON budgets(status);

-- Budget alerts table
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  threshold_type VARCHAR(20) NOT NULL,
  threshold_value DECIMAL(15, 2) NOT NULL,
  position VARCHAR(20) NOT NULL,
  channels JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_threshold_type CHECK (threshold_type IN ('fixed_amount', 'percentage')),
  CONSTRAINT valid_position CHECK (position IN ('before_limit', 'after_limit')),
  CONSTRAINT valid_threshold_value CHECK (threshold_value > 0)
);

CREATE INDEX idx_budget_alerts_budget ON budget_alerts(budget_id);

-- Alert triggers table (for deduplication)
CREATE TABLE alert_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES budget_alerts(id) ON DELETE CASCADE,
  budget_period_id VARCHAR(100) NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  spending_amount DECIMAL(15, 2) NOT NULL,
  UNIQUE(alert_id, budget_period_id)
);

CREATE INDEX idx_alert_triggers_alert_period ON alert_triggers(alert_id, budget_period_id);

-- Budget history table
CREATE TABLE budget_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id),
  period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  final_spending_amount DECIMAL(15, 2) NOT NULL,
  percentage_used DECIMAL(5, 2) NOT NULL,
  alerts_triggered JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_history_budget ON budget_history(budget_id);
CREATE INDEX idx_budget_history_dates ON budget_history(period_start_date, period_end_date);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I've identified several areas where properties can be consolidated to avoid redundancy:

1. **Alert validation properties (2.4-2.7)** can be combined into comprehensive validation properties that cover all threshold types and positions
2. **Calculation properties (3.5-3.7)** are all testing mathematical formulas and can be verified together
3. **Multi-tenant filtering properties (3.4, 5.1, 10.6)** all test organization isolation and can be consolidated
4. **Platform availability properties (7.1-7.4, 10.1-10.4)** are examples of API endpoint existence rather than universal properties
5. **Display properties (5.2-5.6)** test similar rendering concerns and can be grouped

The following properties represent the unique, non-redundant correctness guarantees:

### Budget Creation and Validation Properties

**Property 1: Required fields validation**
*For any* budget creation request, if it is missing category, time period, or budget amount, then the system should reject the request with a validation error.
**Validates: Requirements 1.1**

**Property 2: Time period enum validation**
*For any* budget creation request with a time period value, the system should accept it if and only if it is one of: daily, weekly, monthly, annual, or custom.
**Validates: Requirements 1.2**

**Property 3: Custom date range validation**
*For any* budget with custom time period, if the end date is not after the start date, then the system should reject the budget with a validation error.
**Validates: Requirements 1.3**

**Property 4: Default status assignment**
*For any* budget creation request without an explicit status, the created budget should have status set to 'active'.
**Validates: Requirements 1.4**

**Property 5: Status toggle persistence**
*For any* budget, toggling its status from active to inactive and then retrieving it should return the budget with inactive status, and vice versa.
**Validates: Requirements 1.5**

**Property 6: Organization association invariant**
*For any* budget created by a user, the budget's organization ID should equal the user's organization ID.
**Validates: Requirements 1.6**

**Property 7: Currency inheritance invariant**
*For any* budget created in an organization, the budget's currency should equal the organization's configured currency.
**Validates: Requirements 1.7**

### Alert Configuration Properties

**Property 8: Alert count constraint**
*For any* budget, attempting to add more than 3 alerts should be rejected with a validation error.
**Validates: Requirements 2.1**

**Property 9: Alert position distribution constraint**
*For any* set of alerts for a budget, if the count of before-limit alerts is not exactly 2 or the count of after-limit alerts is not exactly 1 (when all 3 alerts are configured), then the system should reject the configuration.
**Validates: Requirements 2.2**

**Property 10: Alert threshold type acceptance**
*For any* alert configuration, the system should accept threshold type if and only if it is 'fixed_amount' or 'percentage'.
**Validates: Requirements 2.3**

**Property 11: Alert threshold validation**
*For any* alert configuration:
- If position is before-limit and threshold type is percentage, then threshold value must be between 0 and 100
- If position is after-limit and threshold type is percentage, then threshold value must be greater than 100
- If position is before-limit and threshold type is fixed_amount, then threshold value must be less than budget amount
- If position is after-limit and threshold type is fixed_amount, then threshold value must be greater than budget amount
**Validates: Requirements 2.4, 2.5, 2.6, 2.7**

**Property 12: Alert channel configuration**
*For any* alert, any combination of channels (in-app, email, SMS) should be accepted, and each channel should have an independent enabled/disabled state.
**Validates: Requirements 2.8, 2.9**

### Budget Calculation Properties

**Property 13: Spending calculation triggers on transaction**
*For any* transaction created in a category with an active budget, the system should calculate the current spending for that budget.
**Validates: Requirements 3.1**

**Property 14: Spending calculation filters**
*For any* budget spending calculation, the calculated amount should equal the sum of all transactions where:
- Transaction category matches budget category
- Transaction date is within budget period
- Transaction organization matches budget organization
**Validates: Requirements 3.2, 3.3, 3.4**

**Property 15: Budget metrics calculation correctness**
*For any* budget with spending amount S and budget amount B:
- Percentage used = (S / B) × 100
- Remaining amount = B - S (when S ≤ B)
- Exceeded amount = S - B (when S > B)
**Validates: Requirements 3.5, 3.6, 3.7**

### Alert Triggering Properties

**Property 16: Alert triggering on threshold crossing**
*For any* transaction that causes spending to reach or exceed an alert's threshold (that hasn't been triggered in the current period), the system should trigger that alert.
**Validates: Requirements 4.1**

**Property 17: Multi-channel notification delivery**
*For any* triggered alert, notifications should be sent through all channels where enabled is true.
**Validates: Requirements 4.2**

**Property 18: Notification payload completeness**
*For any* budget alert notification, the payload should contain: category name, current spending amount, budget limit, percentage used, and either remaining amount (if not exceeded) or exceeded amount (if exceeded).
**Validates: Requirements 4.3**

**Property 19: Alert idempotence within period**
*For any* alert in a budget period, if it has already been triggered, then subsequent transactions that would trigger it should not send additional notifications until the period resets.
**Validates: Requirements 4.4**

**Property 20: Multiple alert triggering**
*For any* transaction that crosses multiple alert thresholds simultaneously, all corresponding alerts should be triggered and notifications sent.
**Validates: Requirements 4.5**

**Property 21: In-app notification multi-platform delivery**
*For any* alert with in-app channel enabled, the notification should be delivered to both mobile and web platforms.
**Validates: Requirements 4.6**

**Property 22: Alert trigger reset on period boundary**
*For any* budget, when a new period begins, all alert triggers from the previous period should be cleared, allowing alerts to trigger again.
**Validates: Requirements 4.7**

### Budget Display and Filtering Properties

**Property 23: Organization-scoped budget listing**
*For any* user requesting their budget list, all returned budgets should have organization ID matching the user's organization ID, and no budgets from other organizations should be included.
**Validates: Requirements 5.1, 10.6**

**Property 24: Budget display completeness**
*For any* budget display response, it should include: category name, budget amount, time period, status, current spending amount, and percentage used.
**Validates: Requirements 5.2, 5.3**

**Property 25: Progress indicator accuracy**
*For any* budget display with a progress indicator, the indicator value should equal the percentage used calculation.
**Validates: Requirements 5.4**

**Property 26: Visual state differentiation**
*For any* budget display:
- If spending exceeds budget amount, it should have exceeded visual state
- If status is inactive, it should have inactive visual state
- Otherwise, it should have normal visual state
**Validates: Requirements 5.5, 5.6**

### Budget Editing Properties

**Property 27: Budget field editability**
*For any* existing budget, updates to amount, time period, and status should be accepted and persisted.
**Validates: Requirements 6.1**

**Property 28: Alert configuration editability**
*For any* existing budget, updates to its alert configurations should be accepted and persisted.
**Validates: Requirements 6.2**

**Property 29: Percentage alert recalculation on amount change**
*For any* budget with percentage-based alerts, if the budget amount changes from A1 to A2, then the threshold amounts should be recalculated as (threshold_percentage / 100) × A2.
**Validates: Requirements 6.3**

**Property 30: Spending recalculation on period change**
*For any* budget, if the time period changes, then the spending amount should be recalculated using only transactions within the new period boundaries.
**Validates: Requirements 6.4**

**Property 31: Cascade deletion of budget data**
*For any* budget without historical data, deleting it should also remove all associated alerts and alert triggers.
**Validates: Requirements 6.5**

**Property 32: Archive instead of delete for historical budgets**
*For any* budget with archived history records, attempting to delete it should archive the budget instead of removing it.
**Validates: Requirements 6.6**

### Platform Consistency Properties

**Property 33: Cross-platform data consistency**
*For any* budget created or modified through any platform (mobile or web), retrieving that budget from any other platform should return the same data.
**Validates: Requirements 7.5**

### Timezone and Currency Properties

**Property 34: Organization timezone usage**
*For any* budget period calculation, the period boundaries should be calculated using the organization's configured timezone.
**Validates: Requirements 8.1**

**Property 35: Daily period boundaries**
*For any* budget with daily time period, the period start should be at 00:00:00 and period end should be at 23:59:59 in the organization's timezone.
**Validates: Requirements 8.2**

**Property 36: Weekly period boundaries**
*For any* budget with weekly time period, the period should start on the organization's configured week start day.
**Validates: Requirements 8.3**

**Property 37: Monthly period boundaries**
*For any* budget with monthly time period, the period should start on the first day of the month at 00:00:00 and end on the last day of the month at 23:59:59 in the organization's timezone.
**Validates: Requirements 8.4**

**Property 38: Currency storage consistency**
*For any* budget, the stored currency should match the organization's configured currency.
**Validates: Requirements 8.5**

**Property 39: Currency formatting consistency**
*For any* budget amount display, the formatting should use the organization's currency code and locale settings.
**Validates: Requirements 8.6**

### Budget History Properties

**Property 40: Period end archiving**
*For any* budget period that ends, an archive record should be created with the final spending amount, percentage used, and list of triggered alert IDs.
**Validates: Requirements 9.1, 9.2**

**Property 41: Archive retrieval**
*For any* archived budget period, users from the same organization should be able to retrieve the archive record.
**Validates: Requirements 9.3**

**Property 42: Recurring budget rollover**
*For any* budget with a recurring time period (daily, weekly, monthly, annual), when the period ends, a new budget period should be automatically created with the same configuration.
**Validates: Requirements 9.4**

### API and Integration Properties

**Property 43: Synchronous transaction processing**
*For any* transaction created via API, budget calculations and alert checks should complete before the API response is returned.
**Validates: Requirements 10.5**

**Property 44: API input validation**
*For any* API request with data that violates business rules, the system should reject the request with a validation error before processing.
**Validates: Requirements 10.7**

## Error Handling

### Validation Errors

The system should provide clear, actionable error messages for all validation failures:

1. **Missing Required Fields**: "Budget creation requires category, time period, and amount"
2. **Invalid Time Period**: "Time period must be one of: daily, weekly, monthly, annual, custom"
3. **Invalid Date Range**: "Custom budget end date must be after start date"
4. **Alert Count Exceeded**: "Maximum 3 alerts allowed per budget"
5. **Invalid Alert Distribution**: "Budget must have exactly 2 before-limit alerts and 1 after-limit alert when fully configured"
6. **Invalid Threshold**: "Before-limit percentage alerts must be between 0-100%; after-limit must be >100%"
7. **Invalid Fixed Amount**: "Before-limit fixed alerts must be less than budget amount; after-limit must be greater"

### System Errors

1. **Database Errors**: Wrap database exceptions and return generic error messages to clients while logging details
2. **Notification Failures**: Log notification delivery failures but don't block transaction processing
3. **Calculation Errors**: Handle edge cases like division by zero in percentage calculations
4. **Timezone Errors**: Validate organization timezone configuration and fall back to UTC if invalid

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
}
```

## Testing Strategy

### Dual Testing Approach

The budget management system requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs using randomized test data

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

We will use **fast-check** (for TypeScript/JavaScript) as our property-based testing library. Each property test will:

- Run a minimum of 100 iterations with randomized inputs
- Include a comment tag referencing the design document property
- Tag format: `// Feature: budget-management, Property {number}: {property_text}`

Example property test structure:

```typescript
// Feature: budget-management, Property 1: Required fields validation
test('budget creation requires all mandatory fields', () => {
  fc.assert(
    fc.property(
      fc.record({
        categoryId: fc.option(fc.uuid(), { nil: undefined }),
        amount: fc.option(fc.double({ min: 0 }), { nil: undefined }),
        timePeriod: fc.option(fc.constantFrom('daily', 'weekly', 'monthly'), { nil: undefined })
      }),
      (budgetData) => {
        const hasAllFields = budgetData.categoryId && budgetData.amount && budgetData.timePeriod
        const result = validateBudgetCreation(budgetData)
        
        if (hasAllFields) {
          expect(result.isValid).toBe(true)
        } else {
          expect(result.isValid).toBe(false)
          expect(result.error).toContain('requires category, time period, and amount')
        }
      }
    ),
    { numRuns: 100 }
  )
})
```

### Unit Testing Focus Areas

Unit tests should focus on:

1. **Specific Examples**: Concrete scenarios that demonstrate correct behavior
   - Creating a monthly budget with 80% and 100% alerts
   - Transaction triggering multiple alerts simultaneously
   - Budget period rollover at month boundary

2. **Edge Cases**: Boundary conditions and special cases
   - Budget with zero amount
   - Transaction exactly at threshold
   - Period boundary at daylight saving time transition
   - Empty transaction list for spending calculation

3. **Error Conditions**: Specific error scenarios
   - Creating budget with negative amount
   - Configuring 4 alerts (exceeds limit)
   - Alert threshold at 150% for before-limit position
   - Accessing budget from different organization

4. **Integration Points**: Component interactions
   - Transaction creation triggering budget hook
   - Alert service calling notification service
   - Budget service querying transaction data

### Test Organization

```
backend/
  src/
    budget/
      __tests__/
        unit/
          budget.service.test.ts
          alert.service.test.ts
          notification.service.test.ts
          transaction-hook.test.ts
        property/
          budget-validation.property.test.ts
          alert-validation.property.test.ts
          spending-calculation.property.test.ts
          alert-triggering.property.test.ts
          timezone-handling.property.test.ts

mobile/
  src/
    features/
      budget/
        __tests__/
          BudgetList.test.tsx
          BudgetForm.test.tsx
          AlertConfig.test.tsx

frontend/
  src/
    features/
      budget/
        __tests__/
          BudgetList.test.tsx
          BudgetForm.test.tsx
          AlertConfig.test.tsx
```

### Testing Requirements Summary

1. Each correctness property MUST be implemented by a SINGLE property-based test
2. Property tests MUST run minimum 100 iterations
3. Property tests MUST include comment tags referencing design properties
4. Unit tests MUST cover specific examples, edge cases, and error conditions
5. Integration tests MUST verify component interactions
6. All tests MUST enforce organization-based isolation
7. All tests MUST handle timezone-aware date calculations

### Test Data Generators

For property-based tests, we need generators for:

- **Budget**: Random budgets with valid configurations
- **Alert**: Random alerts with various threshold types and positions
- **Transaction**: Random transactions with categories and amounts
- **Organization**: Random organizations with timezones and currencies
- **Date Ranges**: Random date ranges respecting timezone boundaries

Example generator:

```typescript
const budgetArbitrary = fc.record({
  organizationId: fc.uuid(),
  categoryId: fc.uuid(),
  amount: fc.double({ min: 1, max: 1000000 }),
  currency: fc.constantFrom('USD', 'EUR', 'GBP', 'AOA'),
  timePeriod: fc.constantFrom('daily', 'weekly', 'monthly', 'annual'),
  status: fc.constantFrom('active', 'inactive')
})
```
