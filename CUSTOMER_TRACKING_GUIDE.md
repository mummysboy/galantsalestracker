# Customer Tracking Guide - New & Lost Customers

## Overview

Your Google Sheets now display **actual customer names** for new and lost customers each month, with full support for sub-vendor tracking!

---

## Layout Structure

Your sheet will now have **THREE main sections**:

### 1️⃣ **Key Metrics** (at the top)
- Total Cases per month
- New Customers count per month
- Lost Customers count per month

### 2️⃣ **NEW & LOST CUSTOMERS DETAIL** (middle section) ⭐ NEW!
- Actual names of new customers by month
- Actual names of lost customers by month
- Sub-vendors tracked separately

### 3️⃣ **Sales by Customer & Product** (bottom section)
- Detailed pivot table
- Monthly breakdown
- Product-level data

---

## Section 2: Customer Tracking Detail

### Visual Example:

```
┌──────────────────────────────────────────────────────────────────────┐
│          NEW & LOST CUSTOMERS DETAIL - 2025                           │  (Purple header #9c27b0)
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ ✅ NEW CUSTOMERS:                                                     │  (Green header #c8e6c9)
├──────────────┬───────────────────────────────────────────────────────┤
│ Jan:         │ Whole Foods - Oakland, Blue Bottle - Ferry Building   │  (Light green bg)
├──────────────┼───────────────────────────────────────────────────────┤
│ Feb:         │ Safeway - Downtown                                    │
├──────────────┼───────────────────────────────────────────────────────┤
│ Apr:         │ Target - San Jose, Trader Joe's - Berkeley            │
├──────────────┼───────────────────────────────────────────────────────┤
│ Jun:         │ Whole Foods - Berkeley                                │
└──────────────┴───────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ ❌ LOST CUSTOMERS:                                                    │  (Red header #ffcdd2)
├──────────────┬───────────────────────────────────────────────────────┤
│ Mar:         │ Local Cafe - Downtown                                 │  (Light red bg)
├──────────────┼───────────────────────────────────────────────────────┤
│ Jul:         │ Pete's Coffee - Airport                               │
├──────────────┼───────────────────────────────────────────────────────┤
│ Oct:         │ Safeway - Uptown                                      │
└──────────────┴───────────────────────────────────────────────────────┘
```

---

## Key Features

