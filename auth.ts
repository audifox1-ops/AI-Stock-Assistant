import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/login', // 커스텀 로그인 페이지 설정
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname.startsWith('/login');

      if (isLoggedIn && isOnLoginPage) {
        return Response.redirect(new URL('/', nextUrl)); // 로그인 상태에서 로그인 페이지 접근 시 홈으로
      }
      return isLoggedIn; // 기본적으로 로그인 상태여야 접근 허용
    },
  },
  secret: process.env.AUTH_SECRET,
});
