import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated host user from the request.
 *
 * Usage:
 *   @Get('profile')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: { sub: string; email: string }) {}
 *
 * Or get a specific field:
 *   @CurrentUser('sub') hostId: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
