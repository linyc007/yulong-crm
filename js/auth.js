// js/auth.js

// TODO: Replace with your Supabase URL and Anon Key
const SUPABASE_URL = 'https://vczivjfnempbzqdmwelm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeml2amZuZW1wYnpxZG13ZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDU4NjEsImV4cCI6MjA5MjgyMTg2MX0.RhzPVAf_DoojfDOfdbuBuHfP97xL58bjsAjCIGXwjKo';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('请在 js/auth.js 中配置 SUPABASE_URL 和 SUPABASE_KEY 以启用 Supabase 鉴权功能。');
}

export const supabase = window.supabase ? window.supabase.createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder'
) : null;

export async function checkSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('获取会话失败:', error);
    return null;
  }
  return data.session;
}

export async function login(email, password) {
  if (!supabase) throw new Error('Supabase 未初始化');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}