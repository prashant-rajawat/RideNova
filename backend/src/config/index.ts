import { validateEnvironment, EnvironmentConfig } from '../validators/env.validator.ts';

export const config: EnvironmentConfig = validateEnvironment();
