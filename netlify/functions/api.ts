import 'dotenv/config';
import serverless from 'serverless-http';
import { createApiApp } from '../../src/server/app.ts';

const app = createApiApp({ serverlessApiOnly: true });

const serverlessHandler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});

interface NetlifyEvent {
  path?: string;
  rawUrl?: string;
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  multiValueHeaders?: Record<string, string[] | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  multiValueQueryStringParameters?: Record<string, string[] | undefined> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
  [key: string]: unknown;
}

export function normalizeNetlifyApiPath(rawPath: string | undefined): string {
  const path = (rawPath || '/').trim() || '/';
  const withoutFnPrefix = path.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '') || '/';
  if (withoutFnPrefix === '/api' || withoutFnPrefix.startsWith('/api/')) {
    return withoutFnPrefix;
  }
  return withoutFnPrefix.startsWith('/') ? `/api${withoutFnPrefix}` : `/api/${withoutFnPrefix}`;
}

export const handler = async (event: NetlifyEvent, context: Record<string, unknown> = {}) => {
  const normalizedPath = normalizeNetlifyApiPath(event.path);
  const incomingHeaders = event.headers || {};
  const clientIp =
    incomingHeaders['x-forwarded-for'] ||
    incomingHeaders['x-nf-client-connection-ip'] ||
    incomingHeaders['client-ip'] ||
    '127.0.0.1';

  const existingRequestContext =
    (event.requestContext as Record<string, any> | undefined) || {};
  const existingIdentity =
    (existingRequestContext.identity as Record<string, any> | undefined) || {};

  return serverlessHandler(
    {
      ...event,
      path: normalizedPath,
      headers: {
        ...incomingHeaders,
        'x-forwarded-for': clientIp,
      },
      requestContext: {
        ...existingRequestContext,
        identity: {
          ...existingIdentity,
          sourceIp: existingIdentity.sourceIp || clientIp.split(',')[0].trim(),
        },
      },
    },
    context
  );
};

export default handler;
