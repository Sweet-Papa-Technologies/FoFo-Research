const knex = require('knex');
const config = require('../dist/config').config;

async function testListResearch() {
  const db = knex({
    client: 'pg',
    connection: config.database.url || {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
    },
  });

  try {
    console.log('Testing database connection...');
    await db.raw('SELECT 1');
    console.log('✓ Database connected');

    console.log('\nChecking research_sessions table...');
    const tableExists = await db.schema.hasTable('research_sessions');
    console.log(`✓ Table exists: ${tableExists}`);

    if (tableExists) {
      console.log('\nQuerying research_sessions...');
      const sessions = await db('research_sessions')
        .select('*')
        .limit(5);
      console.log(`✓ Found ${sessions.length} sessions`);
      
      if (sessions.length > 0) {
        console.log('\nSample session:');
        console.log(JSON.stringify(sessions[0], null, 2));
      }

      // Test the specific query from listUserSessions
      console.log('\nTesting listUserSessions query...');
      const userId = 'test-user-id'; // Replace with actual user ID if needed
      
      try {
        const query = db('research_sessions')
          .where('user_id', userId)
          .orderBy('created_at', 'desc');
        
        const [sessionResults, countResult] = await Promise.all([
          query.clone().limit(20).offset(0),
          query.clone().count('* as total').first()
        ]);
        
        console.log(`✓ Query successful - Found ${sessionResults.length} sessions for user`);
        console.log(`✓ Total count: ${countResult?.total || 0}`);
      } catch (queryError) {
        console.error('✗ Query error:', queryError.message);
        console.error('Stack:', queryError.stack);
      }
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

testListResearch();