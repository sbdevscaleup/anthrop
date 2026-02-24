-- Ensure a user cannot have the same role assigned multiple times
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_unique ON user_roles (user_id, role);
