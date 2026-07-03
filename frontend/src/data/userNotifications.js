// Simulated user notification feed — mirrors the PRD notification triggers.
// Shared between the Notifications feed and the NotificationDetail screen.

export const USER_NOTIFICATIONS = [
  {
    id: 'n5',
    type: 'tracking',
    title: 'Technician En Route',
    message: 'Rahul Sharma is on the way for your AC Repair. Track his live location and ETA.',
    detail:
      'Your technician has started the journey to your location. You can follow the live map, see the estimated time of arrival and contact him securely via a masked number.',
    time: 'Just now',
    read: false,
    cta: { label: 'Track Live', route: '/tracking' },
  },
  {
    id: 'n4',
    type: 'assigned',
    title: 'Technician Assigned',
    message: 'Rahul Sharma (4.8★) has been assigned to request #NCC1043.',
    detail:
      'Based on proximity, skill match and availability, Rahul Sharma has been assigned to your AC Repair request. He will reach out shortly.',
    time: '8 min ago',
    read: false,
    cta: { label: 'View Request', route: '/my-bookings' },
  },
  {
    id: 'n3',
    type: 'created',
    title: 'Request Created',
    message: 'Your AC Repair request #NCC1043 has been created successfully.',
    detail:
      'We have received your service request. Warranty eligibility has been checked and a technician is being assigned to you now.',
    time: '12 min ago',
    read: true,
    cta: { label: 'View Request', route: '/my-bookings' },
  },
  {
    id: 'n2',
    type: 'payment',
    title: 'Payment Successful',
    message: '₹1,499 paid for Washing Machine service. Invoice is ready.',
    detail:
      'Your payment of ₹1,499 for the Washing Machine repair was successful. A receipt has been generated and emailed to you.',
    time: 'Yesterday',
    read: true,
    cta: { label: 'View Invoice', route: '/my-bookings' },
  },
  {
    id: 'n1',
    type: 'completed',
    title: 'Service Completed',
    message: 'Your Washing Machine service was completed. Rate your experience.',
    detail:
      'The technician has marked your Washing Machine service as complete. Please share your feedback to help us improve.',
    time: 'Yesterday',
    read: true,
    cta: { label: 'Rate Service', route: '/partner-warranty/rate-service' },
  },
];
