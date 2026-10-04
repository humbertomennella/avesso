import { test, expect } from '@playwright/test';

async function openApp(page){
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.avessoWorld==='20261004-world1');
  await page.evaluate(()=>{
    document.querySelector('#marketing-view')?.classList.add('hidden');
    document.querySelector('.site-header')?.classList.add('hidden');
    document.querySelector('#app-view')?.classList.remove('hidden');
  });
}

test('World Redesign cria palco contextual e identifica o distrito atual',async({page})=>{
  await openApp(page);
  const bar=page.locator('.world-zone-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('.world-zone-title')).toContainText(/Para cuidar/i);
  await expect(page.locator('body')).toHaveAttribute('data-world-zone','feed');
  await expect(page.locator('.avesso-world-backdrop')).toHaveCount(1);
  await expect(page.locator('.world-broadcast')).toHaveCount(1);
});

test('navegação altera a zona do mundo sem substituir os controles reais',async({page})=>{
  await openApp(page);
  const plaza=page.locator('.app-nav [data-app-tab="plaza"]');
  await expect(plaza).toHaveCount(1);
  await plaza.click();
  await expect(page.locator('body')).toHaveAttribute('data-world-zone','plaza');
  await expect(page.locator('.world-zone-title')).toContainText(/Praça Central/i);
  await expect(plaza).toHaveAttribute('data-world-current','');
});

test('desktop recolhido preserva rail funcional no novo mundo',async({page})=>{
  await page.setViewportSize({width:1760,height:833});
  await openApp(page);
  await page.evaluate(()=>document.body.classList.add('desktop-nav-collapsed'));
  const metrics=await page.evaluate(()=>{
    const nav=document.querySelector('.app-nav');
    const button=document.querySelector('.app-nav nav button');
    return {
      nav:parseFloat(getComputedStyle(nav).width),
      buttonW:parseFloat(getComputedStyle(button).width),
      buttonH:parseFloat(getComputedStyle(button).height),
      justify:getComputedStyle(button).justifyItems
    };
  });
  expect(metrics.nav).toBe(76);
  expect(metrics.buttonW).toBe(50);
  expect(metrics.buttonH).toBe(44);
  expect(metrics.justify).toBe('center');
});

test('mobile usa navegação horizontal própria e mantém palco sem overflow',async({page,isMobile})=>{
  test.skip(!isMobile,'validação exclusiva dos projetos mobile');
  await openApp(page);
  const metrics=await page.evaluate(()=>{
    const nav=document.querySelector('.app-nav nav');
    const feed=document.querySelector('.feed-column');
    return {
      navDisplay:getComputedStyle(nav).display,
      navOverflow:getComputedStyle(nav).overflowX,
      feedWidth:feed.getBoundingClientRect().width,
      viewport:document.documentElement.clientWidth,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
  });
  expect(metrics.navDisplay).toBe('flex');
  expect(['auto','scroll']).toContain(metrics.navOverflow);
  expect(metrics.feedWidth).toBeLessThanOrEqual(metrics.viewport+2);
  expect(metrics.overflow).toBeLessThanOrEqual(2);
});
