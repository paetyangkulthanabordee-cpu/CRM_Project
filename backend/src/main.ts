import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module.js';

/** แสดงข้อความ error ที่อ่านง่ายเมื่อ port ถูกคนอื่นจอง (EADDRINUSE) */
function exitPortInUse(port: string): never {
  console.error(
    `\n✗ Port ${port} ถูกใช้งานอยู่แล้ว (EADDRINUSE)\n` +
      `  มี process อื่นค้างอยู่บน port ${port} (มักเป็น backend เก่าจาก watch mode)\n` +
      `  วิธีแก้: รัน "npm run port:free" แล้วสตาร์ทใหม่\n` +
      `  ดูสถานะก่อนโดยไม่ kill: "npm run port:check"\n` +
      `  หรือปิด program ที่ใช้ port ${port} ก่อน แล้วลองใหม่\n`,
  );
  process.exit(1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN ??
      'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // query params มาเป็น string เสมอ
      // ต้องแปลงเป็น number ให้ @IsInt() ผ่าน
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT ?? '3001';

  // กันสองทาง: server 'error' event และ rejection ของ app.listen()
  let handledListenError = false;
  const handleListenError = (err: NodeJS.ErrnoException) => {
    if (handledListenError) return;
    if (err?.code === 'EADDRINUSE') {
      handledListenError = true;
      exitPortInUse(port);
    }
  };

  app.getHttpServer().on('error', handleListenError);

  try {
    await app.listen(port);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'EADDRINUSE') {
      handleListenError(e);
    } else {
      throw err;
    }
  }
}

await bootstrap();
