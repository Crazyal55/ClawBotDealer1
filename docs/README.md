# Documentation Index

Welcome to the Car Dealership Scraper Platform documentation.

## 📚 Quick Links

- [Main README](../README.md) - Quick start and setup guide
- [TESTING.md](./TESTING.md) - Comprehensive testing procedures

---

## 📖 Documentation by Topic

### Getting Started
- [QUICK_START.md](./QUICK_START.md) - 5-minute setup guide
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup instructions
- [SETUP_README.md](./SETUP_README.md) - Quick setup reference
- [START.md](./START.md) - First-time setup steps

### Architecture & Design
- [TECH_STACK.md](./TECH_STACK.md) - **Technology choices & rationale**
- [HYBRID_DB_ARCHITECTURE.md](./HYBRID_DB_ARCHITECTURE.md) - Database design for RAG system
- [OVERNIGHT_SUMMARY_FINAL.md](./OVERNIGHT_SUMMARY_FINAL.md) - Complete feature list and architecture

### Features & Development
- [ALL_NIGHT_FEATURES.md](./ALL_NIGHT_FEATURES.md) - Feature breakdown
- [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) - Planned features
- [NEW_FEATURES_GUIDE.md](./NEW_FEATURES_GUIDE.md) - Adding new features

### Data & Testing
- [PLACEHOLDER_DATA_README.md](./PLACEHOLDER_DATA_README.md) - Sample data explanation
- [TESTING.md](./TESTING.md) - Testing procedures

### Roadmap & Planning
- [TASK_SCHEDULE.md](./TASK_SCHEDULE.md) - 8-week development roadmap
- [TASK_SCHEDULE_UPDATED.md](./TASK_SCHEDULE_UPDATED.md) - Updated task schedule

### Polish & Improvements
- [POLISH_WISHLIST.md](./POLISH_WISHLIST.md) - UI/UX improvements
- [MORNING_READINESS.md](./MORNING_READINESS.md) - Daily setup checklist

### Utilities
- [NIGHT_BUILD_SUMMARY.md](./NIGHT_BUILD_SUMMARY.md) - Build summary
- [FIX_GIT_IDENTITY.md](./FIX_GIT_IDENTITY.md) - Git configuration

---

## 🎯 Where to Start?

### New Users
1. Read [Main README](../README.md)
2. Follow [QUICK_START.md](./QUICK_START.md)
3. Run [TESTING.md](./TESTING.md) tests

### Developers
1. Review [HYBRID_DB_ARCHITECTURE.md](./HYBRID_DB_ARCHITECTURE.md)
2. Check [TASK_SCHEDULE.md](./TASK_SCHEDULE.md)
3. Read [ALL_NIGHT_FEATURES.md](./ALL_NIGHT_FEATURES.md)

### System Administrators
1. Read [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Review [PLACEHOLDER_DATA_README.md](./PLACEHOLDER_DATA_README.md)
3. Check [MORNING_READINESS.md](./MORNING_READINESS.md)

---

## 📊 Documentation Structure

```
docs/
├── README.md                   # This file - documentation index
├── TESTING.md                  # Testing guide
├── HYBRID_DB_ARCHITECTURE.md  # Database design
├── OVERNIGHT_SUMMARY_FINAL.md  # Complete feature list
├── TASK_SCHEDULE.md            # Development roadmap
├── QUICK_START.md              # Quick start guide
├── SETUP_GUIDE.md              # Detailed setup
├── FEATURE_BACKLOG.md          # Planned features
├── POLISH_WISHLIST.md         # UI improvements
└── ...                        # Additional documentation
```

---

## 🔍 Common Questions

**Q: How do I set up the platform?**
A: Start with [QUICK_START.md](./QUICK_START.md)

**Q: How does the database work?**
A: Read [HYBRID_DB_ARCHITECTURE.md](./HYBRID_DB_ARCHITECTURE.md)

**Q: What features are planned?**
A: Check [TASK_SCHEDULE.md](./TASK_SCHEDULE.md)

**Q: How do I test the platform?**
A: Follow [TESTING.md](./TESTING.md)

---

## 📝 Contributing to Documentation

When updating documentation:
1. Keep it simple and clear
2. Include code examples
3. Add diagrams where helpful
4. Update this index for new docs

---

## 🚀 Quick Reference

### Setup Commands
```bash
npm install
npm start
```

### Testing
```bash
# Run tests
node ../test.js

# Load sample data
node ../scripts/load_placeholder_data.js

# Generate fake data
node ../scripts/generate_fake_data.js
```

### Database
```bash
# Check database
sqlite3 ../cars.db "SELECT COUNT(*) FROM vehicles;"

# Reset database
rm ../cars.db
npm start
```

---

**Need help?** Check the [Main README](../README.md) or review the relevant documentation above.
