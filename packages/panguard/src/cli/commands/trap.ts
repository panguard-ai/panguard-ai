/**
 * panguard trap - Honeypot system (Coming Soon)
 * panguard trap - 蜜罐系統（即將推出）
 */

import { Command } from 'commander';

const COMING_SOON_MSG = `
  Honeypot System — Coming Soon

  Decoy services (SSH, HTTP, FTP) to detect and profile
  attackers are under active development.

  Follow progress: https://github.com/panguard-ai/panguard-ai

  ---
  蜜罐系統 — 即將推出

  誘餌服務（SSH、HTTP、FTP）偵測與分析攻擊者功能開發中。

  追蹤進度: https://github.com/panguard-ai/panguard-ai
`;

export function trapCommand(): Command {
  const cmd = new Command('trap').description(
    '[Coming Soon] Honeypot system / [即將推出] 蜜罐系統'
  );

  cmd
    .command('start')
    .description('Start honeypot services / 啟動蜜罐服務')
    .option('--services <types>', 'Comma-separated service types (ssh,http,ftp,...)')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .option('--no-cloud', 'Disable Threat Cloud upload')
    .action(async () => {
      console.log(COMING_SOON_MSG);
    });

  cmd
    .command('stop')
    .description('Stop honeypot services / 停止蜜罐服務')
    .action(async () => {
      console.log(COMING_SOON_MSG);
    });

  cmd
    .command('status')
    .description('Show current status / 顯示目前狀態')
    .action(async () => {
      console.log(COMING_SOON_MSG);
    });

  cmd
    .command('config')
    .description('Show configuration / 顯示配置')
    .option('--services <types>', 'Comma-separated service types')
    .action(async () => {
      console.log(COMING_SOON_MSG);
    });

  cmd
    .command('profiles')
    .description('Show attacker profiles / 顯示攻擊者 profiles')
    .action(async () => {
      console.log(COMING_SOON_MSG);
    });

  cmd
    .command('intel')
    .description('Show threat intelligence / 顯示威脅情報')
    .action(async () => {
      console.log(COMING_SOON_MSG);
    });

  return cmd;
}
