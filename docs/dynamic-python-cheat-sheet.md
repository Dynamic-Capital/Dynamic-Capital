# Dynamic Python Cheat Sheet: Core Essentials

A fast reference to foundational Python syntax and libraries that aligns with
Dynamic Capital's Python-based workflows.

## Basics

```python
# Print and comments
print("Hello, world!")  # This is a comment

# Variables and types
x = 5           # int
y = "hello"     # str
z = 3.14        # float
```

## Data Structures

```python
# Lists
fruits = ["apple", "banana", "mango"]
fruits.append("orange")

# Dictionaries
person = {"name": "Abdul", "age": 30}
person["location"] = "Malé"

# Tuples
coords = (4, 5)

# Sets
unique = set([1, 2, 2, 3])
```

## Control Flow

```python
# If-else
if x > 0:
    print("Positive")
elif x == 0:
    print("Zero")
else:
    print("Negative")

# Loops
for item in fruits:
    print(item)

while x > 0:
    x -= 1
```

## Functions and Classes

```python
# Function
def greet(name):
    return f"Hello, {name}!"

# Class
class Dog:
    def __init__(self, name):
        self.name = name

    def bark(self):
        return f"{self.name} says Woof!"
```

## Useful Built-ins

- `len()`
- `type()`
- `range()`
- `input()`
- `print()`

## Libraries to Know

- `math`
- `datetime`
- `random`
- `requests`
- `pandas`
- `numpy`
- `flask`
- `django`

## Downloadable Cheat Sheets

- [Real Python PDF Cheat Sheet](https://realpython.com/cheatsheets/python/)
- [GeeksforGeeks Python Cheat Sheet](https://www.geeksforgeeks.org/python/python-cheat-sheet/)
- [Freemote Python Guide](https://www.freemote.com/python-cheat-sheet)
