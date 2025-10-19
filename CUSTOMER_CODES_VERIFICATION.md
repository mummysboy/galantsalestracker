# Customer Detail Modal - Product Code Verification

## Current Behavior (CORRECT)

### Pete's Coffee Data
When viewing Pete's Coffee distributor and clicking on Pete's customers:
- **Code column shows:** "SAN", "BUR", "BAG" ✅
- **This is correct** - Pete's uses these codes in their Excel files

### Alpine Data  
When viewing Alpine distributor and clicking on Alpine customers:
- **Code column shows:** "183981", "999982", "999986" ✅
- **This is correct** - Alpine uses these numeric codes in their TXT files

## The Issue

You're currently viewing **Pete's Coffee** data, so you see Pete's codes ("SAN", "BUR", "BAG"). 

To see Alpine codes ("183981", "999982", "999986"), you need to:

### Step 1: Switch to Alpine Distributor
1. Look for the distributor dropdown at the top of the dashboard
2. Click on it (currently shows "Pete's Coffee")
3. Select **"Alpine"**

### Step 2: Upload Alpine Data
1. Click "Upload Reports"
2. Make sure "Alpine" is selected
3. Upload: `IT415V_010525_050147.TXT`
4. Set period: `2024-12`

### Step 3: Click on Alpine Customers
After switching to Alpine, click on any Alpine customer (like "Core-mark, Intern'l Clackamas") and you should see:
- **183981** → Chicken Bacon Ranch Wrap
- **999982** → Bacon Breakfast Sandwich
- **999986** → Turkey Sausage Breakfast Sandwich
- **999978** → Jumbo Beef Frank Bagel Dog
- **999979** → Jumbo Polish Sausage Bagel Dog

## Verification

The customer detail modal is working correctly - it shows the appropriate product codes for each distributor:

- **Pete's customers** → Pete's codes ("SAN", "BUR", "BAG")
- **Alpine customers** → Alpine codes ("183981", "999982", "999986")
- **KeHe customers** → KeHe codes
- **Vistar customers** → Vistar codes
- etc.

The system correctly uses the data from the selected distributor to populate the customer detail modal.
