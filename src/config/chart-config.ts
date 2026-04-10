// chart-config.js — Dashboard & Analytics chart definitions.
// Data reflects 1 month of real usage (Mar 2026) across 55 users, ~370 fleet vehicles.

export const DASHBOARD_METRICS = [
  {
    id: 'total-rides',
    label: 'Total Rides',
    icon: 'fa-route',
    tone: 'blue',
    primary: '2,608',
    secondary: '+100% vs. pre-launch',
    secondaryTone: 'up',
    breakdown: [
      { label: 'Today',  value: '92' },
      { label: 'Week',   value: '653' },
      { label: 'Month',  value: '2,608' },
    ],
  },
  {
    id: 'active-rides',
    label: 'Active Rides',
    icon: 'fa-bolt',
    tone: 'cyan',
    primary: '55',
    secondary: 'Live now',
    secondaryTone: 'up',
    breakdown: [
      { label: 'Queued',  value: '12' },
      { label: 'Running', value: '43' },
      { label: 'Peak',    value: '38' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: 'fa-indian-rupee-sign',
    tone: 'green',
    primary: '₹2,95,118',
    secondary: '+100% first month',
    secondaryTone: 'up',
    breakdown: [
      { label: 'Today', value: '₹4,514' },
      { label: 'Month', value: '₹2,95,118' },
      { label: 'ARPU',  value: '₹5,366' },
    ],
  },
  {
    id: 'active-users',
    label: 'Active Users',
    icon: 'fa-users',
    tone: 'purple',
    primary: '55',
    secondary: '+100% first month',
    secondaryTone: 'up',
    breakdown: [
      { label: 'Daily',   value: '42' },
      { label: 'Weekly',  value: '55' },
      { label: 'Monthly', value: '55' },
    ],
  },
  {
    id: 'active-vehicles',
    label: 'Active Vehicles',
    icon: 'fa-bicycle',
    tone: 'gold',
    primary: '370',
    secondary: '94.9% fleet ready',
    secondaryTone: 'up',
    breakdown: [
      { label: 'In Use',  value: '55' },
      { label: 'Ready',   value: '296' },
      { label: 'Offline', value: '19' },
    ],
  },
  {
    id: 'issues',
    label: 'Issues Count',
    icon: 'fa-triangle-exclamation',
    tone: 'red',
    primary: '19',
    secondary: 'Needs attention',
    secondaryTone: 'down',
    breakdown: [
      { label: 'Maintenance', value: '12' },
      { label: 'Low Battery', value: '5' },
      { label: 'Escalated',   value: '2' },
    ],
  },
];

export const DASHBOARD_CHARTS = {
  rideTrends: {
    title: 'Ride Trends',
    type: 'line',
    description: 'Weekly ride volume and peak hour demand patterns.',
    icon: 'fa-chart-line',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tabs: ['All', 'Peak'],
    views: {
      All: [
        { label: 'Rides',           data: [112, 108, 115, 109, 106, 64, 42], color: 'brand', fill: true },
        { label: 'Peak Hour Rides', data: [45,  43,  46,  44,  42,  25, 17], color: 'cyan',  fill: false },
      ],
      Peak: [
        { label: 'Peak Hour Rides', data: [45, 43, 46, 44, 42, 25, 17], color: 'cyan', fill: true },
      ],
    },
    yFormatter: 'number',
  },
  revenue: {
    title: 'Revenue',
    type: 'bar',
    description: 'Monthly revenue breakdown by ride and subscription sources.',
    icon: 'fa-coins',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    tabs: ['All', 'Subscription'],
    views: {
      All: [
        { label: 'Ride Revenue',         data: [4800, 18200, 295118, 0, 0, 0, 0], color: 'brand' },
        { label: 'Subscription Revenue', data: [1200,  8400,  75445, 0, 0, 0, 0], color: 'amber' },
      ],
      Subscription: [
        { label: 'Subscription Revenue', data: [1200, 8400, 75445, 0, 0, 0, 0], color: 'amber' },
      ],
    },
    yFormatter: 'currency',
  },
  locationPerf: {
    title: 'Location Perf',
    type: 'bar',
    description: 'Ride completion rate across service locations. Higher % = better service reliability.',
    icon: 'fa-map-location-dot',
    labels: ['North Campus', 'Tech Park', 'Metro Hub', 'City Center', 'East Gate', 'Lake Side'],
    tabs: ['All', 'Top 3'],
    viewLabels: {
      'Top 3': ['North Campus', 'City Center', 'Tech Park'],
    },
    views: {
      All: [
        { label: 'Ride Completion %', data: [94, 91, 88, 86, 93, 89], color: 'violet' },
      ],
      'Top 3': [
        { label: 'Ride Completion %', data: [94, 86, 91], color: 'violet' },
      ],
    },
    yFormatter: 'percent',
  },
  vehicleUtil: {
    title: 'Vehicle Util',
    type: 'pie',
    description: 'Current fleet distribution across operational states. Track utilization and maintenance cycles.',
    icon: 'fa-chart-pie',
    labels: ['Available', 'In Use', 'Maintenance'],
    tabs: ['All', 'In Use', 'Maintenance'],
    views: {
      All: [
        { label: 'Fleet Mix',          data: [296, 55, 19], colors: ['brand', 'cyan', 'red'] },
      ],
      'In Use': [
        { label: 'In Use Mix',         data: [18, 28, 9], labels: ['Cycles', 'E-Bikes', 'Buggies'], colors: ['cyan', 'brand', 'violet'] },
      ],
      Maintenance: [
        { label: 'Maintenance Issues', data: [8, 6, 5], labels: ['Battery', 'Brake', 'Motor'], colors: ['red', 'amber', 'violet'] },
      ],
    },
  },
  userGrowth: {
    title: 'User Growth',
    type: 'line',
    description: 'User acquisition and active engagement trends over time.',
    icon: 'fa-users',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    tabs: ['All', 'New Users', 'Active Users'],
    views: {
      All: [
        { label: 'New Users',    data: [3, 9, 43, 0, 0, 0, 0], color: 'violet', fill: false },
        { label: 'Active Users', data: [3, 12, 55, 0, 0, 0, 0], color: 'brand',  fill: true  },
      ],
      'New Users': [
        { label: 'New Users',    data: [3, 9, 43, 0, 0, 0, 0], color: 'violet', fill: true },
      ],
      'Active Users': [
        { label: 'Active Users', data: [3, 12, 55, 0, 0, 0, 0], color: 'brand',  fill: true },
      ],
    },
    yFormatter: 'number',
  },
  rideDuration: {
    title: 'Ride Duration',
    type: 'line',
    description: 'Average ride length by time period. Helps optimize pricing and vehicle strategy.',
    icon: 'fa-hourglass-end',
    labels: ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
    tabs: ['All', 'Peak', 'Short'],
    views: {
      All: [
        { label: 'Avg Minutes',    data: [8, 14, 11, 12, 16,  9], color: 'blue',  fill: true },
      ],
      Peak: [
        { label: 'Peak Minutes',   data: [11, 18, 14, 15, 22, 12], color: 'amber', fill: true },
      ],
      Short: [
        { label: 'Short Ride Min', data: [6,  8,  7,  8,  9,  6], color: 'brand', fill: true },
      ],
    },
    yFormatter: 'minutes',
  },
  coinUsage: {
    title: 'Coin Usage',
    type: 'bar',
    description: 'In-app currency circulation and redemption patterns.',
    icon: 'fa-coins',
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    tabs: ['All', 'Used', 'Burn Rate'],
    views: {
      All: [
        { label: 'Coins Used',  data: [1840, 2920, 3580, 4120], color: 'brand' },
        { label: 'Burn Rate %', data: [62,   68,   74,   78],   color: 'red',  axis: 'y1' },
      ],
      Used: [
        { label: 'Coins Used',  data: [1840, 2920, 3580, 4120], color: 'brand' },
      ],
      'Burn Rate': [
        { label: 'Burn Rate %', data: [62, 68, 74, 78], color: 'red' },
      ],
    },
    yFormatter: 'number',
    secondaryFormatter: 'percent',
  },
  supportTickets: {
    title: 'Support Tickets',
    type: 'bar',
    description: 'Support requests and resolution trends. Monitor team capacity and common issues.',
    icon: 'fa-headset',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tabs: ['All', 'Resolved'],
    views: {
      All: [
        { label: 'Opened',   data: [12, 8, 11, 9, 14, 5, 3], color: 'red'   },
        { label: 'Resolved', data: [10, 8,  9, 9, 12, 5, 3], color: 'brand' },
      ],
      Resolved: [
        { label: 'Resolved', data: [10, 8, 9, 9, 12, 5, 3], color: 'brand' },
      ],
    },
    yFormatter: 'number',
  },
};

// Monthly new-user signups Jan–Dec 2026 (pilot Jan, soft launch Feb, full launch Mar)
export const ANALYTICS_CHARTS = {
  growth: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data:   [2, 28, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  device: {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    data:   [19, 29, 7],
  },
};
