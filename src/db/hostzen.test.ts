import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aliasTopLevelColumns,
  bindSqlParams,
  escapePgLiteral,
  normalizeHostzenValue,
} from './hostzen';

test('escapePgLiteral safely escapes strings, dates, booleans, nulls, and SQL injection payloads', () => {
  assert.equal(escapePgLiteral(null), 'NULL');
  assert.equal(escapePgLiteral(undefined), 'NULL');
  assert.equal(escapePgLiteral(true), 'TRUE');
  assert.equal(escapePgLiteral(false), 'FALSE');
  assert.equal(escapePgLiteral(42), '42');
  assert.equal(
    escapePgLiteral("O'Reilly'; DROP TABLE users; --"),
    "'O''Reilly''; DROP TABLE users; --'"
  );
  const dt = new Date('2026-11-19T05:30:00.000Z');
  assert.equal(escapePgLiteral(dt), "'2026-11-19T05:30:00.000Z'::timestamptz");
});

test('bindSqlParams binds $1..$10 outside string literals without corrupting quoted $1', () => {
  const sql = `select '$1', "col" from "users" where "email" = $1 and "id" = $10 and "flag" = $2`;
  const params = [
    "admin' OR '1'='1",
    true,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    99,
  ];
  const bound = bindSqlParams(sql, params);
  assert.equal(
    bound,
    `select '$1', "col" from "users" where "email" = 'admin'' OR ''1''=''1' and "id" = 99 and "flag" = TRUE`
  );
});

test('aliasTopLevelColumns eliminates duplicate column collisions across JOINs and RETURNING', () => {
  const joinSql =
    'select "courses"."id", "courses"."slug", "course_categories"."slug", "course_categories"."name" from "courses" inner join "course_categories" on "courses"."category_id" = "course_categories"."id"';
  const aliasedJoin = aliasTopLevelColumns(joinSql);
  assert.equal(aliasedJoin.colCount, 4);
  assert.ok(aliasedJoin.sql.includes('"courses"."slug" AS "__c1"'));
  assert.ok(aliasedJoin.sql.includes('"course_categories"."slug" AS "__c2"'));

  const returningSql =
    'insert into "users" ("email", "full_name") values (\'a@b.in\', \'A\') returning "id", "email"';
  const aliasedRet = aliasTopLevelColumns(returningSql);
  assert.equal(aliasedRet.colCount, 2);
  assert.ok(aliasedRet.sql.includes('returning "id" AS "__c0", "email" AS "__c1"'));
});

test('normalizeHostzenValue converts ISO-8601 Z timestamps to Drizzle-compatible PG wire timestamps', () => {
  assert.equal(
    normalizeHostzenValue('2026-11-19T05:32:14.123Z'),
    '2026-11-19 05:32:14.123'
  );
  assert.equal(normalizeHostzenValue('plain text'), 'plain text');
  assert.equal(normalizeHostzenValue(123), 123);
  assert.equal(normalizeHostzenValue(null), null);
});
