'use client';

import { useState, useEffect } from 'react';

type OS = 'mac' | 'linux' | 'windows';

const INSTALL_COMMANDS: Record<OS, string> = {
  mac: 'npm install -g @panguard-ai/panguard && pga up',
  linux: 'npm install -g @panguard-ai/panguard && pga up',
  windows: 'npm install -g @panguard-ai/panguard && pga up',
};

const PROMPTS: Record<OS, string> = {
  mac: '$',
  linux: '$',
  windows: '>',
};

export function useOS() {
  const [os, setOS] = useState<OS>('mac');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Win/.test(ua)) setOS('windows');
    else if (/Mac/.test(ua)) setOS('mac');
    else setOS('linux');
  }, []);

  return {
    os,
    installCmd: INSTALL_COMMANDS[os],
    prompt: PROMPTS[os],
  };
}
