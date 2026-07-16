# notifications

Phase 9. `notificationService.emit(event, payload)` called from domain services in Phases 4-8 (booking created, technician assigned, payment success, service completed, claim approved, escalation raised) rather than ad-hoc writes. Delivery over Socket.IO + read/unread state. See BACKEND_CONTEXT.md §3.12.
