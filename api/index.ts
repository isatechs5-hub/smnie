import 'dotenv/config';
import { createApiApp } from '../src/server/app.ts';

const app = createApiApp({ serverlessApiOnly: true });

export default app;
