// Legal Configuration & Compliance Metadata for quanlicanhan.online
// Fully compliant with Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân), GDPR, CCPA & WCAG 2.1 AA

export const LEGAL_CONFIG = {
  appName: 'LifeOS',
  appDomain: 'quanlicanhan.online',
  appUrl: 'https://quanlicanhan.online',
  ownerName: (import.meta as any).env?.VITE_OWNER_NAME || 'LifeOS Technologies',
  taxId: (import.meta as any).env?.VITE_TAX_ID || '',
  headquarters: (import.meta as any).env?.VITE_ADDRESS || '',
  hotline: (import.meta as any).env?.VITE_HOTLINE || '',
  supportEmail: 'adminteamdaniel@gmail.com',
  dpoEmail: 'adminteamdaniel@gmail.com',
  dataProtectionOfficer: 'Ban Hỗ Trợ Kỹ Thuật LifeOS',
  effectiveDate: '01/07/2023',
  lastUpdated: '02/11/2026',
  applicableLaws: [
    'Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân (Việt Nam)',
    'Luật An ninh mạng số 24/2018/QH14 (Việt Nam)',
    'Luật Giao dịch điện tử số 20/2023/QH15 (Việt Nam)',
    'General Data Protection Regulation (GDPR - EU 2016/679)',
    'California Consumer Privacy Act (CCPA / CPRA)'
  ]
};
