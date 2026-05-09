# Demo Mode Testing Guide

This document provides a comprehensive testing checklist for validating all features in demo mode before release.

## Pre-Testing Setup

1. **Database Migrations**: Ensure all migrations run successfully
   ```bash
   cd backend
   alembic upgrade head
   ```
   
2. **Server Setup**: Start both backend and frontend
   ```bash
   # Terminal 1: Backend
   cd backend
   uvicorn app.main:app --reload
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

3. **Access Application**: Navigate to `http://localhost:5173`

---

## Testing Checklist

### 1. Authentication & Access

- [ ] **Demo Login Button Visible**
  - Login page displays "Try Demo" button
  - Button is clearly visible and accessible
  - Button styling matches design

- [ ] **Demo Login Functionality**
  - Clicking "Try Demo" successfully logs in with demo account
  - User is redirected to dashboard
  - No error messages on successful login
  - Demo badge appears in navbar (🎯 DEMO)

- [ ] **Demo Account Access**
  - Email: `demo@iotplatform.local`
  - Password: `demo`
  - Manual login with credentials works
  - Both methods lead to same account

### 2. Dashboard & Data Visualization

- [ ] **Dashboard Loads**
  - Projects are visible
  - "My Projects" section shows demo project
  - Project card displays "Demo Smart Home"
  - No loading errors

- [ ] **Mobile Responsiveness**
  - Test on mobile device (portrait/landscape)
  - Navigation navbar is readable and functional
  - Demo badge is visible but not overcrowded
  - Project cards stack properly on small screens
  - Settings drawer is accessible and usable
  - Layout reflows correctly on tablet size

- [ ] **Demo Data Visible**
  - Project shows 2 devices connected
  - Devices: "Bedroom Sensor 1", "Outdoor Sensor"
  - Navigation to project detail page works
  - Sensor data is populated and visible
  - Charts display data properly

### 3. Alerts Feature

- [ ] **Alert Viewing (Read-Only)**
  - Can view alert list for devices
  - Pre-configured alerts are visible (3 alerts)
  - Alert details show: device, metric, condition, threshold
  - No errors when loading alerts

- [ ] **Alert Creation Disabled**
  - "Create Alert" button attempts trigger error
  - Error message: "Cannot create alert rules in demo mode"
  - HTTP 403 response returned
  - UI gracefully handles the error

- [ ] **Alert Modification Disabled**
  - Cannot toggle/enable-disable alerts
  - Cannot delete alerts
  - Error messages appear for all modification attempts
  - Buttons should be disabled or show warnings

- [ ] **Email Configuration Disabled**
  - Settings panel shows email field is disabled
  - Info message: "Email configuration is not available in demo mode"
  - Save button is not visible/disabled for email
  - Cannot update alert email

### 4. AI Chatbot

- [ ] **Chatbot Access**
  - Chat interface loads for demo project
  - Chat box is visible and functional
  - Able to type messages

- [ ] **Message Limit (10 messages/day)**
  - Send 10 messages successfully
  - Each message gets a response
  - After 10th message, attempting 11th shows error
  - Error message: "Demo chat limit (10 messages per day) reached"
  - HTTP 429 response received

- [ ] **Message Tracking**
  - Counter visible (optional UI element)
  - Messages are logged in database
  - Limit resets the next day

- [ ] **Chat Functionality**
  - Questions about sensor data are answerable
  - AI provides relevant insights
  - No errors in chat responses

### 5. Data Export & Download

- [ ] **CSV Export Available**
  - Export button is visible
  - CSV download works for demo data
  - File contains correct columns
  - File contains demo sensor readings

- [ ] **Export Restrictions (Optional)**
  - Export is available in demo mode
  - No limitations on export frequency

### 6. Settings & User Info

- [ ] **Demo Mode Badge**
  - Badge visible in navbar: "🎯 DEMO"
  - Shows prominently but doesn't interfere
  - Works on mobile devices

