import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { PartsModule } from './parts/parts.module';

const apiVersion = 'v1';
const modules: any[] = [PartsModule];
@Module({
  imports: [
    RouterModule.register(
      modules.map((mod) => {
        return { path: `/${apiVersion}`, module: mod };
      }),
    ),
    ...modules,
  ],
})
export class V1Module {}
