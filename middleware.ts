export { auth as middleware } from "@/auth"

// 보호하고 싶은 경로들을 설정합니다. 로그인하지 않은 사용자는 이 경로들에 접근 시 로그인 페이지로 리다이렉트됩니다.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|sw.js).*)",
  ],
}
