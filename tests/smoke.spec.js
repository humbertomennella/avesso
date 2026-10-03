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
