# System Logs Viewer Implementation

## Overview
Added a comprehensive audit logs viewer to the security page in the backoffice, allowing administrators to view and track all system actions performed by admin users.

## Changes Made

### 1. Backend Updates

#### `backend/src/domain/repositories/admin.repository.ts`
- Updated `getAuditLogs()` method to return complete audit log information
- Added total count for pagination support
- Included all relevant fields: adminUserId, adminEmail, action, entityType, entityId, oldData, newData, ipAddress, userAgent, createdAt
- Returns structured response: `{ logs: AuditLog[], total: number }`

### 2. Backoffice Updates

#### `backoffice/src/features/security/pages/security-page.tsx`
- Added new "Logs do Sistema" tab alongside "Eventos de Segurança" and "IPs Bloqueados"
- Created `AuditLog` interface with all necessary fields
- Implemented audit logs query with pagination (50 logs per page)
- Added comprehensive logs table displaying:
  - Date/Time
  - Admin user (email or ID)
  - Action performed (with human-readable labels)
  - Entity type and ID
  - IP address
  - View details button
- Implemented pagination controls (Previous/Next buttons with page counter)
- Created detailed log viewer modal showing:
  - Full timestamp
  - Administrator information
  - Action description
  - Entity details
  - IP address and User Agent
  - Old data (JSON formatted)
  - New data (JSON formatted)
- Added `getActionLabel()` helper function to translate action codes to Portuguese labels

## Features

### Audit Log Display
- **Table View**: Clean, organized table with essential information
- **Pagination**: Navigate through logs with 50 records per page
- **Detail Modal**: Click eye icon to view complete log details including JSON data
- **Action Labels**: Human-readable action descriptions in Portuguese

### Tracked Actions
The system tracks various admin actions including:
- Admin login, create, update, delete
- User create, update, delete
- Plan create, update, delete
- Payment approve, reject
- Settings updates
- Content updates
- Security event resolution
- IP blocking/unblocking

### Data Display
- **Admin Identification**: Shows admin email or ID
- **Entity Information**: Displays entity type and ID when applicable
- **IP Tracking**: Shows IP address from which action was performed
- **Data Changes**: JSON formatted old and new data for comparison
- **User Agent**: Browser/client information

## Technical Details

### Database Schema
Uses existing `audit_logs` table with fields:
- `id`: Primary key
- `admin_user_id`: Reference to admin user
- `action`: Action performed
- `entity_type`: Type of entity affected
- `entity_id`: ID of entity affected
- `old_data`: Previous state (JSONB)
- `new_data`: New state (JSONB)
- `ip_address`: IP address
- `user_agent`: Browser/client info
- `created_at`: Timestamp

### API Endpoint
- **Endpoint**: `GET /admin/audit-logs`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Records per page (default: 100, frontend uses 50)
- **Response**: `{ status: "success", data: { logs: AuditLog[], total: number } }`

### UI Components
- Uses existing UI components (Card, Button, etc.)
- Lucide React icons (FileText, User, Eye)
- Dark mode support
- Responsive design
- Modal overlay for detailed view

## Usage

1. Navigate to Security page in backoffice
2. Click "Logs do Sistema" tab
3. View list of all audit logs with pagination
4. Click eye icon on any log to view full details
5. Use pagination controls to navigate through logs

## Benefits

- **Accountability**: Track all admin actions
- **Security**: Monitor suspicious activities
- **Debugging**: Investigate issues by reviewing action history
- **Compliance**: Maintain audit trail for regulatory requirements
- **Transparency**: Clear visibility into system changes

## Future Enhancements (Optional)

- Filter logs by action type
- Filter logs by admin user
- Date range filtering
- Export logs to CSV/PDF
- Search functionality
- Real-time log updates
