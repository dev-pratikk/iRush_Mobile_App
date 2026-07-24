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
    label: 'Open Orders',
    icon: 'cart-outline',
    color: '#7b7979ff',
    subtitle: 'Today\'s Open Orders',
    subtitleValues: {
      today: 'Today\'s Open Orders',
      month: 'This Month',
      year: 'This Year\'s Open Orders',
    },
    values: {
      today: 24,
      month: 100,
      year: 1879,
    },
  },
  {
    label: 'Orders',
    icon: 'cube-outline',
    color: '#7b7979ff',
    subtitle: 'Today\'s Orders',
    subtitleValues: {
      today: 'Today\'s Orders',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 16,
      month: 200,
      year: 1879,
    },
  },
  {
    label: 'Quotes',
    icon: 'document-text-outline',
    color: '#7b7979ff',
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
    label: 'New Customers',
    icon: 'people-outline',
    color: '#7b7979ff',
    subtitle: 'Today\'s Customers',
    subtitleValues: {
      today: 'Today\'s Customers',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 2,
      month: 33,
      year: 230,
    },
  },
  {
    label: 'Invoices',
    icon: 'receipt-outline',
    color: '#7b7979ff',
    subtitle: 'Today\'s Invoices',
    subtitleValues: {
      today: 'Today\'s Invoices',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 22,
      month: 205,
      year: 2314,
    },
  },
  {
    label: 'Payments',
    icon: 'wallet-outline',
    color: '#7b7979ff',
    subtitle: 'Today\'s Payments',
    subtitleValues: {
      today: 'Today\'s Payments',
      month: 'This Month',
      year: 'This Year',
    },
    values: {
      today: 14,
      month: 193,
      year: 2114,
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
