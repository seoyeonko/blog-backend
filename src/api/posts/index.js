import Router from 'koa-router';
import * as postsCtrl from './posts.ctrl';
import checkLoggedIn from '../../lib/ckeckLoggedIn';

const posts = new Router();

// 여러 종류의 라우트 설정, printInfo 함수 호출
posts.get('/', postsCtrl.list);
posts.post('/', checkLoggedIn, postsCtrl.write); // 포스트 작성 - 로그인 상태 확인 미들웨어

// 리팩토링
const post = new Router(); // /api/posts/:id 경로를 위한 라우터
post.get('/', postsCtrl.read);
post.delete('/', checkLoggedIn, postsCtrl.checkOwnPost, postsCtrl.remove);
post.patch('/', checkLoggedIn, postsCtrl.checkOwnPost, postsCtrl.update);

posts.use('/:id', postsCtrl.getPostById, post.routes());

export default posts;
