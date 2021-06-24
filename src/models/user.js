import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const UserSchema = new Schema({
  username: String,
  hashedPassword: String, // 단방향 해시 함수로 암호화
});

// Instance Method
// setPassword: 비밀번호를 파라미터로 받아서 hashedPassword 값 설정
UserSchema.methods.setPassword = async function (password) {
  const hash = await bcrypt.hash(password, 10);
  this.hashedPassword = hash;
};

// checkPassword: 파라미터로 받은 비밀번호가 해당 계정의 비밀번호와 일치하는지 확인
UserSchema.methods.checkPassword = async function (password) {
  const result = await bcrypt.compare(password, this.hashedPassword);
  return result; // true or false
};

// Static Method
// findByUsername: username으로 데이터를 찾을 수 있게 함
UserSchema.statics.findByUsername = function (username) {
  return this.findOne({ username });
};

// hashedPassword 필드가 응답되지 않도록 데이터를 JSON으로 변환 후 delete로 해당 필드 지움
UserSchema.methods.serialize = function () {
  const data = this.toJSON();
  delete data.hashedPassword;
  return data;
};

// Instance Method
UserSchema.methods.generateToken = function () {
  const token = jwt.sign(
    // 첫번째 파라미터: 토큰 안에 집어넣고 싶은 데이터를 넣음
    {
      _id: this._id,
      username: this.username,
    },
    process.env.JWT_SECRET, // 두번째 파라미터: JWT 암호
    {
      expiresIn: '7d', // 7일동안 유효
    },
  );
  return token;
};

const User = mongoose.model('User', UserSchema); // 스키마 이름, 스키마 객체
export default User;
