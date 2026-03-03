"""
Formats stock information into a standardized dictionary structure.

Args:
    sku (str): The stock keeping unit identifier.
    stock (int): Current inventory count.

Returns:
    dict: Contains keys 'sku', 'stock', 'in_stock' (bool), and 'updated_at' (ISO timestamp).
"""
import datetime

def format_stock(sku, stock):
    return {
        'sku': sku,
        'stock': stock,
        'in_stock': stock > 0,
        'updated_at': datetime.datetime.now().isoformat()
    }

# Example usage
if __name__ == "__main__":
    example = format_stock("ABC123", 42)
    print(f"Example output: {example}")