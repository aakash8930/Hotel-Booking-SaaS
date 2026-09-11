# 📖 StayEase Operations Manual
## The Owner's Guide to Managing the Platform

This manual describes the day-to-day operational tasks required to run and grow the StayEase platform.

---

## 🔑 1. Administrative Access
The platform is managed via the **Admin Console** (`/admin`). 

### Initial Setup
To create your first administrator account, use the provided CLI script:
```bash
pnpm create:admin -- --email admin@yourdomain.com --name "Founder" --password "SecurePassword123!"
```

### Key Admin Responsibilities
- **Host Onboarding**: Review submitted identity documents in the Admin Panel. Change status to `VERIFIED` once the host's identity and property ownership are confirmed.
- **Property Moderation**: Monitor listings for quality. If a property violates terms, change status to `SUSPENDED` to remove it from public search.
- **Review Moderation**: Review reported reviews. Hide abusive content to maintain platform trust.
- **Payout Management**: Review `PENDING` payout batches. Once the bank transfer is completed manually, mark them as `PAID` and add the transaction reference.

---

## 💰 2. Financial Operations

### Revenue Streams
1. **Commission**: The system automatically calculates a % fee on every booking based on the host's `commissionRate`.
2. **Subscriptions**: Hosts can pay a flat monthly fee to eliminate commissions.

### Payout Workflow
1. **Calculation**: The system aggregates all `PAID` bookings for a host over a period.
2. **Batching**: The admin creates a Payout batch.
3. **Settlement**: The admin transfers funds to the host's bank account.
4. **Reconciliation**: The admin marks the batch as `PAID` in the system.

---

## 🛠️ 3. Technical Maintenance

### Local Development
To start the environment:
```bash
./startup.sh
```

### Monitoring
- **API Health**: Check `http://localhost:4000/api/v1/health`.
- **Realtime Health**: Check `http://localhost:4001/health`.
- **Logs**: Monitor `logs/Web.log` and `logs/API.log` for errors.

---

## 📈 4. Growth & Support
- **Host Support**: Use the Admin Panel to help hosts optimize their pricing via the AI recommendations.
- **Guest Support**: Use the `Admin -> Bookings` search to resolve disputes or manually trigger booking transitions.
