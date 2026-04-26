export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ativo: false, plano: null });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/assinantes?email=eq.${encodeURIComponent(email)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const dados = await response.json();

    if (!dados || dados.length === 0) {
      return res.status(200).json({ ativo: false, plano: null });
    }

    const assinante = dados[0];
    const status = assinante.status;
    const plano = assinante.plano;
    const acesso_ate = assinante.acesso_ate;

    // Verificar se está ativo
    if (status === 'ativo') {
      return res.status(200).json({ ativo: true, plano, status });
    }

    // Verificar se está atrasado mas ainda dentro dos 7 dias
    if (status === 'atrasado' && acesso_ate) {
      const agora = new Date();
      const limite = new Date(acesso_ate);
      if (agora < limite) {
        return res.status(200).json({ 
          ativo: true, 
          plano, 
          status: 'atrasado',
          acesso_ate,
          aviso: 'Sua assinatura está atrasada. Renove para não perder o acesso.'
        });
      }
    }

    // Suspenso ou atrasado além dos 7 dias
    return res.status(200).json({ ativo: false, plano, status });

  } catch (error) {
    return res.status(500).json({ ativo: false, error: error.message });
  }
}
