-- Flirtigo Seed Data (development only)

-- Admin user (set password via app)
INSERT INTO users (id, email, display_name, is_admin, is_verified, age_verified, status, city, state)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@flirtigo.in',
  'Admin',
  true,
  true,
  true,
  'active',
  'Mumbai',
  'Maharashtra'
) ON CONFLICT DO NOTHING;

INSERT INTO profiles (user_id) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') ON CONFLICT DO NOTHING;
INSERT INTO subscriptions (user_id, plan, status) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'premium_yearly', 'active') ON CONFLICT DO NOTHING;

-- Test users
DO $$
DECLARE
  test_users TEXT[] := ARRAY[
    'Aarav:Mumbai:Maharashtra',
    'Priya:Bengaluru:Karnataka',
    'Rohan:Delhi:Delhi',
    'Ananya:Hyderabad:Telangana',
    'Vikram:Chennai:Tamil Nadu',
    'Diya:Pune:Maharashtra',
    'Arjun:Kolkata:West Bengal',
    'Kavya:Ahmedabad:Gujarat'
  ];
  user_data TEXT;
  user_name TEXT;
  user_city TEXT;
  user_state TEXT;
  user_id UUID;
BEGIN
  FOREACH user_data IN ARRAY test_users
  LOOP
    user_name := split_part(user_data, ':', 1);
    user_city := split_part(user_data, ':', 2);
    user_state := split_part(user_data, ':', 3);
    user_id := gen_random_uuid();

    INSERT INTO users (id, phone, display_name, is_verified, age_verified, status, city, state)
    VALUES (user_id, '+91' || (9000000000 + (random() * 999999999)::int)::text, user_name, true, true, 'active', user_city, user_state)
    ON CONFLICT DO NOTHING;

    INSERT INTO profiles (user_id) VALUES (user_id) ON CONFLICT DO NOTHING;
    INSERT INTO subscriptions (user_id, plan, status) VALUES (user_id, 'free', 'active') ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
