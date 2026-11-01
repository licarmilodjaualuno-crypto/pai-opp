import { createClient } from '@supabase/supabase-js'

// A URL e a publishable key podem ficar no frontend. A segurança real fica nas regras RLS do Supabase.
const supabaseUrl = 'https://iqcqpgwduomokhagoicx.supabase.co'
const supabasePublishableKey = 'sb_publishable_VAMK3APzhEjml_iGRHV-nA_uBpHcS5a'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
