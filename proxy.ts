import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
    || request.nextUrl.pathname.startsWith('/alumni')
    || request.nextUrl.pathname.startsWith('/announcements')
    || request.nextUrl.pathname.startsWith('/messages')
    || request.nextUrl.pathname.startsWith('/profile')
    || request.nextUrl.pathname.startsWith('/requests')
    || request.nextUrl.pathname.startsWith('/directory')
    || request.nextUrl.pathname.startsWith('/teacher-dashboard')
    || request.nextUrl.pathname.startsWith('/student-dashboard')

  if (isDashboardRoute) {
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
    const hasSession = request.cookies.has('appwrite-session')
      || (projectId ? request.cookies.has(`a_session_${projectId}`) : false)

    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
