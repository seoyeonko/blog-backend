const checkLoggedIn = (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401; // Unauthorized - 로그인 상태가 아닌경우
    return;
  }
  return next(); // 로그인 상태라면 그 다음 미들웨어 실행
};

export default checkLoggedIn;
