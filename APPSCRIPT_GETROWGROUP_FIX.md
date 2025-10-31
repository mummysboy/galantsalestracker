# getRowGroup() Fix - Error Resolution

## Problem

The Google Apps Script was throwing an error:
```
Exception: Os parâmetros (number,number,(class)) não correspondem à assinatura de método para SpreadsheetApp.Sheet.getRowGroup.
```

Translation: "The parameters (number,number,(class)) do not correspond to the method signature for SpreadsheetApp.Sheet.getRowGroup."

## Root Cause

The `getRowGroup()` method was being called with an invalid third parameter:

```javascript
// ❌ WRONG - getRowGroup only takes 2 parameters
sheet.getRowGroup(customerSectionStart, currentRow - 1, true).collapse();
```

## Solution

Fixed the method call to use only the correct parameters:

```javascript
// ✅ CORRECT - Only pass start row and end row
sheet.getRowGroup(customerSectionStart, currentRow - 1).collapse();
```

## What Changed

**File:** `UPDATED_GOOGLE_APPS_SCRIPT.js`

**Line:** 1018

**Before:**
```javascript
sheet.getRowGroup(customerSectionStart, currentRow - 1, true).collapse();
```

**After:**
```javascript
sheet.getRowGroup(customerSectionStart, currentRow - 1).collapse();
```

## Correct getRowGroup() Syntax

```javascript
// Create a row group from row 5 to row 10
const rowGroup = sheet.getRowGroup(5, 10);

// Collapse the group
rowGroup.collapse();

// Or expand it
rowGroup.expand();

// Chain them
sheet.getRowGroup(5, 10).collapse();
```

## Deployment Steps

1. Open Google Sheet
2. Extensions → Apps Script
3. Code should now have the fix
4. Click **Deploy** (top right)
5. Select **Manage deployments**
6. **Create new version** or update existing
7. Copy new deployment URL (if changed)
8. Update `.env` file if needed
9. Test with a new upload

## Testing

After redeployment:

1. Upload a test invoice
2. Check Google Sheets for the data
3. Verify customers are collapsible (click disclosure triangle)
4. Check Apps Script Logs for any errors
5. Expand/collapse sections to verify they work

## Status

✅ **Fixed and ready to redeploy**
