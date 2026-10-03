import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:30000,
  expect:{timeout:8000},
  fullyParallel:false,
  retries:1,
  reporter:'line',
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  webServer:{
    command:'python3 -m http.server 4173 --bind 127.0.0.1',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:20000,
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:768}}},
    {name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:412,height:915}}},
  ],
});
