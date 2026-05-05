# Backend Test Coverage Overview

This test suite validates the core functionality of the marketplace backend across authentication, products, cart, orders, and recommendations.

## 1. Authentication & Registration

* Customer registration (success case)
* Producer registration (success case)
* Validation of organisation fields
* Weak password rejection
* Account settings retrieval and update (PATCH)

## 2. Product Management

* Producer can create products
* Customers are blocked from creating products
* Producer can update their own product
* Producer cannot update another producer’s product
* Product filtering (e.g. organic products)

## 3. Cart Functionality

* Add item to cart
* Update cart item quantity
* Delete cart item
* Merge cart items
* Clear cart
* Retrieve cart contents

## 4. Orders

* Customer order history retrieval
* Last completed order (with items)
* Producer order visibility
* Non-producer restricted from producer order access

## 5. Commission Calculation

* Validates commission and payout values via API response

## 6. Recommendations System

* Rejects invalid recommendation events
* Successfully logs valid recommendation interactions

## Summary

The test suite ensures:

* Role-based permissions are enforced
* Core e-commerce flows (cart → order → commission) work correctly
* Data validation and constraints behave as expected
* Recommendation tracking is reliable

All tests currently pass, confirming system stability after recent fixes.
