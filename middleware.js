import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'oudadsi.ahmed@gmail.com'
const PUBLIC_PATHS = ['/', '/expired', '/api', '/_next', '/favicon', '/icon', '/manifest']

export async function middleware(req) {
  const path = req.nextUrl.pathname
  
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}