- [ ] **Settings Panel**
  - Settings opens with gear icon
  - Demo info section visible
  - Shows limitations list:
    - Data stored for 7 days only
    - Chat limit: 10 messages per day
    - Read-only mode for alerts
    - No email configuration

- [ ] **Call-to-Action**
  - "Want to keep your data?" message visible
  - Encourages account creation
  - Text is clear and motivating

### 7. Data Retention & Cleanup

- [ ] **7-Day Data Retention**
  - Historical data spans 7 days
  - Timestamps are correct
  - Data quality is realistic

- [ ] **Cleanup Script Works**
  ```bash
  cd backend
  python manage.py cleanup
  ```
  - Script runs without errors
  - Returns cleanup statistics
  - Old demo data is removed

- [ ] **Chat Limit Reset**
  ```bash
  cd backend
  python manage.py reset-limits
  ```
  - Script runs without errors
  - Message counts reset for demo user

### 8. API Endpoints Behavior

- [ ] **Alerts API Read-Only**
  ```bash
  # POST /alerts/{project_id}/rules - Should return 403
  # DELETE /alerts/{project_id}/rules/{id} - Should return 403
  # PATCH /alerts/{project_id}/rules/{id}/toggle - Should return 403
  ```

- [ ] **Auth Endpoints**
  ```bash
  # PATCH /auth/me/alert-email - Should return 403 for demo user
  # GET /auth/me - Should return user with is_demo=true
  ```

- [ ] **Chat Endpoints**
  ```bash
  # POST /chat/{project_id} - Should enforce 10 message limit
  ```

### 9. Browser Compatibility

- [ ] **Chrome**: Demo works correctly
- [ ] **Firefox**: Demo works correctly
- [ ] **Safari**: Demo works correctly
- [ ] **Mobile Safari (iOS)**: Responsive and functional
- [ ] **Chrome Mobile (Android)**: Responsive and functional

### 10. Performance & Load Times

- [ ] **Demo Login Speed**: < 2 seconds
- [ ] **Dashboard Load**: < 3 seconds
- [ ] **Chart Rendering**: < 2 seconds
- [ ] **Chat Response**: < 5 seconds
- [ ] **Pagination**: Works smoothly for large datasets

### 11. Error Handling

- [ ] **Network Error**: Graceful error message shown
- [ ] **Database Error**: Server returns appropriate error code
- [ ] **Validation Error**: Form validation works
- [ ] **Session Timeout**: Session handling works correctly

### 12. Documentation

- [ ] **README Updated**: Demo feature documented
- [ ] **Setup Instructions Clear**: Users can access demo easily
- [ ] **Limitations Clear**: Users understand restrictions
- [ ] **Sign-up Call-to-Action**: Clear path to full account

---

## Test Results

### Date: _______________
### Tester: ______________

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✓ / ✗ | |
| Dashboard | ✓ / ✗ | |
| Alerts (Read-Only) | ✓ / ✗ | |
| Chatbot | ✓ / ✗ | |
| Message Limit | ✓ / ✗ | |
| Mobile Responsiveness | ✓ / ✗ | |
| Settings Panel | ✓ / ✗ | |
| Data Export | ✓ / ✗ | |
| API Restrictions | ✓ / ✗ | |
| Performance | ✓ / ✗ | |

### Overall Result: **PASS / FAIL**

### Issues Found:
- [ ] Issue 1: ___________________________
- [ ] Issue 2: ___________________________
- [ ] Issue 3: ___________________________

### Sign-Off
- **Approved by**: ________________
- **Approved on**: ________________

---

## Regression Testing

After making changes, ensure:
- [ ] Demo login still works
- [ ] Message limit still enforces
- [ ] Alerts still read-only
- [ ] Mobile layout still responsive
- [ ] No new errors in console

---

## Performance Metrics (Optional)

- Demo Login Time: _____ ms
- Dashboard Load Time: _____ ms
- Chat Response Time: _____ ms
- First Contentful Paint: _____ ms
- Largest Contentful Paint: _____ ms
