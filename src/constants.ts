/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, User, SchedulingPersonnel, TicketStatus, Priority, TimelineEvent, Product } from './types';

export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  hover: string;
  light: string;
  accent: string;
}

export const GRANDTECH_THEME = {
  id: 'grandtech',
  name: '大綜紅',
  primary: '#C41230', // GrandTech Red
  hover: '#A30F28',   
  light: '#FEE2E2',   
  accent: '#EF4444',  
};

export const COLORS = {
  primary: '#0F172A', // Slate-900
  success: '#10B981', // Emerald-500
  warning: '#F59E0B', // Amber-500
  danger: '#EF4444',  // Red-500
  bg: '#F8FAFC',      // Slate-50
} as const;

export const DUMMY_USERS: User[] = [
  { id: '1', name: '王小明', role: 'admin' },
  { id: '2', name: '陳大文', role: 'technician' },
  { id: '3', name: '李美華', role: 'technician' },
  { id: '4', name: '張志誠', role: 'technician' },
];

export const PRODUCT_CATALOG: Product[] = [
  { id: 'PROD-001', name: 'HPE Server PSU', model: '800W Flex Slot Platinum', category: 'Power Supply' },
  { id: 'PROD-002', name: 'Notebook RAM DDR5', model: 'Samsung 16GB 4800MHz', category: 'Memory' },
  { id: 'PROD-003', name: 'NVMe Gen4 SSD', model: 'Micron 7450 PRO 1.92TB', category: 'Storage' },
  { id: 'PROD-004', name: 'Server Motherboard', model: 'Dell PowerEdge R750', category: 'Motherboard' },
  { id: 'PROD-005', name: 'Server CPU', model: 'Intel Xeon Gold 6330', category: 'Processor' },
  { id: 'PROD-006', name: 'Notebook Battery', model: 'Dell Latitude 68Wh 4-Cell', category: 'Battery' },
  { id: 'PROD-007', name: 'Notebook LCD Panel', model: '14" FHD IPS Non-Touch', category: 'Display' },
  { id: 'PROD-008', name: 'SAS HDD 10K', model: 'Seagate Exos 1.2TB', category: 'Storage' },
];

const generateTickets = (count: number): Ticket[] => {
  const titles = [
    'Dell PowerEdge R750 伺服器異常重啟',
    'HP ProLiant DL380 磁碟陣列報錯',
    'Dell Latitude 5430 型電筆電無法充電',
    'ThinkPad X1 Carbon 螢幕破裂更換',
    '伺服器風扇轉速過高警告',
    '筆記型電腦鍵盤部分按鍵失靈',
    'Server PSU 冗餘電源故障',
    'Notebook 觸控板點擊無反應'
  ];
  const customers = ['台積電 (TSMC)', '聯發科 (MediaTek)', '鴻海精密', '快速科技', '宏達電子', '全球物流', '雲端整合', '數位未來'];
  const statuses: TicketStatus[] = ['pending', 'processing', 'quoting', 'delivering', 'completed', 'cancelled'];
  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];

  return Array.from({ length: count }, (_, i) => {
    const id = `TK-${String(i + 1).padStart(3, '0')}`;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0);

    const event: TimelineEvent = {
      id: `e-${id}-1`,
      type: 'created',
      content: '報修單已建立',
      timestamp: date,
      actor: { name: '系統', role: 'system' }
    };

    const isNotebook = titles[i % titles.length].includes('筆電') || titles[i % titles.length].includes('Notebook') || titles[i % titles.length].includes('ThinkPad');

    return {
      id,
      title: titles[Math.floor(Math.random() * titles.length)],
      description: isNotebook 
        ? '客戶報修筆電無法正常開機，插上變壓器後充電燈號未亮。初步懷疑是主機板電源迴路或電池故障。'
        : '伺服器機房監視系統回報機箱內部溫度過高，登入 iDRAC 查看發現其一冗餘電源供應器失效，需更換。',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      assignedTo: Math.random() > 0.5 ? ['2'] : [],
      createdAt: date,
      updatedAt: date,
      events: [event],
      
      // Reporter
      customerName: customers[Math.floor(Math.random() * customers.length)],
      customerPhone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      customerExtension: `#${Math.floor(1000 + Math.random() * 9000)}`,
      customerEmail: 'service@corp.com.tw',
      creatorName: '系統管理員',
      
      // Equipment
      deviceSN: isNotebook ? `LATE-${Math.floor(1000 + Math.random() * 9000)}` : `SERV-${Math.floor(1000 + Math.random() * 9000)}`,
      deviceType: isNotebook ? 'Notebook' : 'Server',
      deviceId: `${isNotebook ? 'NB' : 'SRV'}-${String(i + 1).padStart(3, '0')}`,
      deviceName: isNotebook ? '筆記型電腦' : '機架式伺服器',
      deviceBrand: isNotebook ? 'Dell/Lenovo' : 'Dell/HPE',
      deviceModel: isNotebook ? 'Professional Series' : 'Enterprise Series',
      warrantyEndDate: '2027/12/31',
      siteCode: 'F18A',
      
      // Parts - Splitting into individual items
      parts: [
        { 
          id: 'p1', 
          name: isNotebook ? 'Notebook Battery' : 'Server PSU', 
          serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`, 
          quantity: 1, 
          status: 'replacing' as const, 
          replacedPartName: isNotebook ? 'Notebook Battery (New)' : 'HPE Server PSU (New)', 
          replacedSerialNumber: `RP-${Math.floor(100000 + Math.random() * 900000)}`,
          inspectionNote: '蓄電能力下降或電壓輸出不穩'
        },
        { 
          id: 'p2', 
          name: isNotebook ? 'RAM Stick #1' : 'HDD Tray #1', 
          serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`, 
          quantity: 1, 
          status: 'inspecting' as const,
          inspectionNote: '預防性檢測'
        }
      ]
    };
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const INITIAL_TICKETS: Ticket[] = generateTickets(75);

const generateScheduling = (): SchedulingPersonnel[] => {
  const today = new Date();
  const getRelativeDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  };

  return [
    {
      id: 's1',
      name: '陳大文',
      employeeId: 'GT-001',
      jobTitle: '資深技術工程師',
      email: 'david.chen@grandtech.com',
      phone: '0912-345-678',
      dutyDate: getRelativeDate(-2),
      dutyTime: '平日/日間'
    },
    {
      id: 's2',
      name: '李美華',
      employeeId: 'GT-005',
      jobTitle: '網路工程師',
      email: 'grace.li@grandtech.com',
      phone: '0922-445-556',
      dutyDate: getRelativeDate(0),
      dutyTime: '平日/夜間'
    },
    {
      id: 's3',
      name: '張志誠',
      employeeId: 'GT-012',
      jobTitle: '系統工程師',
      email: 'jason.chang@grandtech.com',
      phone: '0933-111-222',
      dutyDate: getRelativeDate(3),
      dutyTime: '假日/日間'
    },
    {
      id: 's4',
      name: '林智慧',
      employeeId: 'GT-018',
      jobTitle: '韌體工程師',
      email: 'sophia.lin@grandtech.com',
      phone: '0944-555-666',
      dutyDate: getRelativeDate(5),
      dutyTime: '假日/夜間'
    },
    {
      id: 's5',
      name: '王小芬',
      employeeId: 'GT-022',
      jobTitle: '技術專員',
      email: 'penny.wang@grandtech.com',
      phone: '0955-111-333',
      dutyDate: getRelativeDate(-8),
      dutyTime: '平日/日間'
    }
  ];
};

export const DUMMY_SCHEDULING: SchedulingPersonnel[] = generateScheduling();
