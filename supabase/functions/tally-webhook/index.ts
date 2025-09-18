import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await req.json();

    const getFieldValue = (key) => {
      const field = data.data.fields.find(f => f.key === key);
      if (field) {
        if (field.type === 'DROPDOWN' && field.options && field.value && field.value.length > 0) {
          const selectedOption = field.options.find(option => option.id === field.value[0]);
          return selectedOption ? selectedOption.text : null;
        }
        return field.value;
      }
      return null;
    };

    const userId = getFieldValue('question_Y4yE40_8d3c9718-e3fd-438e-8a42-5e0668bfc02c');
    
    if (!userId) {
      return new Response(JSON.stringify({ message: 'User ID is missing from Tally payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submissionData = {
      user_id: userId,
      project_title: getFieldValue('question_97aoaV'),
      service_type: getFieldValue('question_ABvMZk'),
      project_needs: getFieldValue('question_eapYpk'),
      project_category: getFieldValue('question_W8gjgv'),
      project_budget: getFieldValue('question_a2yayb'),
      client_name: getFieldValue('question_6ZN6oB'),
      client_email: getFieldValue('question_7Nx7GA'),
      client_whatsapp: getFieldValue('question_bWd1Po'),
      status: 'Baru',
      tally_submission_id: data.data.submissionId,
      submitted_at: new Date(data.createdAt).toISOString(),
    };

    const { error } = await supabase.from('tally_projects').insert([submissionData]);

    if (error) {
      console.error('Supabase insert error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Webhook received and processed successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Processing error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