### ✅ **New Customers Section**
- 🎨 **Green background** (#c8e6c9) for the header
- 📝 Shows month-by-month list of new customers
- 📊 Only shows months that have new customers
- 💚 Light green background for each month's customer list
- ✔️ Alphabetically sorted within each month

### ❌ **Lost Customers Section**
- 🎨 **Red background** (#ffcdd2) for the header
- 📝 Shows month-by-month list of lost customers
- 📊 Only shows months that have lost customers
- 💔 Light red background for each month's customer list
- ✔️ Alphabetically sorted within each month

### 🏢 **Sub-Vendor Tracking**
- **Separate tracking**: "Whole Foods - Oakland" and "Whole Foods - SF" are tracked independently
- **Example**: If you add "Whole Foods - Berkeley" in June, it shows as NEW even if you already have "Whole Foods - Oakland"
- **Lost tracking**: If "Whole Foods - Oakland" stops ordering but "Whole Foods - SF" continues, only Oakland shows as LOST

---

## Real-World Examples

### Example 1: New Customer with Multiple Locations

**January Upload:**
```
Customer: Whole Foods - Oakland
```
**Result:**
```
✅ NEW CUSTOMERS:
Jan: Whole Foods - Oakland
```

**March Upload:**
```
Customer: Whole Foods - Berkeley
```
**Result:**
```
✅ NEW CUSTOMERS:
Jan: Whole Foods - Oakland
Mar: Whole Foods - Berkeley    ← New location treated as new customer!
```

---

### Example 2: Location Closes (Lost Customer)

**January-March:** "Pete's Coffee - Airport" orders regularly
**April:** No order from "Pete's Coffee - Airport"

**Result:**
```
❌ LOST CUSTOMERS:
Apr: Pete's Coffee - Airport
```

But if "Pete's Coffee - Downtown" still orders, the main "Pete's Coffee" continues in the pivot table with only the Downtown location.

---

### Example 3: Complete Customer Loss

**January-March:** "Local Cafe" orders regularly
**April:** No order from "Local Cafe"

**Result:**
```
❌ LOST CUSTOMERS:
Apr: Local Cafe
```

---

### Example 4: Multiple Changes in One Month

**February Data:**
- New: "Target - San Jose", "Safeway - Berkeley", "Trader Joe's"
- Lost: "Old Cafe", "Former Store"

**Result:**
```
✅ NEW CUSTOMERS:
Feb: Safeway - Berkeley, Target - San Jose, Trader Joe's

❌ LOST CUSTOMERS:
Feb: Former Store, Old Cafe
```

---

## How Detection Works

### New Customer Detection:
1. **Looks at each month**
2. **Compares to ALL previous months in the year**
3. **If customer name appears for first time** → Marked as NEW
4. **Full name matching**: "Whole Foods - Oakland" ≠ "Whole Foods - SF"

### Lost Customer Detection:
1. **Looks at each month**
2. **Compares to previous month only**
3. **If customer was in previous month but not current** → Marked as LOST
4. **Full name matching**: Each sub-vendor tracked separately

---

## Benefits

### 📊 For Sales Teams:
- **Immediate visibility** into customer acquisition
- **Quick identification** of churn issues
- **Month-by-month accountability** for growth

### 📈 For Management:
- **Track expansion** into new locations/accounts
- **Identify patterns** in customer loss
- **Measure retention** effectiveness

### 🎯 For Customer Success:
- **Proactive outreach** to at-risk accounts
- **Celebrate wins** with new customer acquisitions
- **Track location-specific relationships**

---

## Understanding the Data

### When a customer shows as "NEW":
✅ First time seeing this exact customer name
✅ Could be a new location of existing customer
✅ Could be completely new account

### When a customer shows as "LOST":
❌ Didn't order in current month
❌ Did order in previous month
❌ Could be temporary (vacation, budget cycle, etc.)
❌ Could be permanent churn

### Important Notes:
- 📌 Sub-vendors are tracked separately
- 📌 "New" means first appearance **in the year**
- 📌 "Lost" means compared to **previous month**
- 📌 A customer can be "lost" in one month and return later

---

## Color Coding Summary

| Element | Background Color | Text Color | Purpose |
|---------|-----------------|------------|---------|
| **Section Header** | Purple #9c27b0 | White | Main section identifier |
| **New Customers Label** | Light Green #c8e6c9 | Dark Green #1b5e20 | Positive growth indicator |
| **New Customer Rows** | Pale Green #f1f8e9 | Default | Individual new customers |
| **Lost Customers Label** | Light Red #ffcdd2 | Dark Red #b71c1c | Churn alert indicator |
| **Lost Customer Rows** | Pale Red #fff5f5 | Default | Individual lost customers |

---

## Edge Cases

### No New Customers:
```
✅ NEW CUSTOMERS:
No new customers this year
```

### No Lost Customers:
```
❌ LOST CUSTOMERS:
No lost customers this year - Great job! 🎉
```

### Multiple Locations Added Same Month:
```
✅ NEW CUSTOMERS:
Jun: Starbucks - Airport, Starbucks - Downtown, Starbucks - Mall
```

---

## Tips for Using This Data

### 🎯 **Monthly Reviews:**
1. Check new customers section for growth
2. Review lost customers for follow-up
3. Compare to previous months for trends

### 📞 **Action Items:**
- **New customers**: Welcome them, ensure smooth onboarding
- **Lost customers**: Reach out to understand why, attempt to win back

### 📊 **Reporting:**
- Export this section for monthly executive reports
- Track acquisition vs. churn rates
- Identify seasonal patterns

---

## Updates Automatically

This section rebuilds automatically every time you upload data through your SalesTracker app. No manual updates needed!


