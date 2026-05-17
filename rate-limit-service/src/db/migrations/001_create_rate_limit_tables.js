exports.up = async function (knex) {
  await knex.schema.createTable('rate_limits', (table) => {
    table.string('identity').primary();
    table.integer('limit_per_minute').notNullable().defaultTo(60);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('rate_counters', (table) => {
    table.increments('id').primary();
    table.string('identity').notNullable();
    table.timestamp('window_start').notNullable();
    table.integer('count').notNullable().defaultTo(0);
    table.index(['identity', 'window_start']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rate_counters');
  await knex.schema.dropTableIfExists('rate_limits');
};
