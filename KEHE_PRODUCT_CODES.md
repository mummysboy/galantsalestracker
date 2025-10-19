# KeHE Product Code Quick Reference

## Complete KeHE Product Code Mapping

| KeHE UPC | Galant Code | KeHE Description | Canonical Product Name |
|----------|-------------|------------------|------------------------|
| 611665888003 | 321 | BURRITO BRKFST BCN EGG CHS | Uncured Bacon Breakfast Burrito |
| 611665888010 | 341 | WRAP BRKFST CHILE EGG CHS | Chile Verde Breakfast Burrito |
| 611665888027 | 331 | WRAP BRKFST SAUSGE EGG CH | Sausage Breakfast Burrito |
| 611665888089 | 811 | WRAP CHICKEN BACON RANCH | Chicken Bacon Ranch Wrap |
| 611665888119 | 311 | BURRITO BRKFST CHORIZO | Chorizo Breakfast Burrito |
| 611665888126 | 361 | BURRITO BREAKFAST | Black Bean Breakfast Burrito |
| 611665888140 | 391 | BURRITO BEAN CHSE PLNTBSD | Plant Based Breakfast Burrito |
| 611665900095 | 451 | SANDWICH BRKFST PEST PROV | Pesto Provolone Breakfast Sandwich |
| 611665900101 | 211 | SANDWICH BREAKFAST BACON | Bacon Breakfast Sandwich |
| 611665900118 | 213 | SANDWICH BREAKFST CHORIZO | Chorizo Breakfast Sandwich |
| 611665901009 | 821 | WRAP CHICKEN CURRY | Chicken Curry Wrap |
| 611665901023 | 341 | BURRITO CHILE VERDE BRKFT | Chile Verde Breakfast Burrito |
| 611665901047 | 361 | BURRITO BEAN CHEESE | Black Bean Breakfast Burrito |
| 611665901054 | 851 | BURRITO CHICKN CHEES BEAN | Bean & Cheese Burrito |
| 611665100013 | 611 | BEEF JUMBO BAGEL DOG | Jumbo Beef Frank Bagel Dog |
| 611665200010 | 611 | BEEF FRANK BAGEL DOGS | Jumbo Beef Frank Bagel Dog |
| 611665200218 | 612 | SAUSAGE POLISH BAGEL DOGS | Jumbo Polish Sausage Bagel Dog |
| 611665200225 | 531 | DOGS BAGEL JALEPENO CHDDR | Benny's Jalapeno & Cheddar Bagel Dogs |
| 611665106015 | - | CALZONE ITALIAN COMBO | Unknown Product |
| 611665106022 | - | CALZONE CHICKEN FAJITA | Unknown Product |

## Product Categories

### Breakfast Burritos (611665888xxx)
- **611665888003** - Uncured Bacon Breakfast Burrito
- **611665888010** - Chile Verde Breakfast Burrito  
- **611665888027** - Sausage Breakfast Burrito
- **611665888119** - Chorizo Breakfast Burrito
- **611665888126** - Black Bean Breakfast Burrito
- **611665888140** - Plant Based Breakfast Burrito

### Breakfast Sandwiches (611665900xxx)
- **611665900095** - Pesto Provolone Breakfast Sandwich
- **611665900101** - Bacon Breakfast Sandwich
- **611665900118** - Chorizo Breakfast Sandwich

### Wraps (611665888xxx & 611665901xxx)
- **611665888089** - Chicken Bacon Ranch Wrap
- **611665901009** - Chicken Curry Wrap

### Non-Breakfast Burritos (611665901xxx)
- **611665901023** - Chile Verde Breakfast Burrito
- **611665901047** - Black Bean Breakfast Burrito
- **611665901054** - Bean & Cheese Burrito

### Bagel Dogs (6116651xxxxx & 6116652xxxxx)
- **611665100013** - Jumbo Beef Frank Bagel Dog
- **611665200010** - Jumbo Beef Frank Bagel Dog
- **611665200218** - Jumbo Polish Sausage Bagel Dog
- **611665200225** - Benny's Jalapeno & Cheddar Bagel Dogs

### Unknown Products (611665106xxx)
- **611665106015** - Calzone Italian Combo (needs mapping)
- **611665106022** - Calzone Chicken Fajita (needs mapping)

## Notes

### UPC Pattern
KeHE uses 12-digit UPC codes following the pattern:
- **611665888xxx** - CLARA'S Kitchen products (breakfast items)
- **611665900xxx** - CLARA'S Kitchen products (breakfast sandwiches)
- **611665901xxx** - CLARA'S Kitchen products (wraps and burritos)
- **6116651xxxxx** - Benny's Bagel Dogs
- **6116652xxxxx** - Benny's Bagel Dogs (different pack sizes)

### Branding
KeHE distributes Galant products under both:
- **CLARA'S KITCHEN** brand (most products)
- **BENNY'S BAGEL DOGS** brand (bagel dog products)

### Pack Sizes
Different UPC codes may represent different pack sizes of the same product:
- Multiple codes for Jumbo Beef Frank Bagel Dog (611665100013, 611665200010)
- Multiple codes for bagel dogs in different configurations

## Report Format
KeHE reports show product codes in the UPC column with format:
```
UPC,ProductDescription,ProductSize,UOM
611665888010,CLARAS KITCHEN,WRAP BRKFST CHILE EGG CHS,8.000,OZ
```

The detail lines show individual customer transactions with the UPC code in the ProductDescription column.
