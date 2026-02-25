/**
 * ISO 27001:2022 Framework
 * ISO 27001:2022 合規框架
 *
 * Based on ISO/IEC 27001:2022 Annex A controls.
 * 基於 ISO/IEC 27001:2022 附錄 A 控制項。
 *
 * @module @openclaw/panguard-report/frameworks/iso27001
 */

import type { ComplianceControl } from '../types.js';

/**
 * ISO 27001:2022 Annex A controls (key controls)
 * ISO 27001:2022 附錄 A 控制項（關鍵控制項）
 */
export const ISO27001_CONTROLS: ComplianceControl[] = [
  {
    controlId: 'A.5.1',
    category: 'organizational',
    titleEn: 'Policies for Information Security',
    titleZh: '資訊安全政策',
    descriptionEn: 'A set of policies for information security shall be defined, approved by management, published, and communicated.',
    descriptionZh: '應定義一套資訊安全政策，經管理層核准、公布並傳達。',
    relatedCategories: ['policy', 'governance'],
  },
  {
    controlId: 'A.5.15',
    category: 'access_control',
    titleEn: 'Access Control',
    titleZh: '存取控制',
    descriptionEn: 'Rules to control physical and logical access to information shall be established and implemented.',
    descriptionZh: '應建立並實施控制資訊實體及邏輯存取的規則。',
    relatedCategories: ['access', 'authentication', 'password'],
  },
  {
    controlId: 'A.5.23',
    category: 'cloud_security',
    titleEn: 'Information Security for Use of Cloud Services',
    titleZh: '雲端服務的資訊安全',
    descriptionEn: 'Processes for acquisition, use, management, and exit from cloud services shall be established.',
    descriptionZh: '應建立雲端服務的取得、使用、管理及退出程序。',
    relatedCategories: ['cloud', 'network', 'system'],
  },
  {
    controlId: 'A.6.1',
    category: 'people',
    titleEn: 'Screening',
    titleZh: '人員審查',
    descriptionEn: 'Background verification checks on candidates shall be carried out prior to employment.',
    descriptionZh: '應在僱用前對候選人進行背景驗證。',
    relatedCategories: ['personnel', 'access'],
  },
  {
    controlId: 'A.7.1',
    category: 'physical',
    titleEn: 'Physical Security Perimeters',
    titleZh: '實體安全邊界',
    descriptionEn: 'Security perimeters shall be defined and used to protect areas containing information.',
    descriptionZh: '應定義並使用安全邊界來保護包含資訊的區域。',
    relatedCategories: ['physical', 'access'],
  },
  {
    controlId: 'A.8.1',
    category: 'technology',
    titleEn: 'User Endpoint Devices',
    titleZh: '使用者端點裝置',
    descriptionEn: 'Information stored on, processed by, or accessible via user endpoint devices shall be protected.',
    descriptionZh: '應保護儲存在使用者端點裝置上、由其處理或可透過其存取的資訊。',
    relatedCategories: ['system', 'endpoint', 'device'],
  },
  {
    controlId: 'A.8.5',
    category: 'authentication',
    titleEn: 'Secure Authentication',
    titleZh: '安全驗證',
    descriptionEn: 'Secure authentication technologies and procedures shall be established and implemented.',
    descriptionZh: '應建立並實施安全驗證技術及程序。',
    relatedCategories: ['authentication', 'password', 'access'],
  },
  {
    controlId: 'A.8.8',
    category: 'vulnerability',
    titleEn: 'Management of Technical Vulnerabilities',
    titleZh: '技術弱點管理',
    descriptionEn: 'Information about technical vulnerabilities shall be obtained timely, and appropriate measures taken.',
    descriptionZh: '應及時取得技術弱點資訊，並採取適當措施。',
    relatedCategories: ['vulnerability', 'updates', 'patch'],
  },
  {
    controlId: 'A.8.15',
    category: 'logging',
    titleEn: 'Logging',
    titleZh: '日誌記錄',
    descriptionEn: 'Logs that record activities, exceptions, faults, and other relevant events shall be produced and protected.',
    descriptionZh: '應產生並保護記錄活動、例外、故障及其他相關事件的日誌。',
    relatedCategories: ['logging', 'monitoring', 'audit'],
  },
  {
    controlId: 'A.8.16',
    category: 'monitoring',
    titleEn: 'Monitoring Activities',
    titleZh: '監控活動',
    descriptionEn: 'Networks, systems, and applications shall be monitored for anomalous behaviour.',
    descriptionZh: '應監控網路、系統及應用程式的異常行為。',
    relatedCategories: ['monitoring', 'network', 'system'],
  },
  {
    controlId: 'A.8.20',
    category: 'network',
    titleEn: 'Network Security',
    titleZh: '網路安全',
    descriptionEn: 'Networks and network devices shall be secured, managed, and controlled.',
    descriptionZh: '應保護、管理及控制網路及網路裝置。',
    relatedCategories: ['network', 'firewall'],
  },
  {
    controlId: 'A.8.24',
    category: 'cryptography',
    titleEn: 'Use of Cryptography',
    titleZh: '密碼學使用',
    descriptionEn: 'Rules for the effective use of cryptography shall be defined and implemented.',
    descriptionZh: '應定義並實施有效使用密碼學的規則。',
    relatedCategories: ['encryption', 'certificate', 'tls'],
  },
];
