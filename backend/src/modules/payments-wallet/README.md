# payments-wallet

Phase 5. `Payment` + `WalletLedger` (Nigam Coins). Payment write + wallet debit + booking/order status update must be one Mongo transaction — requires a replica-set connection (see backend/.env.example note on MONGODB_URI). Razorpay integration assumed; confirm before building the real client. See BACKEND_CONTEXT.md §3.10.
