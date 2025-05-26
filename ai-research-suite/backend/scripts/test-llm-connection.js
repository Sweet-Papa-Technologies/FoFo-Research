const axios = require('axios');

async function testConnection() {
  const baseUrl = process.env.LITELLM_BASE_URL || 'http://localhost:1234/v1';
  
  console.log('Testing LLM connection...');
  console.log('Base URL:', baseUrl);
  console.log('Provider:', process.env.LITELLM_PROVIDER || 'openai');
  console.log('Model:', process.env.LITELLM_DEFAULT_MODEL || 'gpt-3.5-turbo');
  
  try {
    // Test basic connectivity
    const response = await axios.get(baseUrl + '/models', {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${process.env.LITELLM_API_KEY || 'dummy-key'}`
      }
    });
    
    console.log('✅ Successfully connected to LLM service');
    console.log('Available models:', response.data);
  } catch (error) {
    console.error('❌ Failed to connect to LLM service');
    console.error('Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Make sure LMStudio is running and accessible.');
    }
    if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. Check firewall settings.');
    }
  }
}

testConnection();