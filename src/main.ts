import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOptions: CorsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
  };

  app.enableCors(corsOptions);

  await app.listen(3080);
}
bootstrap();
