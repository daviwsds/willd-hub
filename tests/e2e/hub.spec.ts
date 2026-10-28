import { test, expect } from '@playwright/test';
test('cria produto e registra publicação simulada',async({page},testInfo)=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Visão geral.'})).toBeVisible();
 const navigate=async(name:string)=>{if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();};
 await navigate('Produtos');
 await page.getByRole('button',{name:'Novo produto'}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome',{exact:true}).fill('Açaí de teste');await dialog.getByLabel('Preço (R$)').fill('22.50');await dialog.getByRole('button',{name:'Salvar alterações'}).click();
 await expect(page.getByRole('heading',{name:'Açaí de teste'})).toBeVisible();
 await navigate('Publicação');await page.getByRole('button',{name:'Simular publicação'}).click();
 await expect(page.getByRole('status')).toContainText('Simulação concluída');
 await navigate('Histórico');await expect(page.getByRole('cell',{name:'7 produtos',exact:true}).first()).toBeVisible();
 await page.reload();await navigate('Produtos');await expect(page.getByRole('heading',{name:'Açaí de teste'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
