exports.up = function (knex) {
  return knex.schema
    .createTable('research_data', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('session_id').notNullable();
      table.string('data_type', 50).notNullable(); // 'search_results', 'analysis', 'source_content'
      table.string('query', 500); // The search query used
      table.text('title'); // Title or identifier for the data
      table.text('content'); // The actual data content
      table.json('metadata'); // Additional metadata (source URL, date, etc.)
      table.integer('relevance_score').defaultTo(0); // For ranking
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Indexes for efficient retrieval
      table.index('session_id');
      table.index(['session_id', 'data_type']);
      table.index('created_at');
      
      // Foreign key
      table.foreign('session_id').references('id').inTable('research_sessions').onDelete('CASCADE');
    })
    .createTable('research_queries', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('session_id').notNullable();
      table.string('query', 500).notNullable();
      table.string('status', 50).defaultTo('pending'); // pending, processing, completed, failed
      table.integer('priority').defaultTo(0);
      table.json('results_summary'); // Summary of what was found
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('processed_at');
      
      // Indexes
      table.index('session_id');
      table.index('status');
      
      // Foreign key
      table.foreign('session_id').references('id').inTable('research_sessions').onDelete('CASCADE');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTable('research_queries')
    .dropTable('research_data');
};