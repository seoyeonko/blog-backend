import Post from '../../models/post';
import mongoose from 'mongoose';
import Joi from '@hapi/joi';
import sanitizeHtml from 'sanitize-html';

// 미들웨어 - ObjectId 검증
const { ObjectId } = mongoose.Types;

// HTML 특정 태그만 허용 - 악성 스크립트 주입 방지
const sanitizeOption = {
  allowedTags: [
    'h1',
    'h2',
    'b',
    'i',
    'u',
    's',
    'p',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src'],
    li: ['class'],
  },
  allowedSchemes: ['data', 'http'],
};

export const getPostById = async (ctx, next) => {
  const { id } = ctx.params;
  if (!ObjectId.isValid(id)) {
    ctx.status = 400; // Bad Request
    return;
  }
  try {
    const post = await Post.findById(id);
    // 포스트가 존재하지 않을 때
    if (!post) {
      ctx.status = 404; // Not Found
      return;
    }
    ctx.state.post = post;
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const checkOwnPost = (ctx, next) => {
  const { user, post } = ctx.state;
  if (post.user._id.toString() !== user._id) {
    ctx.status = 403;
    return;
  }
  return next();
};

// POST /api/posts - 포스트 작성
// {
//   title:'제목',
//   body: '내용',
//   tags: ['태그1', '태그2']
// }
export const write = async (ctx) => {
  const schema = Joi.object().keys({
    // 객체가 다음 필드를 가지고 있음을 검증
    title: Joi.string().required(), // required(): 필수 항목
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required(), // 문자열로 이루어진 배열
  });

  // 검증하고나서 검증 실패인 경우 에러 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // Bad request
    ctx.body = result.error;
    return;
  }

  const { title, body, tags } = ctx.request.body;
  const post = new Post({
    title,
    body: sanitizeHtml(body, sanitizeOption),
    tags,
    user: ctx.state.user,
  });

  try {
    await post.save();
    ctx.body = post;
  } catch (e) {
    ctx.throw(500, e);
  }
};

// html을 없애고 내용이 너무 길면 200자로 제한하는 함수
const removeHtmlAndShorten = (body) => {
  const filtered = sanitizeHtml(body, {
    allowedTags: [],
  });
  return filtered.length < 200 ? filtered : `${filtered.slice(0, 200)}...`;
};

// GET /api/posts?usernmae=&tag=&page= - 데이터 조회
export const list = async (ctx) => {
  // 페이지네이션 구현
  // query는 문자열 -> 숫자로 반환
  // 값이 주어지지 않으면 1로 간주
  const page = parseInt(ctx.query.page || '1', 10);

  if (page < 1) {
    ctx.status = 400;
    return;
  }

  const { tag, username } = ctx.query;
  // tag, username 값이 유효하면 객체 안에 넣고, 그렇지 않으면 넣지 않음
  const query = {
    ...(username ? { 'user.username': username } : {}),
    ...(tag ? { tags: tag } : {}),
  };

  try {
    const posts = await Post.find(query)
      .sort({
        _id: -1, // 내림차순 정렬 (최신 포스팅된 블로그부터 보여줌)
      })
      .limit(10) // 보이는 개수 제한
      .skip((page - 1) * 10) // 페이지 기능
      .lean() // 내용 길이 제한
      .exec(); // find().exec(): 서버에 쿼리 요청
    const postCount = await Post.countDocuments(query).exec();
    ctx.set('Last-Page', Math.ceil(postCount / 10));
    ctx.body = posts.map((post) => ({
      ...post,
      body: removeHtmlAndShorten(post.body), // html제거 + 문자열 길이 제한
    }));
    ctx.body = posts;
  } catch (e) {
    ctx.throw(500, e);
  }
};

// GET /api/posts/:id - 특정 포스트 조회
export const read = async (ctx) => {
  ctx.body = ctx.state.post; // id로 포스트 찾는 코드 간소화
};

// DELETE /api/posts/:id
export const remove = async (ctx) => {
  const { id } = ctx.params;
  try {
    await Post.findByIdAndRemove(id).exec();
    ctx.status = 204; // No Content (성공했지만 응답 데이터 없음)
  } catch (e) {
    ctx.throw(500, e);
  }
};

// PATCH /api/posts/:id
// {
//   title: '수정',
//   body: '수정 내용',
//   tags: ['수정', '태그']
// }
export const update = async (ctx) => {
  const { id } = ctx.params;
  // write의 schema와 유사하지만, required()가 없음
  const schema = Joi.object().keys({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  });

  // 검증하고나서 검증 실패인 경우 에러 처리
  const result = schema.validate(ctx.request.body);
  if (result.error) {
    ctx.status = 400; // Bad request
    ctx.body = result.error;
    return;
  }

  const nextData = { ...ctx.request.body }; // 객체를 복사하고
  // body 값이 주어졌으면 HTML 필터링
  if (nextData.body) {
    nextData.body = sanitizeHtml(nextData.body);
  }

  try {
    const post = await Post.findByIdAndUpdate(id, nextData, {
      new: true, // true: 업데이트된 데이터 반환
      // false: 업데이트되기 전의 데이터 반환
    });
    if (!post) {
      ctx.status = 404;
      return;
    }
  } catch (e) {
    ctx.throw(500, e);
  }
};
