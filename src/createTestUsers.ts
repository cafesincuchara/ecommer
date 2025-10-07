// src/createTestUsers.ts
import { supabase } from './integrations/supabase/client';

async function createTestUsers() {
  const users = [
    { email: 'alice@example.com', password: 'Test1234!', fullName: 'Alice' },
    { email: 'bob@example.com', password: 'Test1234!', fullName: 'Bob' },
    { email: 'carol@example.com', password: 'Test1234!', fullName: 'Carol' },
  ];

  for (const u of users) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
      options: { data: { full_name: u.fullName } },
    });

    if (error) console.error('Error creating user', u.email, error);
    else console.log('Created user', u.email, data);
  }
}

createTestUsers()
  .then(() => console.log('Finished creating test users'))
  .catch((err) => console.error('Unexpected error:', err));
