import { Ionicons } from '@expo/vector-icons';

export interface TimePeriodValue {
  today: string | number;
  month: string | number;
  year: string | number;
}

export interface Kpi {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  values: TimePeriodValue;
  subtitle: string;
  subtitleValues: {
    today: string;
    month: string;
    year: string;
  };
}

export type DatePeriod = 'today' | 'month' | 'year';

export const DASHBOARD_KPIS: Kpi[] = [
  {
    label: 'Orders',
    icon: 'cube-outline',
    color: '#7b7979ff',
    subtitle: 'Orders',
    subtitleValues: {
      today: 'Today\'s Orders',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 0,
      month: 0,
      year: 0,
    },
  },
  {
    label: 'Quotes',
    icon: 'document-text-outline',
    color: '#7b7979ff',
    subtitle: 'Quotes',
    subtitleValues: {
      today: 'Today\'s Quotes',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 0,
      month: 0,
      year: 0,
    },
  },
  {
    label: 'New Customers',
    icon: 'people-outline',
    color: '#7b7979ff',
    subtitle: 'New Customers',
    subtitleValues: {
      today: 'Today\'s New Customers',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 0,
      month: 0,
      year: 0,
    },
  },
  {
    label: 'Invoices',
    icon: 'receipt-outline',
    color: '#7b7979ff',
    subtitle: 'Invoices',
    subtitleValues: {
      today: 'Today\'s Invoices',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 0,
      month: 0,
      year: 0,
    },
  },
];

export const QUOTES_KPIS: Kpi[] = [
  {
    label: 'Quotes Today',
    icon: 'document-text-outline',
    color: '#F59E0B',
    subtitle: 'Today\'s Quotes',
    subtitleValues: {
      today: 'Today\'s Quotes',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 19,
      month: 393,
      year: 3689,
    },
  },
  {
    label: 'Quotes Pending',
    icon: 'time-outline',
    color: '#F59E0B',
    subtitle: 'Pending Quotes',
    subtitleValues: {
      today: 'Pending Quotes',
      month: 'Pending Quotes',
      year: 'Pending Quotes',
    },
    values: {
      today: 3,
      month: 5,
      year: 8,
    },
  },
];

export const OPEN_ORDERS_KPIS: Kpi[] = [
  {
    label: 'Open Orders',
    icon: 'cart-outline',
    color: '#E53935',
    subtitle: 'Open Orders',
    subtitleValues: {
      today: 'Open Orders',
      month: 'Open Orders',
      year: 'Open Orders',
    },
    values: {
      today: 16,
      month: 200,
      year: 1879,
    },
  },
  {
    label: 'Open Orders Value',
    icon: 'cash-outline',
    color: '#22C55E',
    subtitle: 'Open Value',
    subtitleValues: {
      today: 'Open Value',
      month: 'Open Value',
      year: 'Open Value',
    },
    values: {
      today: '$154,973.10',
      month: '$1,542,076.46',
      year: '$18,644,889.52',
    },
  },
];

export interface OrderDetailItem {
  orderNumber: string;
  companyName: string;
  vendorsCompleted: number;
  vendorsTotal: number;
  daysLeft: number;
  amount: number;
  pendingAmount: number;
  orderDate: string;
  status: 'On track' | 'Due Soon' | 'Overdue';
}

export interface OrdersDetailList {
  count: number;
  totalAmount: number;
  items: OrderDetailItem[];
}

export const PENDING_ORDERS_DETAILS: OrdersDetailList = {
  count: 241,
  totalAmount: 3817184,
  items: [
    {
      orderNumber: '483069',
      companyName: 'Ecolab Inc.',
      vendorsCompleted: 0,
      vendorsTotal: 3,
      daysLeft: 29,
      amount: 7905.0,
      pendingAmount: 7905.0,
      orderDate: '2026-07-27',
      status: 'On track',
    },
    {
      orderNumber: '483068',
      companyName: 'Precision Neuroscience',
      vendorsCompleted: 0,
      vendorsTotal: 1,
      daysLeft: 8,
      amount: 4400.0,
      pendingAmount: 4400.0,
      orderDate: '2026-07-27',
      status: 'On track',
    },
    {
      orderNumber: '483067',
      companyName: 'Inkspace Imaging',
      vendorsCompleted: 0,
      vendorsTotal: 1,
      daysLeft: 10,
      amount: 431.84,
      pendingAmount: 431.84,
      orderDate: '2026-07-27',
      status: 'On track',
    },
    {
      orderNumber: '483064',
      companyName: 'Truman Robotics',
      vendorsCompleted: 0,
      vendorsTotal: 3,
      daysLeft: 15,
      amount: 3108.39,
      pendingAmount: 3108.39,
      orderDate: '2026-07-27',
      status: 'On track',
    },
    {
      orderNumber: '483061',
      companyName: 'Truman Robotics',
      vendorsCompleted: 0,
      vendorsTotal: 3,
      daysLeft: 15,
      amount: 2483.69,
      pendingAmount: 2483.69,
      orderDate: '2026-07-27',
      status: 'On track',
    },
    {
      orderNumber: '483058',
      companyName: 'Teledyne Gavia',
      vendorsCompleted: 0,
      vendorsTotal: 3,
      daysLeft: 15,
      amount: 8950.0,
      pendingAmount: 8950.0,
      orderDate: '2026-07-27',
      status: 'On track',
    },
    {
      orderNumber: '483057',
      companyName: 'Fulcrum Acoustic, LLC',
      vendorsCompleted: 0,
      vendorsTotal: 1,
      daysLeft: 15,
      amount: 650.0,
      pendingAmount: 650.0,
      orderDate: '2026-07-27',
      status: 'On track',
    },
  ],
};

export const PARTIAL_ORDERS_DETAILS: OrdersDetailList = {
  count: 8,
  totalAmount: 6601.54,
  items: [
    {
      orderNumber: '482979',
      companyName: 'Ironsite AI (IRO002)',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: 2,
      amount: 887.1,
      pendingAmount: 600.1,
      orderDate: '2026-07-22',
      status: 'Due Soon',
    },
    {
      orderNumber: '482663',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 1069.92,
      pendingAmount: 1025.34,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
    {
      orderNumber: '482662',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 1089.9,
      pendingAmount: 1053.57,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
    {
      orderNumber: '482661',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 1179.84,
      pendingAmount: 1130.68,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
    {
      orderNumber: '482660',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 359.92,
      pendingAmount: 343.56,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
    {
      orderNumber: '482659',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 590.1,
      pendingAmount: 562.0,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
    {
      orderNumber: '482658',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 904.8,
      pendingAmount: 867.1,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
    {
      orderNumber: '482657',
      companyName: 'Higher Ground, LLC',
      vendorsCompleted: 1,
      vendorsTotal: 1,
      daysLeft: -11,
      amount: 519.96,
      pendingAmount: 501.39,
      orderDate: '2026-07-08',
      status: 'Overdue',
    },
  ],
};
