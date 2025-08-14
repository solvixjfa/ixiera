// Mengimpor fungsi createClient dari library Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Kredensial Supabase Anda
const supabaseUrl = 'https://xtarsaurwclktwhhryas.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI'

// Membuat dan mengekspor satu client Supabase yang akan digunakan di semua file lain.
export const supabase = createClient(supabaseUrl, supabaseKey)

