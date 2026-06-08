import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RealIp = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (
    request.headers['x-forwarded-for']?.split(',')[0] ||
    request.headers['x-real-ip'] ||
    request.connection?.remoteAddress ||
    request.ip ||
    '127.0.0.1'
  );
});
