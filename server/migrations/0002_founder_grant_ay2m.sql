-- Grandfather founder grant for ay2m@hotmail.com
-- Grants lifetime access to all premium features and exam prep packs

WITH founder_user AS (
  INSERT INTO users (email, email_verified, display_name)
  VALUES ('ay2m@hotmail.com', true, 'Founder')
  ON CONFLICT (email) DO UPDATE
    SET email_verified = true
  RETURNING id
)
INSERT INTO entitlements (user_id, plan, source, expires_at)
SELECT id, 'school', 'founding', NULL FROM founder_user
ON CONFLICT (user_id) DO UPDATE
  SET plan = 'school', source = 'founding', expires_at = NULL, updated_at = now();

-- Grant all paid exam prep packs (lifetime access)
-- Packs: ppl-exam, elp, conversion, cpl, ir, atpl, medical, aip
WITH founder_user AS (
  SELECT id FROM users WHERE email = 'ay2m@hotmail.com'
)
INSERT INTO pack_entitlements (user_id, pack_id)
SELECT id, pack_id FROM founder_user, (
  VALUES ('ppl-exam'), ('elp'), ('conversion'), ('cpl'), ('ir'), ('atpl'), ('medical'), ('aip')
) AS packs(pack_id)
ON CONFLICT DO NOTHING;

-- Grant unlimited chat credits
WITH founder_user AS (
  SELECT id FROM users WHERE email = 'ay2m@hotmail.com'
)
INSERT INTO chat_credits (user_id, balance)
SELECT id, 1000000 FROM founder_user
ON CONFLICT (user_id) DO UPDATE
  SET balance = 1000000, updated_at = now();
