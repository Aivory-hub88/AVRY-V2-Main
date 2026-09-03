export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { handleCanaryTrap } from '@/lib/canaryTrap';

export async function GET(request: NextRequest) {
  return handleCanaryTrap(request);
}

export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
