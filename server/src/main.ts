import 'reflect-metadata';
import './load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map(x => x.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT invalid');
  await app.listen(port, '0.0.0.0');
}
void bootstrap().catch(error => { console.error('API startup failed', error); process.exitCode = 1; });
