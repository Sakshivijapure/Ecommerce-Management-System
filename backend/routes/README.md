# E-Commerce Management System

## Overview

A full-stack multi-vendor e-commerce platform developed using **React.js, FastAPI, MySQL, and Machine Learning** technologies.

The platform allows customers to browse products, place orders, manage returns, submit reviews, and receive personalized recommendations. Sellers can manage products, pricing, orders, and customer feedback, while administrators can monitor platform activity, detect suspicious behavior, and manage users and sellers.

---

# Features

## Customer Features

* User Registration and Login
* Role-Based Access Control
* Product Browsing and Search
* Category-Based Product Filtering
* Product Detail Pages
* Shopping Cart Management

### Wishlist Management

* Add to Wishlist
* View Wishlist
* Remove Wishlist Items

### Address Management

* Add Shipping Addresses (Integrated into Checkout Flow)
* Manage Saved Addresses (Integrated into Checkout Flow)

### Checkout and Order Placement

### Payment Processing

* UPI
* Card
* Net Banking
* Wallet
* Cash on Delivery (COD)

### Orders

* Order Tracking (Visual Timeline)
* Order History
* Order Cancellation
* Automatic Stock Restoration (On Cancellation)
* Return Request Management

### Reviews & Ratings

* Product Reviews and Ratings
* Sentiment-Aware Review Processing

### Recommendations

* Collaborative Filtering Recommendations
* Content-Based Recommendations

---

## Seller Features

### Seller Dashboard

* Revenue Analytics
* Order Statistics
* Product Performance Insights

### Product Management

* Add Products (with image uploading)
* Update Pricing
* Update Stock Levels
* Toggle Product Status

### Product Status Management

* Active
* Out of Stock
* Discontinued

### Order Management

* Update Order Status
  * Shipped
  * Out for Delivery
  * Delivered

### Return Management

* Approve Return Requests
* Reject Return Requests
* Automatic Return Status Tracking (Auto-progresses to Picked Up and Refunded)

### Seller Profile Management

* Edit Seller Information
* Update Shop Information

### Review Analytics

* Positive Review Insights
* Negative Review Insights
* Product Sentiment Breakdown
* Review Sentiment Statistics

---

## Admin Features

### Platform Management

* Manage Customers
* Manage Sellers
* Suspend Accounts
* Reactivate Accounts

### Platform Analytics

* Total Customers
* Total Sellers

### Risk Monitoring

* Customer Risk Monitoring
* Seller Risk Monitoring

### Fraud Detection Dashboard

* Customer Fraud Monitoring (Return Abuse)
* Seller Fraud Monitoring (Suspicious Sellers)
* Review Abuse Monitoring (Repeated Reviews)
* Risk Score Generation

---

# Machine Learning Features

## 1. Hybrid Recommendation System

### Collaborative Filtering

Recommends products frequently purchased together by analyzing customer order history.

### Content-Based Filtering

Uses product descriptions and category information to recommend similar products using:

* TF-IDF Vectorization
* Cosine Similarity

### Benefits

* Improved Product Discovery
* Better Customer Engagement
* Personalized Shopping Experience

---

## 2. Sentiment Analysis

Review sentiment analysis is powered using:

**Model:** `cardiffnlp/twitter-roberta-base-sentiment`

### Capabilities

* Positive Review Detection
* Neutral Review Detection
* Negative Review Detection
* Sentiment Score Calculation

The sentiment score and sentiment label are automatically stored and used for seller-side analytics.

---

## 3. Fraud Detection System

Machine Learning-driven fraud monitoring module designed for administrative analytics.

### Customer Fraud Detection

Detects:

* Excessive Return Behavior
* Abnormal Return Ratios
* High Cancellation Activity

### Review Abuse Detection

Detects:

* Repeated Review Content
* Similar Reviews Across Multiple Products
* Review Spamming Behavior

### Seller Fraud Detection

Detects:

* High Product Return Rates
* Excessive Negative Feedback

Risk scores are generated and displayed inside the Admin Dashboard for manual review and action.

---

# Technology Stack

## Frontend

* React.js
* Axios
* React Router DOM
* Tailwind CSS
* Lucide React Icons

## Backend

* FastAPI
* Uvicorn
* MySQL Connector Python

## Database

* MySQL

## Machine Learning

* PyTorch
* Hugging Face Transformers
* Scikit-Learn
* Pandas
* NumPy
* Joblib

---

# Database Design

### Major Entities

* user
* seller
* address
* product
* product_image
* category
* cart
* cart_item
* orders
* order_item
* payment
* review
* return_request
* wishlist
* wishlist_item
* fraud_flag

---

# Installation Guide

## Prerequisites

* Node.js (v18+ Recommended)
* Python (v3.10+ Recommended)
* MySQL Server

---

## Step 1: Database Setup

Create the database:

```sql
CREATE DATABASE ecommerce_db;
```

Import schema and sample data:

```bash
mysql -u root -p ecommerce_db < database/schema.sql
```

---

## Step 2: Configure Environment Variables

Create a `.env` file inside the `backend` folder:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ecommerce_db
```

---

# Running the Application

## Run Backend and Frontend Separately

### Backend Setup

```bash
cd backend
```

Create virtual environment:

**Windows**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux**

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run FastAPI:

```bash
uvicorn main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

---

### Frontend Setup

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```
---

## Quick Start (Recommended)

From the project root directory:

```bash
npm run dev
```

The root project is configured using concurrently, which automatically starts both:

* Frontend → http://localhost:5173
* Backend → http://127.0.0.1:8000