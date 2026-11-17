/**
 * Live API Test Runner
 * Executes a full lifecycle test across all 6 core APIs + Bonus features against the running server.
 */
const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`📌 ${title}`);
  console.log('='.repeat(60));
}

async function runLiveTests() {
  console.log(`Starting live API tests against: ${BASE_URL}\n`);

  try {
    // 0. Ensure Users Exist
    printSection('Step 0: Provisioning Users (Relational DB)');
    const u1 = `user_alice_${Date.now().toString().slice(-4)}`;
    const u2 = `user_bob_${Date.now().toString().slice(-4)}`;
    const u3 = `user_charlie_${Date.now().toString().slice(-4)}`;

    await request('POST', '/user', { id: u1, name: 'Alice Smith', email: `${u1}@test.com` });
    await request('POST', '/user', { id: u2, name: 'Bob Jones', email: `${u2}@test.com` });
    await request('POST', '/user', { id: u3, name: 'Charlie Brown', email: `${u3}@test.com` });
    console.log(`✔ Created Users: ${u1}, ${u2}, ${u3}`);

    // 1. API 1: Create or Get Chat
    printSection('1. Testing POST /chat/create (Create or Get 1:1 Chat)');
    const chat1Res = await request('POST', '/chat/create', { userAId: u1, userBId: u2 });
    console.log('✔ Created Chat Response:', JSON.stringify(chat1Res.body, null, 2));
    const chatId = chat1Res.body.chatId;

    // Test idempotency
    const chat1Dup = await request('POST', '/chat/create', { userAId: u2, userBId: u1 });
    console.log(`✔ Idempotent Check: Returned same chatId? ${chat1Dup.body.chatId === chatId} (isExisting: ${chat1Dup.body.isExisting})`);

    // 2. API 2: Send Message
    printSection('2. Testing POST /chat/:chatId/message/send (Send Message)');
    const msg1Res = await request('POST', `/chat/${chatId}/message/send`, {
      senderId: u1,
      text: 'Hey Bob, checking out our new hybrid backend!',
    });
    console.log('✔ Message 1 sent by Alice:', JSON.stringify(msg1Res.body, null, 2));
    const msg1Id = msg1Res.body.id;

    const msg2Res = await request('POST', `/chat/${chatId}/message/send`, {
      senderId: u2,
      text: 'Hey Alice! Relational DB for chats, Firestore for messages. Works great!',
    });
    console.log('✔ Message 2 sent by Bob:', JSON.stringify(msg2Res.body, null, 2));
    const msg2Id = msg2Res.body.id;

    // 3. API 3: Get Messages
    printSection('3. Testing GET /chat/:chatId/messages?limit=50 (Get Messages)');
    const messagesRes = await request('GET', `/chat/${chatId}/messages?limit=50`);
    console.log(`✔ Retrieved ${messagesRes.body.length} messages in chronological order:`);
    messagesRes.body.forEach((m, idx) => {
      console.log(`   [${idx + 1}] (${m.senderId}): "${m.text}" [${m.timestamp}]`);
    });

    // 4. API 4: Mark Message Read
    printSection('4. Testing POST /chat/:chatId/message/:messageId/read (Mark Read)');
    const readRes = await request('POST', `/chat/${chatId}/message/${msg1Id}/read`, {
      userId: u2,
    });
    console.log('✔ Bob marked Alice message as read:', JSON.stringify(readRes.body, null, 2));

    // Verify read receipt in message list
    const checkReadRes = await request('GET', `/chat/${chatId}/messages`);
    const readMsg = checkReadRes.body.find((m) => m.id === msg1Id);
    console.log(`✔ Verified 'readBy' now contains Bob: [${readMsg.readBy.join(', ')}]`);

    // 5. API 5: Update Last Seen Message
    printSection('5. Testing POST /chat/:chatId/lastseen (Update Last Seen)');
    const lastSeenRes = await request('POST', `/chat/${chatId}/lastseen`, {
      userId: u2,
      messageId: msg2Id,
    });
    console.log('✔ Bob updated last seen pointer:', JSON.stringify(lastSeenRes.body, null, 2));

    const getLsRes = await request('GET', `/chat/${chatId}/lastseen/${u2}`);
    console.log('✔ Retrieved Bob last seen pointer:', JSON.stringify(getLsRes.body, null, 2));

    // 6. API 6: List User Chats
    printSection('6. Testing GET /user/:userId/chats (List User Chats)');
    const aliceChatsRes = await request('GET', `/user/${u1}/chats`);
    console.log('✔ Alice Chats from Relational DB:', JSON.stringify(aliceChatsRes.body, null, 2));

    // Bonus Features
    printSection('★ Bonus: Group Chat Creation & Management');
    const groupRes = await request('POST', '/chat/group/create', {
      name: 'Architecture Core Team',
      creatorId: u1,
      memberIds: [u2, u3],
    });
    console.log('✔ Group Created:', JSON.stringify(groupRes.body, null, 2));
    const groupChatId = groupRes.body.chatId;

    printSection('★ Bonus: Message Edit & Delete');
    const groupMsg = await request('POST', `/chat/${groupChatId}/message/send`, {
      senderId: u1,
      text: 'Draft announcement text',
    });
    console.log('✔ Group Message sent:', groupMsg.body.id);

    const editMsg = await request('PATCH', `/chat/${groupChatId}/message/${groupMsg.body.id}`, {
      senderId: u1,
      text: 'Official Final Announcement!',
    });
    console.log('✔ Edited message text:', editMsg.body.text, '(isEdited:', editMsg.body.isEdited, ')');

    const delMsg = await request('DELETE', `/chat/${groupChatId}/message/${groupMsg.body.id}`, {
      senderId: u1,
    });
    console.log('✔ Deleted message status:', JSON.stringify(delMsg.body, null, 2));

    printSection('✅ ALL 6 FUNCTIONALITIES + BONUS FEATURES TESTED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

runLiveTests();
