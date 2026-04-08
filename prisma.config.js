const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env['POSTGRES_URL'] || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
