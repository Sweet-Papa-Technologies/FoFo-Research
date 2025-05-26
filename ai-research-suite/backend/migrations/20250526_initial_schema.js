exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email', 255).unique().notNullable();
      table.string('password_hash', 255).notNullable();
      table.string('name', 100);
      table.string('role', 50).defaultTo('user');
      table.timestamps(true, true);
      
      table.index('email');
    })
    
    .createTable('research_sessions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.text('topic').notNullable();
      table.string('status', 50).notNullable().defaultTo('pending');
      table.jsonb('parameters').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.text('error_message');
      table.uuid('report_id');
      
      table.index(['user_id', 'status']);
      table.index('created_at');
    })
    
    .createTable('reports', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('session_id').references('id').inTable('research_sessions').onDelete('CASCADE');
      table.text('content').notNullable();
      table.text('summary');
      table.jsonb('key_findings');
      table.integer('word_count');
      table.integer('version').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index('session_id');
    })
    
    .createTable('sources', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('session_id').references('id').inTable('research_sessions').onDelete('CASCADE');
      table.text('url').notNullable();
      table.text('title');
      table.text('content');
      table.text('summary');
      table.decimal('relevance_score', 3, 2);
      table.timestamp('accessed_at');
      table.jsonb('metadata');
      
      table.index('session_id');
      table.index('relevance_score');
    })
    
    .createTable('citations', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('report_id').references('id').inTable('reports').onDelete('CASCADE');
      table.uuid('source_id').references('id').inTable('sources').onDelete('SET NULL');
      table.text('quote').notNullable();
      table.text('context');
      table.integer('position');
      
      table.index('report_id');
    })
    
    .createTable('api_keys', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('key_hash', 255).notNullable();
      table.string('name', 255);
      table.jsonb('permissions');
      table.timestamp('last_used_at');
      table.timestamp('expires_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index('user_id');
      table.index('key_hash');
    })
    
    .createTable('user_settings', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.string('default_report_length', 20).defaultTo('medium');
      table.string('default_language', 2).defaultTo('en');
      table.integer('default_max_sources').defaultTo(20);
      table.boolean('email_notifications').defaultTo(true);
      table.string('theme', 10).defaultTo('auto');
      table.jsonb('preferences');
      table.timestamps(true, true);
    })
    
    .createTable('search_history', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.text('query').notNullable();
      table.jsonb('filters');
      table.integer('result_count');
      table.timestamp('searched_at').defaultTo(knex.fn.now());
      
      table.index(['user_id', 'searched_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('search_history')
    .dropTableIfExists('user_settings')
    .dropTableIfExists('api_keys')
    .dropTableIfExists('citations')
    .dropTableIfExists('sources')
    .dropTableIfExists('reports')
    .dropTableIfExists('research_sessions')
    .dropTableIfExists('users');
};