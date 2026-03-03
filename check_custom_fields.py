import json

# Load the items we already fetched
with open('C:/Users/User/.openclaw/workspace/items-active.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

items = data['items']

# Collect all unique planning group values
planning_groups = set()
do_not_reorder_values = set()

# Check what custom fields exist
custom_fields_found = set()

for item in items[:100]:  # Check first 100
    # Look for planning group
    if 'cf_planning_group' in item and item['cf_planning_group']:
        planning_groups.add(item['cf_planning_group'])
    
    # Look for do not reorder field
    if 'cf_do_not_reorder_discontinued' in item and item['cf_do_not_reorder_discontinued']:
        do_not_reorder_values.add(item['cf_do_not_reorder_discontinued'])
    
    # Collect all custom field names
    for key in item.keys():
        if key.startswith('cf_'):
            custom_fields_found.add(key)

print("="*80)
print("CUSTOM FIELDS FOUND")
print("="*80)
for cf in sorted(custom_fields_found):
    print(f"  {cf}")

print("\n" + "="*80)
print("PLANNING GROUPS")
print("="*80)
for pg in sorted(planning_groups):
    print(f"  {pg}")

print(f"\nTotal unique planning groups: {len(planning_groups)}")

print("\n" + "="*80)
print("DO NOT REORDER VALUES")
print("="*80)
for val in sorted(do_not_reorder_values):
    print(f"  {val}")

# Show a sample item with custom fields
print("\n" + "="*80)
print("SAMPLE ITEM WITH CUSTOM FIELDS")
print("="*80)

for item in items[:50]:
    if 'cf_planning_group' in item and item['cf_planning_group']:
        print(f"\nItem: {item.get('name', 'Unknown')}")
        print(f"SKU: {item.get('sku', 'N/A')}")
        print(f"\nCustom fields:")
        for key, value in item.items():
            if key.startswith('cf_') and value:
                print(f"  {key}: {value}")
        break
