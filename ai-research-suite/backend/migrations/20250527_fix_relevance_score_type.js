exports.up = function (knex) {
  return knex.schema.alterTable('research_data', function (table) {
    // Change relevance_score from integer to decimal
    table.decimal('relevance_score', 3, 2).defaultTo(0).alter();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('research_data', function (table) {
    // Revert back to integer
    table.integer('relevance_score').defaultTo(0).alter();
  });
};