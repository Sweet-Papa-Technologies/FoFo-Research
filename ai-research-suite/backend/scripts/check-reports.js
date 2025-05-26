const knex = require('knex');
const knexConfig = require('../knexfile');

const db = knex(knexConfig.development);

async function checkReports() {
  try {
    // Check reports count
    const reportCount = await db('reports').count('* as count');
    console.log('Total reports:', reportCount[0].count);
    
    // Check research sessions with completed status
    const completedSessions = await db('research_sessions')
      .where('status', 'completed')
      .select('id', 'topic', 'report_id', 'created_at');
    
    console.log('\nCompleted sessions:');
    completedSessions.forEach(session => {
      console.log(`- Session ${session.id}: ${session.topic}`);
      console.log(`  Report ID: ${session.report_id || 'NULL'}`);
      console.log(`  Created: ${session.created_at}`);
    });
    
    // Check if there are any reports for the specific session
    const sessionId = '755814b8-9d32-4542-9cf3-d7c0d9470e1b';
    const reportForSession = await db('reports')
      .where('session_id', sessionId)
      .first();
    
    console.log(`\nReport for session ${sessionId}:`, reportForSession ? 'Found' : 'Not found');
    if (reportForSession) {
      console.log('Report ID:', reportForSession.id);
      console.log('Content length:', reportForSession.content ? reportForSession.content.length : 0);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkReports();