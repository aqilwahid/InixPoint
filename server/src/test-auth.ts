import { registerUser, loginUser, verifyToken } from './auth';

async function testAuth() {
  console.log('Testing U-01 Auth...');

  // Test 1: Register
  const reg = await registerUser('test@inixpoint.com', 'password123', 'Test User');
  console.assert(reg.success, 'Register should succeed');
  console.assert(reg.user?.email === 'test@inixpoint.com', 'Email should match');
  console.assert(reg.user?.role === 'presenter', 'Role should be presenter');
  console.log('✅ Register passed');

  // Test 2: Duplicate email
  const dup = await registerUser('test@inixpoint.com', 'pass', 'Dup');
  console.assert(!dup.success, 'Duplicate register should fail');
  console.assert(dup.error?.includes('terdaftar'), 'Error should mention duplicate');
  console.log('✅ Duplicate email blocked');

  // Test 3: Login
  const login = await loginUser('test@inixpoint.com', 'password123');
  console.assert(login.success, 'Login should succeed');
  console.assert(login.token, 'Token should be returned');
  console.assert(login.user?.name === 'Test User', 'User name should match');
  console.log('✅ Login passed');

  // Test 4: Wrong password
  const wrongPass = await loginUser('test@inixpoint.com', 'wrongpass');
  console.assert(!wrongPass.success, 'Wrong password should fail');
  console.log('✅ Wrong password blocked');

  // Test 5: Token verification
  const token = login.token!;
  const verify = verifyToken(token);
  console.assert(verify.valid, 'Token should be valid');
  console.assert(verify.payload?.email === 'test@inixpoint.com', 'Payload email should match');
  console.assert(verify.payload?.role === 'presenter', 'Payload role should match');
  console.log('✅ Token verification passed');

  // Test 6: Invalid token
  const badToken = verifyToken('bad.token.here');
  console.assert(!badToken.valid, 'Bad token should be invalid');
  console.log('✅ Invalid token rejected');

  console.log('\n✅ test-auth: All assertions passed!');
}

testAuth().catch(console.error);
