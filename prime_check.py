def is_prime(n: int) -> bool:
    """Check if a number is prime."""
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(n**0.5) + 1, 2):
        if n % i == 0:
            return False
    return True


# Test cases
if __name__ == "__main__":
    test_cases = [1, 2, 3, 4, 17, 25, 29, 100]
    for n in test_cases:
        print(f"{n} -> {is_prime(n)}")