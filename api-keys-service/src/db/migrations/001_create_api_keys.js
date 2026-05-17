exports.up = async function (knex) {
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('owner').notNullable();
    table.string('key_hash', 64).notNullable().unique();
    table.text('scopes_json').notNullable().defaultTo('[]');
    table.timestamp('expires_at').nullable();
    table.timestamp('revoked_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['owner']);
    table.index(['key_hash']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('api_keys');
};
