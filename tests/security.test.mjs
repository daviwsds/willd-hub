import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { can, authorizedTenant } from '../lib/permissions.ts';
import { encryptCredentials, decryptCredentials } from '../lib/server/crypto.ts';
import { connectors } from '../lib/server/connectors.ts';
const own={userId:'user-a',restaurantId:'tenant-a',restaurantStatus:'active',role:'RESTAURANT_OWNER',membershipUserId:'user-a',membershipRestaurantId:'tenant-a'};
test('proprietário acessa seu restaurante',()=>assert.equal(authorizedTenant(own,'settings'),true));
test('identificador de outro restaurante é recusado',()=>assert.equal(authorizedTenant({...own,restaurantId:'tenant-b'},'read'),false));
test('vínculo de outro usuário é recusado',()=>assert.equal(authorizedTenant({...own,userId:'user-b'},'read'),false));
test('vínculo ausente é recusado',()=>assert.equal(authorizedTenant({...own,membershipRestaurantId:undefined},'read'),false));
test('restaurante suspenso bloqueia proprietário',()=>assert.equal(authorizedTenant({...own,restaurantStatus:'suspended'},'read'),false));
test('funcionário tem apenas leitura',()=>{assert.equal(can('RESTAURANT_EMPLOYEE','read'),true);for(const action of ['catalog','publish','credentials','members','settings','admin'])assert.equal(can('RESTAURANT_EMPLOYEE',action),false);});
test('gerente publica sem gerenciar credenciais ou equipe',()=>{assert.equal(can('RESTAURANT_MANAGER','publish'),true);assert.equal(can('RESTAURANT_MANAGER','catalog'),true);for(const action of ['credentials','members','settings','admin'])assert.equal(can('RESTAURANT_MANAGER',action),false);});
test('proprietário não administra plataforma',()=>assert.equal(can('RESTAURANT_OWNER','admin'),false));
test('super administrador gerencia contas suspensas',()=>assert.equal(authorizedTenant({...own,role:'SUPER_ADMIN',restaurantStatus:'suspended'},'admin'),true));
test('perfil desconhecido falha de forma fechada',()=>assert.equal(can('INVENTADO','admin'),false));
test('credenciais são cifradas e recuperadas apenas no contexto correto',()=>{
 process.env.INTEGRATION_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 const original={token:'segredo-muito-confidencial'};
 const encrypted=encryptCredentials(original,'tenant-a','ifood');
 assert.equal(encrypted.includes(original.token),false);
 assert.deepEqual(decryptCredentials(encrypted,'tenant-a','ifood'),original);
 assert.throws(()=>decryptCredentials(encrypted,'tenant-b','ifood'));
 assert.throws(()=>decryptCredentials(encrypted,'tenant-a','99food'));
});
test('criptografia usa nonce único para o mesmo conteúdo',()=>{
 process.env.INTEGRATION_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 assert.notEqual(encryptCredentials({token:'abc'},'a','ifood'),encryptCredentials({token:'abc'},'a','ifood'));
});
test('adulteração de credenciais é detectada',()=>{
 process.env.INTEGRATION_ENCRYPTION_KEY=randomBytes(32).toString('base64');
 const parts=encryptCredentials({token:'abc'},'a','ifood').split('.');const cipher=Buffer.from(parts[3],'base64');cipher[0]^=1;parts[3]=cipher.toString('base64');
 assert.throws(()=>decryptCredentials(parts.join('.'),'a','ifood'));
});
test('chave ausente impede armazenar credenciais',()=>{delete process.env.INTEGRATION_ENCRYPTION_KEY;assert.throws(()=>encryptCredentials({token:'abc'},'a','ifood'));});
test('chave de tamanho incorreto é recusada',()=>{process.env.INTEGRATION_ENCRYPTION_KEY='curta';assert.throws(()=>encryptCredentials({token:'abc'},'a','ifood'));});
for(const provider of ['ifood','99food']){
 test(`${provider}: conector informa que é simulado`,()=>assert.equal(connectors[provider].capabilities.realApi,false));
 test(`${provider}: cardápio vazio é recusado`,()=>assert.equal(connectors[provider].validateMenu([]).valid,false));
 test(`${provider}: preço negativo é recusado`,()=>assert.equal(connectors[provider].validateMenu([{name:'Açaí',price:-1}]).valid,false));
 test(`${provider}: preço não finito é recusado`,()=>{for(const price of [NaN,Infinity,-Infinity])assert.equal(connectors[provider].validateMenu([{name:'Açaí',price}]).valid,false);});
 test(`${provider}: produto válido é aceito`,()=>assert.equal(connectors[provider].validateMenu([{name:'Açaí',price:19.9}]).valid,true));
}
