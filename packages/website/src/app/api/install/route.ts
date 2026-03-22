import { NextResponse, type NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get('user-agent') || '';

  // Serve PowerShell script for Windows paths or PowerShell user-agent
  const isWindows =
    path.includes('windows') ||
    path.includes('win') ||
    path.endsWith('.ps1') ||
    ua.includes('PowerShell') ||
    ua.includes('WindowsPowerShell');

  const filename = isWindows ? 'install.ps1' : 'install.sh';
  const script = readFileSync(join(process.cwd(), 'public', filename), 'utf-8');

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
