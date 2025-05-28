exports.up = function(knex) {
  return knex.schema.table('research_sessions', function(table) {
    table.jsonb('progress').defaultTo('{}');
  });
};

exports.down = function(knex) {
  return knex.schema.table('research_sessions', function(table) {
    table.dropColumn('progress');
  });
};