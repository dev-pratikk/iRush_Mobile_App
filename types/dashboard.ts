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
