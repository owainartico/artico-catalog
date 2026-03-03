def sum_even_numbers(numbers):
    """
    Sum all even numbers in the given list.
    
    Args:
        numbers (list): A list of integers.
        
    Returns:
        int: The sum of all even numbers in the list.
    """
    return sum(num for num in numbers if num % 2 == 0)

# Test case
test_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
result = sum_even_numbers(test_numbers)
print(f"Sum of even numbers in {test_numbers} is: {result}")  # Expected output: 30 (2+4+6+8+10)
