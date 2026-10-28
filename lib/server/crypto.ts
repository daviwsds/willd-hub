import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
function key() {
  const value = Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY ?? '', 'base64');
  if (value.length !== 32) throw new Error('Chave de criptografia não configurada.');
  return value;
}
export function encryptCredentials(value: Record<string, string>, restaurantId: string, provider: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(`${restaurantId}:${provider}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}
export function decryptCredentials(value: string, restaurantId: string, provider: string) {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1') throw new Error('Versão de criptografia inválida.');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  cipher.setAAD(Buffer.from(`${restaurantId}:${provider}`));
  cipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data, 'base64')), cipher.final()]).toString('utf8'));
}
