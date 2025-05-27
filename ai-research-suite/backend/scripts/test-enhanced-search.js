require('dotenv').config();
const { SearchTool } = require('../dist/orchestration/tools/SearchTool');

async function testEnhancedSearch() {
  console.log('Testing Enhanced Search Tool...\n');
  
  try {
    const searchTool = new SearchTool();
    
    // Test search with content extraction
    console.log('Testing search WITH content extraction and AI summarization...');
    const result1 = await searchTool._call({
      query: 'artificial intelligence healthcare applications',
      maxResults: 3,
      extractContent: true
    });
    
    const parsedResult1 = JSON.parse(result1);
    console.log('\nSearch Results with Content Extraction:');
    console.log('Query:', parsedResult1.query);
    console.log('Total Results:', parsedResult1.totalResults);
    console.log('Content Extracted:', parsedResult1.contentExtracted);
    
    parsedResult1.results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log('URL:', result.url);
      console.log('Title:', result.title);
      console.log('Original Snippet:', result.snippet);
      
      if (result.extractedContent) {
        console.log('\nExtracted Content:');
        console.log('- Text Length:', result.extractedContent.textLength);
        console.log('- AI Summary:', result.extractedContent.summary);
        console.log('- Key Points:', result.extractedContent.keyPoints);
        console.log('- Relevance Score:', result.extractedContent.relevanceScore);
      } else if (result.contentExtractionError) {
        console.log('Content Extraction Error:', result.contentExtractionError);
      } else if (result.processingError) {
        console.log('Processing Error:', result.processingError);
      }
    });
    
    // Test search without content extraction
    console.log('\n\n========================================');
    console.log('Testing search WITHOUT content extraction...');
    const result2 = await searchTool._call({
      query: 'artificial intelligence healthcare applications',
      maxResults: 3,
      extractContent: false
    });
    
    const parsedResult2 = JSON.parse(result2);
    console.log('\nSearch Results without Content Extraction:');
    console.log('Query:', parsedResult2.query);
    console.log('Total Results:', parsedResult2.totalResults);
    console.log('Content Extracted:', parsedResult2.contentExtracted);
    
    parsedResult2.results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log('URL:', result.url);
      console.log('Title:', result.title);
      console.log('Snippet:', result.snippet);
      console.log('Engine:', result.engine);
      console.log('Score:', result.score);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEnhancedSearch();