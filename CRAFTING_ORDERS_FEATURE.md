# Crafting Orders Feature Documentation

## Overview

The Crafting Orders system allows users to create, claim, and manage crafting requests within the settlement. This feature replaces the Reports & Analytics section on the dashboard and provides a comprehensive order management workflow.

## Features

### 🎯 **Dashboard Integration**

- **Replaced**: "Reports & Analytics" button with "Crafting Orders"
- **Order Counts**: Shows real-time counts of Unassigned and Assigned orders
- **Quick Navigation**: Direct link to the crafting orders page

### 📋 **Order Management Table**

The main table displays orders with the following columns:

- **Order Date**: When the order was created
- **Sector**: Settlement sector (optional)
- **Item**: Item name with icon and tier (e.g., "Sturdy Wood Plank (T3)")
- **Quantity**: Number of items requested (1-1000 limit)
- **Placed By**: User who created the order
- **Claimed By**: User who claimed the order (or "Claim Order" button if unassigned)
- **Status**: Unassigned (red) / Assigned (yellow) / Completed (green)
- **Actions**: "Complete Order" button for eligible users

### ⚡ **Order States & Workflow**

1. **Unassigned** → User creates order → Shows "Claim Order" button
2. **Assigned** → Another user claims → Shows claimer's name + "Complete Order" button
3. **Completed** → Order owner or claimer marks complete → Moves to completed table

### 🆕 **New Order Creation**

- **Modal Form** with item search and selection
- **Item Search**: Real-time API search from `https://bitjita.com/api/items`
- **Dropdown Format**: `<icon> Item Name (Tier)`
- **Quantity Input**: 1-1000 range with validation
- **Auto-population**: Fetches item details (name, icon, tier) from API

### 👥 **Permission System**

- **View Orders**: Requires `orders.read` permission
- **Create Orders**: Any authenticated user
- **Claim Orders**: Any authenticated user
- **Complete Orders**: Only order owner OR user who claimed the order

### 🔄 **Toggle Views**

- **Default View**: Active orders (Unassigned + Assigned)
- **Completed View**: Toggle to show completed orders
- **Completed Info**: Shows who completed the order, or the claimer if completed by owner

## Database Schema

### Table: `crafting_orders`

```sql
- id (UUID, Primary Key)
- created_at (Timestamp)
- updated_at (Timestamp)
- item_id (Text) - Bitjita API item ID
- item_name (Text) - Display name
- item_icon (Text, Nullable) - Icon URL
- item_tier (Text, Nullable) - Tier info (T1, T2, etc.)
- quantity (Integer, 1-1000)
- sector (Text, Nullable)
- status (Enum: unassigned, assigned, completed)
- placed_by (UUID, FK to auth.users)
- claimed_by (UUID, FK to auth.users, Nullable)
- completed_at (Timestamp, Nullable)
- completed_by (UUID, FK to auth.users, Nullable)
```

### Database Functions

- `get_crafting_order_counts()`: Returns counts by status for dashboard
- Automatic `updated_at` trigger
- Row Level Security (RLS) policies

## API Integration

### Bitjita Items API

- **Endpoint**: `https://bitjita.com/api/items`
- **Usage**: Fetch item details for order creation
- **Search**: Client-side filtering on item names
- **Performance**: Limited to 50 results, 300ms debounce

## File Structure

```
src/
├── views/
│   ├── CraftingOrders.tsx          # Main orders page
│   └── Dashboard.tsx               # Updated with order counts
├── hooks/
│   └── useCraftingOrderCounts.ts   # Dashboard counts hook
├── supabase/
│   └── supabase.ts                 # Updated types
└── router/
    └── router.tsx                  # Added /crafting-orders route
```

## Setup Instructions

### 1. Database Setup

```bash
# Run the SQL schema in your Supabase SQL editor
psql> \i crafting_orders_schema.sql
```

### 2. Permissions Setup

Ensure your role system includes:

- `orders.read` permission for viewing orders
- Assign to appropriate roles (users, admins, etc.)

### 3. API Access

- No authentication required for Bitjita API
- Handle API errors gracefully
- Implement rate limiting if needed

## Usage Examples

### Creating an Order

1. Click "New Crafting Order" button
2. Search for item: "wood plank"
3. Select "Sturdy Wood Plank (T3)" from dropdown
4. Enter quantity: 50
5. Click "Create Order"

### Claiming an Order

1. Find unassigned order in table
2. Click "Claim Order" button in "Claimed By" column
3. Order status changes to "Assigned"
4. "Complete Order" button becomes available

### Completing an Order

1. Owner or claimer clicks "Complete Order"
2. Confirm in modal dialog
3. Order moves to completed status
4. Shows in completed orders table when toggled

## Security Features

### Client-Side Validation

- Form validation for quantity limits
- Permission gates for UI elements
- User role checks for actions

### Server-Side Security

- RLS policies restrict data access
- Foreign key constraints
- Status validation checks
- User relationship validation

## Performance Considerations

### Optimizations

- Indexed database queries
- Debounced API searches
- Limited result sets
- Cached order counts
- Efficient state management

### Monitoring

- API call tracking
- Database query performance
- User action logging
- Error rate monitoring

## Troubleshooting

### Common Issues

1. **Orders not loading**: Check `orders.read` permission
2. **Items not searching**: Verify API accessibility
3. **Claims failing**: Check user authentication
4. **Counts not updating**: Refresh dashboard or check DB function

### Debug Steps

1. Check browser console for errors
2. Verify Supabase connection
3. Test API endpoint directly
4. Check user permissions in database
5. Validate RLS policies

## Future Enhancements

### Potential Features

- Order priority levels
- Batch order operations
- Order templates
- Notification system
- Advanced filtering/search
- Order history tracking
- Resource requirement calculations
- Integration with inventory system
