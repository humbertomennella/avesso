import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-open-auth]',{state:'visible'});
});

test('fluxo de autenticação alterna cadastro e login sem quebrar',async({page})=>{
  await page.locator('.site-header [data-open-auth]').click();
  const dialog=page.locator('#auth-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-auth-mode="login"]')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#signup-fields')).toBeHidden();
  await expect(page.locator('#auth-submit')).toContainText(/entrar/i);

  await page.locator('[data-auth-mode="signup"]').click();
  await expect(page.locator('[data-auth-mode="signup"]')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#signup-fields')).toBeVisible();
  await expect(page.locator('#auth-submit')).toContainText(/canto/i);

  await page.locator('[data-auth-mode="login"]').click();
  await expect(page.locator('#signup-fields')).toBeHidden();
  await expect(page.locator('[data-forgot-password]')).toBeVisible();
});

test('landing e autenticação não criam overflow horizontal',async({page})=>{
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.locator('.site-header [data-open-auth]').click();
  await expect(page.locator('#auth-dialog')).toBeVisible();
  const authOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(authOverflow).toBeLessThanOrEqual(2);
  await expect(page.locator('#auth-submit')).toBeInViewport();
});

test('documentos legais ficam acessíveis também no mobile',async({page})=>{
  await expect(page.locator('.site-footer a[href="PRIVACIDADE.md"]')).toHaveCount(1);
  await page.locator('.site-header [data-open-auth]').click();
  await expect(page.locator('#auth-dialog')).toBeVisible();
  await expect(page.locator('.auth-legal-links a[href="PRIVACIDADE.md"]')).toBeVisible();
  await expect(page.locator('.auth-legal-links a[href="TERMOS.md"]')).toBeVisible();
});

test('vídeo gravado no Story perde parâmetros de codec antes do upload',async({page})=>{
  await page.waitForFunction(()=>globalThis.__avessoStoryRecordedVideoMimeFix===true);
  const result=await page.evaluate(()=>{
    const recorded=new File([new Uint8Array([1,2,3])],'avesso-story-123.webm',{type:'video/webm;codecs=vp8,opus'});
    return {
      recordedType:recorded.type,
      recordedIsFile:recorded instanceof File
    };
  });
  expect(result.recordedType).toBe('video/webm');
  expect(result.recordedIsFile).toBe(true);
});

test('desktop mantém laterais fixas, feed controlado e Story legível',async({page})=>{
  await page.setViewportSize({width:1760,height:833});
  await page.waitForFunction(()=>document.documentElement.dataset.avessoPolish==='20261003-polish8');
  const metrics=await page.evaluate(()=>{
    document.querySelector('#marketing-view')?.classList.add('hidden');
    document.querySelector('.site-header')?.classList.add('hidden');
    const app=document.querySelector('#app-view');
    app?.classList.remove('hidden');

    const shelf=document.createElement('div');
    shelf.className='desktop-chat-shelf';
    document.body.appendChild(shelf);

    const story=document.createElement('div');
    story.className='story-view-card';
    const reactions=document.createElement('div');
    reactions.className='story-reactions';
    const reaction=document.createElement('button');
    reaction.className='story-reaction';
    reaction.innerHTML='<span>♥</span>curti isso';
    reactions.appendChild(reaction);
    story.appendChild(reactions);
    document.body.appendChild(story);

    const nav=getComputedStyle(document.querySelector('.app-nav'));
    const aside=getComputedStyle(document.querySelector('.app-aside'));
    const feed=getComputedStyle(document.querySelector('.feed-column'));
    const shelfStyle=getComputedStyle(shelf);
    const reactionStyle=getComputedStyle(reaction);
    const iconStyle=getComputedStyle(reaction.querySelector('span'));
    return {
      navPosition:nav.position,
      asidePosition:aside.position,
      feedMaxWidth:feed.maxWidth,
      shelfDisplay:shelfStyle.display,
      reactionFont:parseFloat(reactionStyle.fontSize),
      reactionHeight:parseFloat(reactionStyle.minHeight),
      reactionIconFont:parseFloat(iconStyle.fontSize)
    };
  });

  expect(metrics.navPosition).toBe('fixed');
  expect(metrics.asidePosition).toBe('fixed');
  expect(metrics.feedMaxWidth).toBe('860px');
  expect(metrics.shelfDisplay).toBe('none');
  expect(metrics.reactionFont).toBeGreaterThanOrEqual(11);
  expect(metrics.reactionHeight).toBeGreaterThanOrEqual(56);
  expect(metrics.reactionIconFont).toBeGreaterThanOrEqual(18);
});

test('desktop largo preserva rótulos com sidebar ampliada',async({page})=>{
  await page.setViewportSize({width:1760,height:833});
  await page.waitForFunction(()=>document.documentElement.dataset.avessoReleaseController==='20261003-release1');
  await page.evaluate(()=>{
    document.querySelector('#marketing-view')?.classList.add('hidden');
    document.querySelector('.site-header')?.classList.add('hidden');
    document.querySelector('#app-view')?.classList.remove('hidden');
  });
  await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.app-nav')).width)>=248);
  const metrics=await page.evaluate(()=>({
    width:parseFloat(getComputedStyle(document.querySelector('.app-nav')).width),
    cssVar:getComputedStyle(document.body).getPropertyValue('--avesso-desktop-nav').trim()
  }));
  expect(metrics.width).toBeGreaterThanOrEqual(248);
  expect(metrics.cssVar).toBe('252px');
});

test('nova versão avisa e aguarda trabalho local antes do reinício automático',async({page})=>{
  await page.waitForFunction(()=>document.documentElement.dataset.avessoReleaseController==='20261003-release1');
  await page.locator('.site-header [data-open-auth]').click();
  await page.locator('#auth-form input[name="email"]').fill('humano@avesso.local');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('avesso:update-ready')));

  const indicator=page.locator('#avesso-release-indicator');
  await expect(indicator).toBeVisible();
  await expect(page.locator('[data-release-status]')).toContainText(/aguardando você terminar/i);
  await expect(page.locator('body')).toHaveClass(/avesso-release-pending/);
  await expect(page.locator('#app-update-banner')).toBeHidden();
});
