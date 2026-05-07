/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TicketStatus = 'pending' | 'processing' | 'quoting' | 'delivering' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface TimelineEvent {
  id: string;
  type: 'status_change' | 'note' | 'assignment' | 'created';
  content: string;
  timestamp: Date;
  actor: {
    name: string;
    role: string;
  };
}

export type PartStatus = 'inspecting' | 'repairing' | 'replacing' | 'functional';

export interface Part {
  id: string;
  name: string;
  serialNumber: string;
  quantity: number;
  replacedPartName?: string;
  replacedSerialNumber?: string;
  inspectionNote?: string;
  status: PartStatus;
}

export interface Product {
  id: string;
  name: string;
  model: string;
  category: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  assignedTo: string[]; // User IDs or Names
  createdAt: Date;
  updatedAt: Date;
  events: TimelineEvent[];

  // Reporter info
  customerName: string;
  customerPhone: string;
  customerExtension: string;
  customerEmail: string;
  creatorName: string;

  // Equipment info
  deviceSN: string;
  deviceType: string;
  deviceId: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  warrantyEndDate: string;
  siteCode: string;

  // Parts info
  parts: Part[];
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'technician' | 'support';
  avatar?: string;
}

export type DutyTimeType = '平日/日間' | '平日/夜間' | '假日/日間' | '假日/夜間';

export interface SchedulingPersonnel {
  id: string;
  name: string;
  employeeId: string;
  jobTitle: string;
  email: string;
  phone: string;
  dutyDate: string;
  dutyTime: DutyTimeType;
}
