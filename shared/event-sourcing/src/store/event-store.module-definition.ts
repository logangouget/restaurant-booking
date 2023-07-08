import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface EventStoreModuleOptions {
  endpoint: string;
  insecure: boolean;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<EventStoreModuleOptions>().build();
