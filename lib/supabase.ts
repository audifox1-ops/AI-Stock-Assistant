import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 브라우저/빌드 시점에 URL 형식이 올바르지 않으면 에러가 나므로 더미 URL이라도 제공
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
