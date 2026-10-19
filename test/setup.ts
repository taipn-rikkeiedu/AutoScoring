import { beforeEach } from 'vitest';
import { installChrome } from './fakes/chrome';

beforeEach(() => { installChrome(); });
