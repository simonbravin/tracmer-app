-- Split legacy `treasury` app module into `treasury_transactions` and `treasury_locations`.

INSERT INTO "app_modules" ("id", "code", "display_name")
SELECT gen_random_uuid()::text, 'treasury_transactions', 'Tesorería · Transacciones'
WHERE NOT EXISTS (SELECT 1 FROM "app_modules" WHERE "code" = 'treasury_transactions');

INSERT INTO "app_modules" ("id", "code", "display_name")
SELECT gen_random_uuid()::text, 'treasury_locations', 'Tesorería · Ubicaciones'
WHERE NOT EXISTS (SELECT 1 FROM "app_modules" WHERE "code" = 'treasury_locations');

INSERT INTO "permission_definitions" ("id", "module_id", "action_code", "created_at")
SELECT gen_random_uuid()::text, m."id", x.action, NOW()
FROM "app_modules" m
CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('archive')) AS x(action)
WHERE m."code" = 'treasury_transactions'
  AND NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd
    WHERE pd."module_id" = m."id" AND pd."action_code" = x.action
  );

INSERT INTO "permission_definitions" ("id", "module_id", "action_code", "created_at")
SELECT gen_random_uuid()::text, m."id", x.action, NOW()
FROM "app_modules" m
CROSS JOIN (VALUES ('view'), ('create'), ('edit')) AS x(action)
WHERE m."code" = 'treasury_locations'
  AND NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd
    WHERE pd."module_id" = m."id" AND pd."action_code" = x.action
  );

-- Migrate enabled modules and permissions from `treasury` when present.
INSERT INTO "organization_role_enabled_modules" ("id", "organization_id", "role_id", "module_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, e."organization_id", e."role_id", tx."id", e."is_enabled", NOW()
FROM "organization_role_enabled_modules" e
JOIN "app_modules" old ON old."id" = e."module_id" AND old."code" = 'treasury'
JOIN "app_modules" tx ON tx."code" = 'treasury_transactions'
ON CONFLICT ("organization_id", "role_id", "module_id") DO NOTHING;

INSERT INTO "organization_role_enabled_modules" ("id", "organization_id", "role_id", "module_id", "is_enabled", "updated_at")
SELECT gen_random_uuid()::text, e."organization_id", e."role_id", loc."id", e."is_enabled", NOW()
FROM "organization_role_enabled_modules" e
JOIN "app_modules" old ON old."id" = e."module_id" AND old."code" = 'treasury'
JOIN "app_modules" loc ON loc."code" = 'treasury_locations'
ON CONFLICT ("organization_id", "role_id", "module_id") DO NOTHING;

-- view, create, edit → both new modules
INSERT INTO "organization_role_permissions" ("id", "organization_id", "role_id", "permission_definition_id", "is_allowed", "updated_at")
SELECT gen_random_uuid()::text, p."organization_id", p."role_id", npd."id", p."is_allowed", NOW()
FROM "organization_role_permissions" p
JOIN "permission_definitions" opd ON opd."id" = p."permission_definition_id"
JOIN "app_modules" om ON om."id" = opd."module_id" AND om."code" = 'treasury'
JOIN "app_modules" nm ON nm."code" = 'treasury_transactions'
JOIN "permission_definitions" npd ON npd."module_id" = nm."id" AND npd."action_code" = opd."action_code"
WHERE opd."action_code" IN ('view', 'create', 'edit')
ON CONFLICT ("organization_id", "role_id", "permission_definition_id") DO NOTHING;

INSERT INTO "organization_role_permissions" ("id", "organization_id", "role_id", "permission_definition_id", "is_allowed", "updated_at")
SELECT gen_random_uuid()::text, p."organization_id", p."role_id", npd."id", p."is_allowed", NOW()
FROM "organization_role_permissions" p
JOIN "permission_definitions" opd ON opd."id" = p."permission_definition_id"
JOIN "app_modules" om ON om."id" = opd."module_id" AND om."code" = 'treasury'
JOIN "app_modules" nm ON nm."code" = 'treasury_locations'
JOIN "permission_definitions" npd ON npd."module_id" = nm."id" AND npd."action_code" = opd."action_code"
WHERE opd."action_code" IN ('view', 'create', 'edit')
ON CONFLICT ("organization_id", "role_id", "permission_definition_id") DO NOTHING;

-- archive (transacciones): align with legacy `edit`
INSERT INTO "organization_role_permissions" ("id", "organization_id", "role_id", "permission_definition_id", "is_allowed", "updated_at")
SELECT gen_random_uuid()::text, p."organization_id", p."role_id", npd_arch."id", p."is_allowed", NOW()
FROM "organization_role_permissions" p
JOIN "permission_definitions" opd ON opd."id" = p."permission_definition_id" AND opd."action_code" = 'edit'
JOIN "app_modules" om ON om."id" = opd."module_id" AND om."code" = 'treasury'
JOIN "app_modules" nm ON nm."code" = 'treasury_transactions'
JOIN "permission_definitions" npd_arch ON npd_arch."module_id" = nm."id" AND npd_arch."action_code" = 'archive'
ON CONFLICT ("organization_id", "role_id", "permission_definition_id") DO NOTHING;

DELETE FROM "organization_role_permissions"
WHERE "permission_definition_id" IN (
  SELECT pd."id" FROM "permission_definitions" pd
  JOIN "app_modules" m ON m."id" = pd."module_id" AND m."code" = 'treasury'
);

DELETE FROM "organization_role_enabled_modules"
WHERE "module_id" IN (SELECT "id" FROM "app_modules" WHERE "code" = 'treasury');

DELETE FROM "permission_definitions"
WHERE "module_id" IN (SELECT "id" FROM "app_modules" WHERE "code" = 'treasury');

DELETE FROM "app_modules" WHERE "code" = 'treasury';
