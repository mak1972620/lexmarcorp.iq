import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'abogado' | 'cliente';
}

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  rfc: string;
  type: 'fisica' | 'moral';
}

export interface Case {
  id: number;
  title: string;
  description: string;
  client_id: number;
  client_name?: string;
  lawyer_id: number;
  lawyer_name?: string;
  type: string;
  court: string;
  case_number: string;
  status: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  case_id: number;
  case_title?: string;
  assigned_to: number;
  assigned_name?: string;
  priority: 'Alta' | 'Media' | 'Baja';
  due_date: string;
  status: string;
  creation_date?: string;
}

export interface Payment {
  id: number;
  case_id: number;
  case_title?: string;
  client_id: number;
  client_name?: string;
  amount: number;
  currency: string;
  concept: string;
  type: 'manual' | 'stripe';
  status: string;
  method: string;
  reference: string;
  notes: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  user_id: number;
  user_name?: string;
  entity: string;
  timestamp: string;
}
