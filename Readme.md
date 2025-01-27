# FitLogix - Server Side

This is the server-side repository for the Gym Management System, a web application that facilitates managing trainers, classes, members, bookings, payments, and forums. The backend is built using **Node.js**, **Express**, and **MongoDB**.

---

## Features

- **Authentication**: Email/password-based and social login using Firebase Authentication.
- **Role-based Access Control (RBAC)**: Admin, Trainer, and Member roles.
- **JWT Implementation**: Secure private routes with token-based authentication.
- **Trainer Management**: Apply, approve/reject applications, and manage slots.
- **Payment Integration**: Stripe payment gateway.
- **Search Functionality**: Case-insensitive search for classes.
- **Community Forum**: Badge-based post categorization and voting system.
- **Dashboard**: Admin financial overview, trainer applications, and newsletter management.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB 
- **Authentication**: Firebase Authentication + JSON Web Tokens (JWT)
- **Payment Gateway**: Stripe
- **Others**: React Select for days of the week, Bcrypt for password hashing.

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd server
