# Package Detection Test

## Test Examples

Here are some test cases for the package detection system:

### Basic Packages

- "Rough Wood Log" + "Rough Wood Log Package" (1 package = 100 logs)
- "Iron Ore" + "Iron Ore Bundle" (1 bundle = 50 ore)
- "Stone" + "Stone Stack" (1 stack = 25 stone)

### Expected Behavior

1. **Individual Items**: "Rough Wood Log" x 200 = 200 total
2. **With Packages**: "Rough Wood Log" x 200 + "Rough Wood Log Package" x 3 = 200 + (3 × 100) = 500 total
3. **Mixed Packages**: Multiple package types for same base item should all contribute

### Package Types Supported

- Package (×100) - Large bulk containers
- Crate (×200) - Extra large containers
- Barrel (×150) - Liquid/bulk storage
- Bundle (×50) - Medium bundles
- Sack (×75) - Bag-like containers
- Box (×20) - Small boxes
- Case (×50) - Protective cases
- Stack (×25) - Stacked items
- Set (×10) - Item sets
- Chest (×100) - Storage chests

### Visual Indicators

- Items with packages show a 📦 badge
- Tooltip shows breakdown of base + package contributions
- Color coding works with combined totals vs targets

### Testing Instructions

1. Go to Settlement Inventory page
2. Toggle "Show Combined Totals" view
3. Look for items with package equivalents
4. Hover over quantity to see breakdown
5. Verify color coding reflects total (base + packages) vs targets
