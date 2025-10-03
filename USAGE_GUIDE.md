# Sales Tracker Usage Guide

## Overview
This sales tracking system helps food manufacturing companies monitor customer behavior and identify at-risk customers quickly.

## Key Features

### 1. CSV Upload & Analysis
- **Custom Format**: Upload any CSV with customer, product, quantity, and revenue columns
- **BiRite Format**: Specifically designed for your BiRite sales data format

### 2. Customer Attrition Alerts
- **Stopped Customers**: Customers who ceased buying completely
- **Declining Revenue**: Customers with >30% revenue decrease
- **Low Activity**: Customers buying >50% less than before

### 3. Invoice Comparison
- Detailed product-by-product comparison between periods
- Export capabilities for follow-up actions
- Advanced filtering and sorting

### 4. Period Overview
- High-level metrics comparison
- Automatic critical alerts
- Revenue, customer count, and order value tracking

## How to Use Your BiRite Data

1. **Open the Application**: Navigate to `http://localhost:3000`

2. **Upload Your CSV**:
   - Click on "Upload Invoice Data" section
   - Select "BiRite Format" radio button
   - Upload your current period CSV file in the "Current Period" section
   - Upload your previous period CSV file in the "Previous Period" section

3. **Analyze Results**:
   - **Period Overview**: See high-level comparison between periods
   - **Customer Attrition**: Identify customers who stopped or reduced buying
   - **Invoice Comparison**: Get detailed product-level changes

## Your Current CSV Format
The system recognizes your BiRite CSV format:
```
,,Jan-24,Feb-24,Mar-24,Apr-24,May-24,Jun-24,Jul-24,Aug-24,Sep-24,Oct-24,Nov-24,Dec-24,Total,
,New Accounts,0,0,91,0,0,0,0,0,0,0,0,0,91,
,Total Accounts Ordered,154,154,141,0,0,0,0,0,0,0,0,0,,
Customer,Product,Q1,Q2,Q3,Q4...,,,,,
18th Street Commissary,Mango Gold,2,2,4,,,,
```

## Expected Insights

### Customer Attrition Alerts
- Find customers who disappeared from invoices
- Identify declining revenues
- Track which products are losing popularity

### Period Comparison
- Revenue growth/decline trends
- Customer retention rates
- Product mix changes

### Actionable Intelligence
- Priority customers to contact immediately
- Products needing marketing attention
- Revenue impact calculations

## Sample Files
You can create sample comparison files by splitting your existing data:
1. Use Q1+Q2 as "Previous Period"
2. Use Q3+Q4 as "Current Period"
3. Upload both files to see the comparison

## Best Practices
1. **Regular Updates**: Upload new data monthly/quarterly
2. **Quick Review**: Check attrition alerts first for urgent issues
3. **Detailed Analysis**: Use invoice comparison for specific customer discussions
4. **Team Sharing**: Export reports for sales team follow-up

## Troubleshooting
- Ensure CSV files are properly formatted
- Check that date columns are recognizable by the system
- Verify customer and product names are consistent between periods
- Use the "Custom Format" option if the automatic detection fails
