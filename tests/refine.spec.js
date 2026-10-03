import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-open-auth]',{state:'visible'});
  await page.waitForFunction(()=>document.documentElement.dataset.avessoRefine==='20261003-v2');
  await page.waitForFunction(()=>document.documentElement.dataset.avessoStoryVideoFix==='20261003-v2');
});

test('identidade tipográfica combina display moderno, terminal e pixel',async({page})=>{
  const fonts=await page.evaluate(()=>({
    display:getComputedStyle(document.documentElement).getPropertyValue('--avesso-display').trim(),
    ui:getComputedStyle(document.documentElement).getPropertyValue('--avesso-ui').trim(),
    pixel:getComputedStyle(document.documentElement).getPropertyValue('--avesso-pixel').trim(),
    heading:getComputedStyle(document.querySelector('.hero h1')).fontFamily,
    brand:getComputedStyle(document.querySelector('.site-header .brand>span:nth-child(2)')).fontFamily
  }));
  expect(fonts.display).toContain('Space Grotesk');
  expect(fonts.ui).toContain('IBM Plex Mono');
  expect(fonts.pixel).toContain('Press Start 2P');
  expect(fonts.heading).toContain('Space Grotesk');
  expect(fonts.brand).toContain('Press Start 2P');
});

test('sidebar recolhida vira coluna de ícones sem texto vazando',async({page})=>{
  await page.setViewportSize({width:1760,height:833});
  await page.evaluate(()=>{
    document.querySelector('#marketing-view')?.classList.add('hidden');
    document.querySelector('.site-header')?.classList.add('hidden');
    document.querySelector('#app-view')?.classList.remove('hidden');
    document.body.classList.add('desktop-nav-collapsed');
  });
  const metrics=await page.evaluate(()=>{
    const nav=document.querySelector('.app-nav');
    const button=document.querySelector('.app-nav nav button');
    const icon=button?.querySelector('.desktop-nav-icon');
    return {
      navWidth:parseFloat(getComputedStyle(nav).width),
      buttonWidth:parseFloat(getComputedStyle(button).width),
      buttonFont:parseFloat(getComputedStyle(button).fontSize),
      iconFont:parseFloat(getComputedStyle(icon).fontSize),
      overflowX:getComputedStyle(nav).overflowX
    };
  });
  expect(metrics.navWidth).toBe(88);
  expect(metrics.buttonWidth).toBe(52);
  expect(metrics.buttonFont).toBe(0);
  expect(metrics.iconFont).toBeGreaterThanOrEqual(16);
  expect(['clip','hidden']).toContain(metrics.overflowX);
});

test('player de Story recebe controles, preload e camada de clique correta',async({page})=>{
  const result=await page.evaluate(async()=>{
    const stage=document.createElement('div');
    stage.className='story-stage has-video';
    const video=document.createElement('video');
    video.className='story-video';
    stage.appendChild(video);
    document.body.appendChild(stage);
    await new Promise(resolve=>setTimeout(resolve,80));
    const style=getComputedStyle(video);
    return {
      preload:video.preload,
      controls:video.controls,
      playsInline:video.playsInline,
      pointerEvents:style.pointerEvents,
      zIndex:style.zIndex
    };
  });
  expect(result.preload).toBe('auto');
  expect(result.controls).toBe(true);
  expect(result.playsInline).toBe(true);
  expect(result.pointerEvents).toBe('auto');
  expect(result.zIndex).toBe('3');
});
